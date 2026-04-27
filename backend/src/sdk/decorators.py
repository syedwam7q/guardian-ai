"""@guardian.govern decorator for sync + async functions."""
from __future__ import annotations

import asyncio
import functools
import inspect
from collections.abc import Callable
from typing import Any

from src.sdk.client import Guardian


class _GuardianDecorator:
    """The ``guardian`` singleton — exposes ``.govern(...)`` decorator factory."""

    def govern(
        self,
        *,
        domain: str = "medical",
        agents: list[str] | None = None,
        mode: str = "embedded",
        backend_url: str = "http://localhost:8000",
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def deco(fn: Callable[..., Any]) -> Callable[..., Any]:
            client = Guardian(
                domain=domain,
                agents=agents,
                mode=mode,  # type: ignore[arg-type]
                backend_url=backend_url,
            )

            async def _run(*args: Any, **kwargs: Any) -> Any:
                user_input = kwargs.get("user_input") or (args[0] if args else "")
                if not isinstance(user_input, str):
                    raise TypeError(
                        "@guardian.govern: first positional arg or user_input "
                        "kwarg must be a string"
                    )
                with client.session() as session:
                    pre = await session.preflight(user_input)
                    if pre.blocked:
                        return pre.refusal_message
                    raw = await _maybe_await(fn(*args, **kwargs))
                    if not isinstance(raw, str):
                        # The user's function must return a string for governance to apply.
                        return raw
                    post = await session.postflight(raw, context=pre.context)
                    remediation = await session.remediate(raw, post.violations)
                    return remediation.text

            if inspect.iscoroutinefunction(fn):

                @functools.wraps(fn)
                async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                    return await _run(*args, **kwargs)

                return async_wrapper

            @functools.wraps(fn)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                # NOTE: ``asyncio.run`` requires no running event loop. If this
                # decorator is invoked from inside an async context, wrap the
                # function as ``async def`` instead so ``async_wrapper`` is used.
                return asyncio.run(_run(*args, **kwargs))

            return sync_wrapper

        return deco


async def _maybe_await(value: Any) -> Any:
    """If ``value`` is awaitable, await it; otherwise return as-is."""
    if inspect.isawaitable(value):
        return await value
    return value


guardian = _GuardianDecorator()
