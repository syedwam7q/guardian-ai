# Architecture

This is a high-level overview. The authoritative design is in `docs/superpowers/specs/2026-04-27-guardianai-design.md`.

## Three-stage interception pipeline

```
USER QUERY
   │
   ├─ PRE-FLIGHT  (sync, ≤80ms)        Prompt Injection · PII-In · Policy
   │
   ├─ IN-FLIGHT   (sync, observation)  Retrieval Observer · Prompt Observer
   │
   ├─ LLM call    (streamed)
   │
   ├─ POST-FLIGHT (async, ≤300ms)      Hallucination · Bias · PII-Out · Cost
   │
   ├─ CAUSAL      (async, on violation) DAG + DoWhy counterfactual interventions
   │
   ├─ DECISION    (sync, ≤50ms)        Constraint-based action selection
   │
   └─ REMEDIATE                        BLOCK / REWRITE / REGENERATE / REDACT / ...
```

## Components

| Path | Purpose |
|---|---|
| `backend/src/guardian/` | Core governance plane (agents + causal + decision + memory) |
| `backend/src/medrag/` | Built-in demo: medical RAG chatbot |
| `backend/src/sdk/` | Python SDK for governing existing LLM apps |
| `backend/src/proxy/` | OpenAI-compatible HTTP proxy |
| `backend/src/eval/` | Reproducible evaluation harness |
| `frontend/` | React UI (8 pages: landing, chat, console, causal explorer, replay, eval bench, deploy, audit) |

## Storage

| Store | Purpose |
|---|---|
| DuckDB | Traces, governance events, decisions |
| ChromaDB (corpus) | Medical knowledge embeddings |
| ChromaDB (memory) | Past violation→decision triples for RAG-augmented decisions |
| Prometheus | Live metrics |
| MLflow | Evaluation runs |
