# GuardianAI

> **Causal Multi-Agent Runtime Governance for LLM Applications.**

GuardianAI is a self-healing governance plane that sits between an LLM application and its users. Seven autonomous agents detect violations across hallucination, bias, prompt injection, PII leakage, and cost dimensions. When a violation fires, a counterfactual causal diagnosis engine attributes the root cause to specific stages of the LLM pipeline (retrieval, prompt construction, model choice, sampling parameters) and selects an explainable remediation.

[![Phase 1](https://img.shields.io/badge/Phase%201-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-1-complete)
[![Phase 2](https://img.shields.io/badge/Phase%202-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-2-complete)
[![Phase 3](https://img.shields.io/badge/Phase%203-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-3-complete)
[![Phase 4](https://img.shields.io/badge/Phase%204-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-4-complete)
[![Phase 5](https://img.shields.io/badge/Phase%205-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-5-complete)
[![Phase 6](https://img.shields.io/badge/Phase%206-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-6-complete)
[![Phase 7](https://img.shields.io/badge/Phase%207-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-7-complete)
[![Phase 8](https://img.shields.io/badge/Phase%208-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-8-complete)
[![Phase 9](https://img.shields.io/badge/Phase%209-complete-brightgreen)](https://github.com/syedwam7q/guardian-ai/releases/tag/phase-9-complete)

---

## What's shipped

| Capability | Surface | Status |
|---|---|---|
| 7 governance agents (Prompt-Injection, PII-In, Policy, Hallucination, Bias, PII-Out, Cost) | Backend pipeline | ✅ |
| 3-stage governance pipeline (pre/in/post-flight) with `asyncio.to_thread` offloading + eager warmup | Backend | ✅ |
| Constraint-based Decision Engine with explainable alternatives | Backend | ✅ |
| Causal Diagnosis Engine — 11-node DAG, intervention abstraction, counterfactual executor, bootstrap CI + DoWhy estimators, ranked attribution | Backend | ✅ |
| MedRAG demo — corpus ingestion CLI + ChromaDB retrieval + Groq Llama streaming | Backend | ✅ |
| `/api/v1/govern` + `/api/medrag/chat` (SSE) + `/api/medrag/sessions` + `/api/medrag/feedback` | FastAPI | ✅ |
| 8-page React frontend (Landing, Chat, Console, Causal Explorer, Replay, Eval, Deploy, Audit) with WCAG 2.1 AA, route-level code splitting, dark/light themes | Frontend | ✅ |
| Python SDK — `@guardian.govern` decorator + `Session` context manager + embedded/remote backends | SDK | ✅ |
| OpenAI-compatible HTTP proxy with multi-provider routing + custom `X-Guardian-*` headers | Proxy | ✅ |
| Evaluation harness — 7 benchmark adapters + per-agent F1 + RCA accuracy + latency + ablation | Eval | ✅ |
| LaTeX paper draft (~4000 words, 39 BibTeX entries, 5 results tables) | Paper | ✅ |
| Docker compose stack + Prometheus + nginx + systemd units | Deploy | ✅ |
| Demo script + viva Q&A + security audit + 12-item launch checklist | Docs | ✅ |

**Tests:** 118/118 passing. Coverage: 91% on `guardian/`, 97% on `causal/`, 94% on `medrag/`, 91% on `sdk/`, 93% on `proxy/`, 83% on `eval/`. Frontend builds cleanly with the main bundle at 93 KB / 28 KB gzip after vendor splitting and route-level lazy loading.

---

## Three deployment surfaces

### 1. Built-in MedRAG demo

A fully-governed medical Q&A chatbot accessible at `http://localhost:3000` once the backend is running. Streams tokens from Groq Llama 3.3 70B, runs all 7 agents per request, surfaces the live governance trace.

```bash
docker compose up -d        # backend on :8000, proxy on :8001, frontend on :3000
```

### 2. Python SDK — drop in 3 lines

```python
from guardian import guardian       # SDK lives at backend/src/sdk/

@guardian.govern(domain="medical", mode="embedded")
async def my_app(query: str) -> str:
    return await openai_client.chat.completions.create(...)
```

Pre-flight blocks adversarial inputs. Post-flight verdicts run on every response. Switch `mode="remote"` to call the backend over HTTP.

### 3. OpenAI-compatible HTTP proxy

Change `base_url`, get governance for free.

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8001/v1",   # was https://api.openai.com/v1
    api_key="any-string-real-key-from-env",
)
```

Every response carries `X-Guardian-Trace-Id`, `X-Guardian-Violations`, `X-Guardian-Action`, `X-Guardian-Diagnose-Url` headers. Streaming preserved; post-flight summary in a side-channel SSE event before `[DONE]`.

---

## Quick start

```bash
git clone https://github.com/syedwam7q/guardian-ai.git
cd guardian-ai

# Option A: Docker (recommended)
docker compose up -d
open http://localhost:3000

# Option B: Native (faster iteration during dev)
cd backend && python3.11 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev,eval]"
python -m spacy download en_core_web_lg
uvicorn src.main:app --reload --port 8000 &

cd ../frontend && npm install && npm run dev
```

Full setup including pre-fetching ML models (~3 GB), env vars, troubleshooting: see [SETUP.md](./SETUP.md).

---

## Repo layout

```
guardian-ai/
├── backend/          # FastAPI app, agents, pipeline, SDK, proxy, eval harness
├── frontend/         # Vite + React 18 + TypeScript + Tailwind + shadcn/ui
├── data/
│   ├── corpus/       # MedRAG demo corpus + manifest
│   ├── benchmarks/   # 7 evaluation fixtures + RCA ground truth
│   └── eval-results/ # output of `python -m src.eval.run_all` (gitignored)
├── docs/
│   ├── DEPLOYMENT.md  # docker / systemd / observability / backup
│   ├── EVALUATION.md  # benchmark protocols, hardware reqs, FAQ
│   ├── SECURITY.md    # secrets policy, threat model, audit pass
│   ├── viva-qa.md     # anticipated questions + answers
│   └── superpowers/   # design spec + implementation plan
├── paper/            # LaTeX manuscript + bibliography + Makefile
├── infra/            # prometheus.yml, nginx.conf
├── Dockerfile.{backend,frontend,proxy}
├── docker-compose.yml
├── demo-script.md    # 5-7 minute walkthrough
├── SETUP.md          # full install + run guide
└── README.md         # this file
```

---

## Documentation map

- **[SETUP.md](./SETUP.md)** — full install, models, env vars, run, test, troubleshoot.
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Docker / single-VM / observability / backup / launch checklist.
- **[docs/EVALUATION.md](./docs/EVALUATION.md)** — reproduce paper numbers, real-data download, FAQ.
- **[docs/SECURITY.md](./docs/SECURITY.md)** — secrets management, threat model, audit pass.
- **[docs/viva-qa.md](./docs/viva-qa.md)** — viva preparation: anticipated questions + answers + hostile-question simulations.
- **[demo-script.md](./demo-script.md)** — timed walkthrough of the six wow moments.
- **[paper/manuscript.tex](./paper/manuscript.tex)** — workshop paper draft.
- **[docs/superpowers/specs/](./docs/superpowers/specs/)** — original design spec.
- **[docs/superpowers/plans/](./docs/superpowers/plans/)** — phase-by-phase implementation plan.

---

## Tech stack

**Backend:** Python 3.11 · FastAPI · Pydantic v2 · Uvicorn · DoWhy · NetworkX · Microsoft Presidio · spaCy `en_core_web_lg` · Detoxify · RoBERTa-large-MNLI · BAAI/bge-small-en-v1.5 · Groq SDK (Llama 3.3 70B) · Anthropic SDK · DuckDB · ChromaDB · sentence-transformers · respx · pytest-asyncio · Prometheus FastAPI Instrumentator.

**Frontend:** React 18 · TypeScript · Vite · TailwindCSS · shadcn/ui (hand-rolled) · Radix primitives · Framer Motion · TanStack Query · Zustand · React Router 6 · React Flow · React Three Fiber + drei + three.js · Recharts · sonner · cmdk · React Hook Form + zod.

**Infra:** Docker + Compose · nginx · Prometheus · systemd.

**Paper:** LaTeX + BibTeX + latexmk.

---

## License

MIT — see [LICENSE](./LICENSE).

## Citation

If you use GuardianAI in research, see [CITATION.cff](./CITATION.cff). The workshop paper draft is in [`paper/manuscript.tex`](./paper/manuscript.tex).
