# Deployment

GuardianAI exposes three integration surfaces. Pick the one that matches your
existing stack — they share the same governance pipeline (pre-flight,
post-flight, causal diagnosis, decision engine), they only differ in *how*
your application talks to it.

| Mode | Best for | Code change | Port |
|------|----------|-------------|------|
| Built-in HTTP API   | Greenfield apps; full control over the request shape  | New REST client | 8000 |
| Python SDK          | Python apps; in-process governance with low latency   | Add a decorator | n/a  |
| OpenAI-compatible proxy | Existing OpenAI/Anthropic/Groq clients; zero refactor | Change `base_url` | 8001 |

---

## 1. Built-in HTTP API (port 8000)

The reference deployment. Boots `src/main.py` with FastAPI and exposes the
governance, MedRAG, and diagnose endpoints.

```bash
cd backend
source .venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

POST a governance request:

```bash
curl -X POST http://localhost:8000/api/v1/governance/run \
  -H "Content-Type: application/json" \
  -d '{
    "user_input": "What is paracetamol used for?",
    "session_id": "demo",
    "domain": "medical"
  }'
```

The response carries `verdicts`, `violations`, `decision`, and a
`trace_id` you can resolve via `GET /api/v1/diagnose/{trace_id}`.

---

## 2. Python SDK (in-process)

For Python apps that want governance without an extra network hop. The SDK
wraps any callable returning an LLM response and runs the same pipeline in
the calling process (or against a remote backend, your choice).

```python
from guardian.sdk import govern, Session

@govern(domain="medical")
def answer(question: str) -> str:
    # your existing LLM call here
    return llm_client.complete(question)

result = answer("What is paracetamol used for?")
print(result.output)
print(result.violations)
print(result.trace_id)
```

For multi-turn flows where you want to see pre-flight separately from
post-flight, instantiate a `Session` directly. See the
[Phase 5 SDK quickstart](../backend/src/sdk/) for full examples.

---

## 3. OpenAI-compatible HTTP Proxy (port 8001)

The proxy speaks the OpenAI Chat Completions wire format. Existing apps
that already use the OpenAI Python SDK, the `openai-compatible` flavour of
LangChain/LlamaIndex, or any other OpenAI-shape client only need to change
their `base_url`. Everything else — auth headers passed through, streaming
SSE, `model` parameter — keeps working.

### Boot

```bash
cd backend
source .venv/bin/activate
uvicorn src.proxy.app:app --host 0.0.0.0 --port 8001
```

### Provider routing

`backend/src/proxy/providers.yaml` maps model-name globs to upstream
providers:

- `gpt-*`, `o1-*`  → OpenAI
- `claude-*`       → Anthropic
- `llama-*`, `mixtral-*` → Groq

The proxy uses `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GROQ_API_KEY`
from the environment to authenticate against the corresponding upstream.

### Curl example

```bash
curl -N http://localhost:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "What is paracetamol?"}],
    "stream": false
  }'
```

The response is the standard OpenAI shape, plus two extra fields:

```json
{
  "id": "chatcmpl-...",
  "choices": [...],
  "guardian_trace_id": "8f3a...",
  "guardian_violations": 0
}
```

…and four GuardianAI custom headers on every response:

| Header | Meaning |
|--------|---------|
| `X-Guardian-Trace-Id`     | UUID for the trace; pair with the diagnose endpoint |
| `X-Guardian-Violations`   | Count of post-flight violations (0 on a clean response) |
| `X-Guardian-Action`       | Decision-engine action (`block`, `rewrite`, `redact`, `log`, …) |
| `X-Guardian-Diagnose-Url` | Link to `GET /api/v1/diagnose/{trace_id}` for the causal report |

### Python OpenAI client snippet

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8001/v1",
    api_key="any-string-the-proxy-uses-the-real-key-from-env",
)

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is paracetamol?"}],
)
print(resp.choices[0].message.content)

# GuardianAI metadata is on the underlying HTTP response:
http_resp = resp.with_raw_response if hasattr(resp, "with_raw_response") else None
# ...or just read the custom fields off the parsed body:
print(getattr(resp, "guardian_trace_id", None))
```

### Streaming

`stream=True` works. Token chunks pass straight through unchanged so your
SDK's `iter_content()`/`async for chunk` loop behaves exactly as before.
After the upstream stream completes the proxy emits one extra SSE event
with the post-flight verdict summary, then the canonical `[DONE]`:

```
event: guardian_postflight
data: {"trace_id": "8f3a...", "violations": [...], "action": "log"}

data: [DONE]
```

Most OpenAI clients ignore unknown events. If you want to surface the
verdicts in your UI, listen for `guardian_postflight` explicitly.

### What happens on a block

Pre-flight blocks (e.g. prompt injection, blocked policy categories) never
reach the upstream provider. The proxy synthesizes an OpenAI-shaped
response with `finish_reason: content_filter`:

```json
{
  "id": "chatcmpl-...",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "I can't help with that request. (Blocked by GuardianAI pre-flight.)"
    },
    "finish_reason": "content_filter"
  }],
  "guardian_trace_id": "...",
  "guardian_violations": 1
}
```

HTTP status is `200` — OpenAI compatibility means content filtering is
*not* a 4xx error. Inspect `finish_reason` and the `X-Guardian-Action`
header (`block`) to detect refusals programmatically.
