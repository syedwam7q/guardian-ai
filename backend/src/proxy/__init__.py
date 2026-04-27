"""GuardianAI HTTP Proxy — OpenAI-compatible drop-in for /v1/chat/completions.

Adoption: change your client's base_url from
  https://api.openai.com/v1
to:
  http://localhost:8001/v1

That's it. Pre-flight blocks adversarial requests; post-flight verdicts
appear via SSE side-channel events (streaming) or response fields
(non-streaming). Custom headers carry the GuardianAI trace_id, violation
count, and action taken on every response.
"""
from src.proxy.app import app
from src.proxy.upstream import UpstreamConfig, UpstreamRouter

__all__ = ["UpstreamConfig", "UpstreamRouter", "app"]
__version__ = "0.1.0"
