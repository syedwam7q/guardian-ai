"""Guardian client — entry point for SDK users."""
from __future__ import annotations

from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from src.sdk.session import Session

Mode = Literal["embedded", "remote"]


class Guardian:
    """Top-level handle for governance. Pick `mode='embedded'` to run the
    pipeline in-process, or `mode='remote'` to call a running backend over HTTP.
    """

    def __init__(
        self,
        *,
        domain: str = "medical",
        agents: list[str] | None = None,
        mode: Mode = "embedded",
        backend_url: str = "http://localhost:8000",
        api_key: str | None = None,
        timeout_s: float = 30.0,
    ) -> None:
        self.domain = domain
        self.agents = agents
        self.mode: Mode = mode
        self.backend_url = backend_url.rstrip("/")
        self.api_key = api_key
        self.timeout_s = timeout_s

        # Lazy import to avoid pulling embedded deps in remote-only setups.
        if mode == "embedded":
            from src.sdk.embedded import EmbeddedBackend

            self._backend = EmbeddedBackend(self)
        elif mode == "remote":
            from src.sdk.remote import RemoteBackend

            self._backend = RemoteBackend(self)
        else:
            raise ValueError(f"Unknown mode: {mode!r}; must be 'embedded' or 'remote'")

    @property
    def backend(self):
        return self._backend

    def session(
        self, *, user_id: str = "anonymous", session_id: str | None = None
    ) -> Session:
        from src.sdk.session import Session

        return Session(client=self, user_id=user_id, session_id=session_id)

    async def aclose(self) -> None:
        """Close any open HTTP connections (remote mode)."""
        if hasattr(self._backend, "aclose"):
            await self._backend.aclose()
