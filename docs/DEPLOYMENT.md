# Deployment

GuardianAI ships three integration surfaces and four supported topologies.
Pick the surface that matches your existing stack — they share the same
governance pipeline (pre-flight, post-flight, causal diagnosis, decision
engine), they only differ in *how* your application talks to it. Then
pick the topology that matches your scale and ops budget.

| Surface | Best for | Code change | Port |
|---------|----------|-------------|------|
| Built-in HTTP API   | Greenfield apps; full control over the request shape  | New REST client | 8000 |
| Python SDK          | Python apps; in-process governance with low latency   | Add a decorator | n/a  |
| OpenAI-compatible proxy | Existing OpenAI/Anthropic/Groq clients; zero refactor | Change `base_url` | 8001 |

| Topology | Use it when | Section |
|----------|-------------|---------|
| Local dev | Iterating on the codebase or running tests | [§ A](#a-local-development) |
| Docker compose | Demoing the full stack on one machine; CI smoke tests | [§ B](#b-docker-compose) |
| Single-VM systemd | One mid-size box; simplest production posture | [§ C](#c-single-vm-systemd) |
| Cloud / multi-node | Higher scale; horizontal agent fan-out | future work; see notes in [§ D](#d-observability) and [§ F](#f-secrets-management) |

---

## A. Local development

For day-to-day iteration. The full setup procedure (Python venv,
`pip install -e`, spaCy model, frontend `npm ci`, etc.) lives in
[`SETUP.md`](../SETUP.md) at the repo root. Once that's done:

```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — proxy (optional, only needed for the OpenAI-compat path)
cd backend && source .venv/bin/activate
uvicorn src.proxy.app:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3 — frontend
cd frontend && npm run dev
```

Frontend is on http://localhost:3000 (Vite dev server) and proxies
`/api/*` to backend via Vite's `server.proxy` config. See SETUP.md
for environment variables, model warmup, and test running.

---

## B. Docker compose

The fastest path to running the full stack on any machine with Docker:

```bash
git clone https://github.com/syedwam7q/guardian-ai
cd guardian-ai
cp .env.example .env       # fill in any LLM keys you want live
docker compose up -d --build
```

That brings up four services:

| Container | Image | Host port | Purpose |
|-----------|-------|-----------|---------|
| `guardian-backend`    | local build (`Dockerfile.backend`)  | `8000` | Governance / MedRAG / Diagnose API |
| `guardian-proxy`      | local build (`Dockerfile.proxy`)    | `8001` | OpenAI-compatible HTTP proxy |
| `guardian-frontend`   | local build (`Dockerfile.frontend`) | `3000` | Vite SPA served by nginx; reverse-proxies `/api/*` and `/v1/*` |
| `guardian-prometheus` | `prom/prometheus:v2.55.0`           | `9090` | Metrics scrape + retention |

Verify:

```bash
curl -f http://localhost:8000/api/v1/health
curl -f http://localhost:8001/health
open http://localhost:3000
open http://localhost:9090
```

### Environment variables

Compose reads from the shell env or a `.env` file at the repo root.
All keys default to empty strings, so the stack boots without
credentials (LLM-judge agents return neutral verdicts, see
`backend/src/guardian/llm_judge.py`).

| Var | Service(s) | Default | Notes |
|-----|------------|---------|-------|
| `GROQ_API_KEY`      | backend, proxy | empty | Default LLM-judge upstream. |
| `ANTHROPIC_API_KEY` | backend, proxy | empty | Used when `model=claude-*`. |
| `OPENAI_API_KEY`    | proxy          | empty | Used when `model=gpt-*` / `o1-*`. |
| `HF_TOKEN`          | backend, proxy | empty | Lifts unauthenticated HF download rate limits. |
| `GUARDIAN_DOMAIN`   | backend        | `medical` | Default policy domain. |

### Volumes

| Volume / mount | Container path | Purpose |
|----------------|---------------|---------|
| `./data` (bind) | `/app/data`                  | Bundled corpus + benchmarks + persistent DuckDB + Chroma collections. **System of record.** |
| `hf-cache` (named) | `/root/.cache/huggingface` | Shared model cache between backend and proxy so each model only downloads once. |
| `prometheus-data` (named) | `/prometheus`        | Prometheus TSDB. 15-day retention by default. |

> **First boot is slow.** Backend / proxy lazily download
> ~1.5 GB of model weights (sentence-transformers, RoBERTa-large-MNLI,
> Detoxify) into `hf-cache` on the first agent invocation that needs
> them. Subsequent boots hit the cache.

### Rebuilding after a code change

```bash
docker compose build backend     # or proxy / frontend
docker compose up -d backend
```

### Tearing down

```bash
docker compose down              # stop + remove containers
docker compose down -v           # also drop the named volumes (HF cache, Prometheus)
```

---

## C. Single-VM systemd

For one mid-size box (4–8 vCPU, 16+ GB RAM). This is the simplest
production posture: native processes managed by systemd, with the
frontend served either by the same box's nginx or off a CDN. **CPU-only
deployment** — Phase 9 ships without a GPU profile because the project
runs end-to-end on commodity hardware.

### One-time setup

```bash
sudo useradd --system --home /srv/guardian --shell /bin/false guardian
sudo mkdir -p /srv/guardian /etc/guardian /var/lib/guardian /var/log/guardian
sudo chown -R guardian:guardian /srv/guardian /var/lib/guardian /var/log/guardian
sudo chmod 0750 /etc/guardian

# Pull repo, install deps
sudo -u guardian git clone https://github.com/syedwam7q/guardian-ai /srv/guardian/app
cd /srv/guardian/app/backend
sudo -u guardian python3.11 -m venv .venv
sudo -u guardian .venv/bin/pip install -e .
sudo -u guardian .venv/bin/python -m spacy download en_core_web_lg

# Secrets — locked down env file
sudo install -m 0600 -o root -g root /dev/null /etc/guardian/secrets.env
sudo "$EDITOR" /etc/guardian/secrets.env   # paste GROQ_API_KEY=, ANTHROPIC_API_KEY=, etc.
```

### Backend systemd unit

`/etc/systemd/system/guardian-backend.service`:

```ini
[Unit]
Description=GuardianAI backend (governance + medrag + diagnose)
After=network.target

[Service]
Type=simple
User=guardian
Group=guardian
WorkingDirectory=/srv/guardian/app/backend
EnvironmentFile=/etc/guardian/secrets.env
Environment=PATH=/srv/guardian/app/backend/.venv/bin
Environment=HF_HOME=/var/lib/guardian/hf-cache
Environment=SENTENCE_TRANSFORMERS_HOME=/var/lib/guardian/hf-cache
ExecStart=/srv/guardian/app/backend/.venv/bin/uvicorn \
    src.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=on-failure
RestartSec=5

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/guardian /srv/guardian/app/data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Proxy systemd unit

`/etc/systemd/system/guardian-proxy.service`:

```ini
[Unit]
Description=GuardianAI OpenAI-compatible proxy
After=network.target

[Service]
Type=simple
User=guardian
Group=guardian
WorkingDirectory=/srv/guardian/app/backend
EnvironmentFile=/etc/guardian/secrets.env
Environment=PATH=/srv/guardian/app/backend/.venv/bin
Environment=HF_HOME=/var/lib/guardian/hf-cache
Environment=SENTENCE_TRANSFORMERS_HOME=/var/lib/guardian/hf-cache
ExecStart=/srv/guardian/app/backend/.venv/bin/uvicorn \
    src.proxy.app:app --host 0.0.0.0 --port 8001 --workers 2
Restart=on-failure
RestartSec=5

NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/guardian
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Enable & start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now guardian-backend guardian-proxy
sudo systemctl status guardian-backend
journalctl -u guardian-backend -f
```

Front the services with nginx (or a managed load balancer). A minimal
nginx site that mirrors the docker-compose layout lives in
[`infra/nginx.conf`](../infra/nginx.conf) — adapt the upstream
hostnames from `backend:8000` / `proxy:8001` to `127.0.0.1:8000` /
`127.0.0.1:8001` for a single-box install.

---

## D. Observability

`prometheus_fastapi_instrumentator` is wired into both `src/main.py`
and `src/proxy/app.py`, so `/metrics` is live on `:8000` and `:8001`
out of the box.

### Where to look

| Surface | URL | What you'll see |
|---------|-----|-----------------|
| Backend metrics    | `http://localhost:8000/metrics` | Raw Prometheus exposition |
| Proxy metrics      | `http://localhost:8001/metrics` | Same shape, proxy-only counters |
| Prometheus UI      | `http://localhost:9090`        | Query interface; Status → Targets shows scrape health |
| Frontend dashboard | `http://localhost:3000/audit`  | Trace-level UI rolled up from DuckDB |

### Key metrics to watch

| Metric (PromQL) | Why it matters |
|-----------------|----------------|
| `rate(http_requests_total{job="guardian-backend"}[1m])` | Request rate. Sudden drops = upstream outage; sudden spikes = client retry storm. |
| `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="guardian-backend"}[5m])))` | p95 latency. Causal pipeline overhead lives here. Target < 100ms. |
| `rate(http_requests_total{job="guardian-backend",status=~"5.."}[5m])` | Error rate. Anything > 1% is a regression. |
| Custom: count of `decision.action="block"` over 5m | Block rate. Use the audit page or DuckDB `traces.db` for the canonical query. |
| Custom: agent failure / timeout counts | Each `BaseAgent` wraps execution in a timeout; failure counts surface as logs (`journalctl -u guardian-backend`). Build alerts off log volume. |

A starter `prometheus.yml` ships at [`infra/prometheus.yml`](../infra/prometheus.yml).
Plug it into Grafana for graphs; the metric set is standard
prometheus-fastapi shapes so any community FastAPI dashboard works.

---

## E. Data backup

The DuckDB file at `data/duckdb/traces.db` is the **system of record**
for governance traces. Treat it the way you would treat your application
database.

### Snapshot strategy

```bash
# /etc/cron.daily/guardian-backup (run by root, mode 0755)
#!/bin/bash
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
DEST=s3://my-bucket/guardian/backups
SRC=/srv/guardian/app/data/duckdb/traces.db

# DuckDB supports atomic file copy while the process is running because
# WAL is committed before the file is closed for new connections. For the
# safest snapshot, briefly stop the service or use the .bak path the
# next time a write completes:
cp --reflink=auto "$SRC" "/tmp/traces.${TS}.db"
zstd -19 -T0 "/tmp/traces.${TS}.db" -o "/tmp/traces.${TS}.db.zst"
aws s3 cp "/tmp/traces.${TS}.db.zst" "${DEST}/traces.${TS}.db.zst"
rm -f "/tmp/traces.${TS}.db" "/tmp/traces.${TS}.db.zst"
```

For higher safety, take the snapshot while the backend is briefly
stopped (`systemctl stop guardian-backend && cp …; systemctl start
guardian-backend`) — the API will be unavailable for ~5 seconds.

### What else to back up

| Path | Why | Frequency |
|------|-----|-----------|
| `data/duckdb/traces.db`     | Trace store. Source of truth for governance history. | Daily |
| `data/chroma/`              | Embedded corpus index. Re-buildable from `data/corpus/` but slow. | Weekly |
| `data/corpus/*.jsonl`       | Source corpus documents. Tracked in git but mirror separately for safety. | On change |
| `data/eval-results/`        | Eval harness JSON outputs (paper provenance). | On change |
| `/etc/guardian/secrets.env` | LLM keys. Back up to your secret manager, **not** to the same blob store as data. | On change |

Restore is a straight file copy back into `data/duckdb/`. The backend
detects an existing trace store on boot and continues writing to it.

---

## F. Secrets management

See [`SECURITY.md`](./SECURITY.md) for the full audit + policy.
Short version:

- Never commit a key. `.env` is gitignored and `.dockerignore` excludes
  it from the build context.
- Inject at process boot via environment variables.
- Production: store in HashiCorp Vault / AWS Secrets Manager / GCP
  Secret Manager / 1Password CLI / doppler / infisical. Mount as env
  vars at boot; do not bake into images or write to disk.
- Rotate every 90 days, or immediately on any suspected leak / team
  change.

### Which env vars are needed where

| Var | Backend | Proxy | Frontend | SDK (embedded) |
|-----|:-:|:-:|:-:|:-:|
| `GROQ_API_KEY`         | yes (LLM judge)         | yes (groq upstream)     | no  | yes |
| `ANTHROPIC_API_KEY`    | optional                | yes (anthropic upstream) | no  | optional |
| `OPENAI_API_KEY`       | no                      | yes (openai upstream)   | no  | no |
| `HF_TOKEN`             | optional (rate limits)  | optional                | no  | optional |
| `GUARDIAN_BACKEND_URL` | n/a                     | n/a                     | yes (`VITE_API_BASE`) | yes (remote backend mode) |

Phase 5 SDK [`backend/src/sdk/`](../backend/src/sdk/) reads
`GUARDIAN_BACKEND_URL` for remote mode. Phase 6 proxy uses the three
LLM keys to authenticate against upstreams; see
[`backend/src/proxy/upstream.py`](../backend/src/proxy/upstream.py).

---

## 1. Built-in HTTP API (port 8000)

The reference deployment. Boots `src/main.py` with FastAPI and exposes
the governance, MedRAG, and diagnose endpoints.

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

For Python apps that want governance without an extra network hop. The
SDK wraps any callable returning an LLM response and runs the same
pipeline in the calling process (or against a remote backend, your
choice).

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
that already use the OpenAI Python SDK, the `openai-compatible` flavour
of LangChain/LlamaIndex, or any other OpenAI-shape client only need to
change their `base_url`. Everything else — auth headers passed through,
streaming SSE, `model` parameter — keeps working.

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
print(getattr(resp, "guardian_trace_id", None))
```

### Streaming

`stream=True` works. Token chunks pass straight through unchanged so
your SDK's `iter_content()`/`async for chunk` loop behaves exactly as
before. After the upstream stream completes the proxy emits one extra
SSE event with the post-flight verdict summary, then the canonical
`[DONE]`:

```
event: guardian_postflight
data: {"trace_id": "8f3a...", "violations": [...], "action": "log"}

data: [DONE]
```

Most OpenAI clients ignore unknown events. If you want to surface the
verdicts in your UI, listen for `guardian_postflight` explicitly.

### What happens on a block

Pre-flight blocks (e.g. prompt injection, blocked policy categories)
never reach the upstream provider. The proxy synthesizes an
OpenAI-shaped response with `finish_reason: content_filter`:

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

---

## Deployment checklist

Run through this list before pointing real traffic at GuardianAI.

- [ ] **`/etc/guardian/secrets.env` populated** with `GROQ_API_KEY`,
      `ANTHROPIC_API_KEY` (if using Claude upstream), `OPENAI_API_KEY`
      (if using GPT upstream). File is `0600 root:root`.
- [ ] **`.env` is NOT in the image.** Verify with
      `docker history guardian-ai/backend:latest | grep -i env` —
      should be no `ENV` lines that include literal credentials.
- [ ] **Backend health check returns 200**:
      `curl -f http://localhost:8000/api/v1/health`.
- [ ] **Proxy health check returns 200**:
      `curl -f http://localhost:8001/health`.
- [ ] **Frontend serves**: `curl -f http://localhost:3000`.
- [ ] **Prometheus targets are up**: open `http://localhost:9090/targets`,
      every job is `UP`.
- [ ] **Smoke test through the proxy**: a real `POST /v1/chat/completions`
      to a benign prompt returns a 200 with `X-Guardian-Trace-Id` header.
- [ ] **Smoke test injection block**: a known-injection prompt (see
      `data/benchmarks/advbench_fixture.jsonl` for examples) returns
      `finish_reason: content_filter`.
- [ ] **DuckDB trace persistence**: after the smoke tests, the trace
      store has rows: `duckdb data/duckdb/traces.db -c "SELECT count(*) FROM traces;"`.
- [ ] **Backup cron is registered**: `ls /etc/cron.daily/guardian-backup`
      and the first run wrote to your S3 bucket.
- [ ] **systemd auto-restart works**: `sudo systemctl kill -s SIGKILL
      guardian-backend && sleep 8 && systemctl is-active guardian-backend`
      returns `active`.
- [ ] **Log retention configured**: `journalctl --vacuum-size=2G`
      policy is in place; logs aren't pinned to disk forever.
