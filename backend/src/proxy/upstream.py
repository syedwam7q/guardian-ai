"""Upstream provider abstraction for the proxy.

Routes a model name to the correct upstream API, normalizes auth, and
exposes a single async method per provider that takes the OpenAI-shape
request and returns an httpx response (or async-iterable of chunks for
streaming).
"""
from __future__ import annotations

import fnmatch
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import yaml

DEFAULT_PROVIDERS_YAML = Path(__file__).resolve().parent / "providers.yaml"


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    base_url: str
    auth_env: str
    api_format: str = "openai"  # "openai" or "anthropic_messages"


@dataclass(frozen=True)
class UpstreamConfig:
    providers: dict[str, ProviderConfig]
    routes: list[tuple[str, str]]  # (glob, provider_name)
    default_provider: str

    @classmethod
    def load(cls, path: str | Path = DEFAULT_PROVIDERS_YAML) -> UpstreamConfig:
        data = yaml.safe_load(Path(path).read_text())
        providers = {
            name: ProviderConfig(name=name, **cfg)
            for name, cfg in (data.get("providers") or {}).items()
        }
        routes = [
            (rule["pattern"], rule["provider"])
            for rule in (data.get("route_by_model") or [])
        ]
        return cls(
            providers=providers,
            routes=routes,
            default_provider=data.get("default_provider", "groq"),
        )

    def resolve(self, model: str) -> ProviderConfig:
        for pattern, provider_name in self.routes:
            if fnmatch.fnmatch(model, pattern):
                return self.providers[provider_name]
        return self.providers[self.default_provider]


class UpstreamRouter:
    """Routes a chat completion request to the correct upstream provider."""

    def __init__(self, config: UpstreamConfig | None = None) -> None:
        self.config = config or UpstreamConfig.load()
        self._client = httpx.AsyncClient(timeout=120.0)

    async def aclose(self) -> None:
        await self._client.aclose()

    def resolve(self, model: str) -> ProviderConfig:
        return self.config.resolve(model)

    def _build_headers(self, provider: ProviderConfig) -> dict[str, str]:
        api_key = os.environ.get(provider.auth_env, "")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        if provider.api_format == "anthropic_messages":
            # Anthropic auth differs from OpenAI's bearer.
            headers["anthropic-version"] = "2023-06-01"
            headers["x-api-key"] = api_key
            del headers["Authorization"]
        return headers

    def _build_url(self, provider: ProviderConfig) -> str:
        if provider.api_format == "anthropic_messages":
            # Anthropic has a different API shape — we'd convert here.
            # For Phase 6 baseline, we route claude-* models through the
            # Anthropic Messages API only when explicitly stubbed in tests;
            # production claude-* via the proxy needs a translator. Phase 7+.
            return f"{provider.base_url}/messages"
        return f"{provider.base_url}/chat/completions"

    async def chat_completion(
        self, *, payload: dict[str, Any], stream: bool = False,
    ) -> httpx.Response:
        provider = self.resolve(payload["model"])
        url = self._build_url(provider)
        headers = self._build_headers(provider)
        body = {**payload, "stream": stream}
        return await self._client.post(url, headers=headers, json=body)

    async def stream_chat_completion(
        self, *, payload: dict[str, Any],
    ) -> httpx.Response:
        """Open a streaming connection — caller must consume the response body."""
        provider = self.resolve(payload["model"])
        url = self._build_url(provider)
        headers = self._build_headers(provider)
        headers["Accept"] = "text/event-stream"
        body = {**payload, "stream": True}
        # Build the request via the client's send() so we get a streaming response.
        req = self._client.build_request("POST", url, headers=headers, json=body)
        return await self._client.send(req, stream=True)
