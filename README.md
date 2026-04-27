# GuardianAI

> **Causal Multi-Agent Runtime Governance for LLM Applications.**

GuardianAI is a self-healing governance plane that sits between an LLM application and its users. Seven autonomous agents detect violations across hallucination, bias, prompt injection, PII leakage, and cost dimensions. When a violation fires, a counterfactual causal diagnosis engine attributes the root cause to specific stages of the LLM pipeline (retrieval, prompt construction, model choice, sampling parameters) and selects a targeted remediation.

## Three deployment modes

- **Built-in MedRAG demo** — a fully governed medical Q&A chatbot.
- **Python SDK** — drop-in `@guardian.govern` decorator and `Session` context manager.
- **HTTP Proxy** — OpenAI-compatible endpoint, zero-code-change adoption.

## Status

Active development. See `docs/superpowers/plans/2026-04-27-guardianai-implementation.md` for the full roadmap. Currently: Phase 0 (scaffolding) complete.

## Quick start

```bash
# Backend
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev,eval]"
uvicorn src.main:app --reload  # arrives in Phase 1

# Frontend
cd frontend
npm install
npm run dev
```

## Documentation

- **Design spec:** `docs/superpowers/specs/2026-04-27-guardianai-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-04-27-guardianai-implementation.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Evaluation:** `docs/EVALUATION.md` (filled in Phase 7)
- **Deployment:** `docs/DEPLOYMENT.md` (filled in Phase 9)
- **Contributing:** `docs/CONTRIBUTING.md`

## Tech stack

Python 3.11 · FastAPI · Pydantic 2 · Groq Llama-3.3-70B · DoWhy · ChromaDB · DuckDB · Prometheus · MLflow · React 18 · TypeScript · Vite · TailwindCSS · shadcn/ui · Framer Motion · React Flow · React Three Fiber.

## License

MIT — see `LICENSE`.

## Citation

If you use GuardianAI in research, see `CITATION.cff`.
