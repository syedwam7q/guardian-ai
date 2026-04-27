# GuardianAI — Design Specification

**Project:** Causal Multi-Agent Runtime Governance for LLM Applications  
**Spec date:** 2026-04-27  
**Author:** Final-year major project, brainstormed end-to-end  
**Status:** Approved (Sections 1–5)  
**Project root:** `/Users/staen/Works/Major Project/ai-governance/`

---

## 1. Executive summary

GuardianAI is a self-healing governance plane that sits between an LLM application (chatbot, RAG system, or agent) and its end users. It autonomously **monitors → diagnoses → decides → acts → learns** across five risk dimensions: hallucination, bias, prompt injection, PII leakage, and cost. Its novel contribution is a **counterfactual causal diagnosis engine** that, when a violation fires, attributes root cause to specific stages of the LLM pipeline (retrieval, prompt construction, model choice, sampling parameters) using DoWhy-driven counterfactual interventions, then maps each ranked cause to a targeted remediation.

The deliverable is threefold: (a) a **built-in MedRAG demo** (medical Q&A chatbot governed end-to-end), (b) a **Python SDK** for governing existing LLM apps, and (c) an **OpenAI-compatible HTTP proxy** for zero-code-change adoption. The research output is a paper targeting NeurIPS Workshop on Safe & Trustworthy ML (or AIES / IEEE Access as fallback) on causal root-cause attribution for runtime LLM governance.

---

## 2. Why this pivot

The current project ("Self-Healing Autonomous ML Governance System") is a partially-implemented prototype claiming seven autonomous agents for ML pipeline governance. Reconnaissance findings:

- **Strong foundations:** causal inference layer (DoWhy + custom DAG, ~612 LOC), LLM advisor with Groq integration (~318 LOC), vector decision memory (ChromaDB + SentenceTransformers, ~272 LOC), modular FastAPI + React stack.
- **Significant gaps:** tests don't currently run; execution agent silently mocks retraining; Q-learning RL never trained; agent "negotiation" is utility summation; no real ML models persisted; ~50% of 24 markdown files are aspirational or redundant.
- **Crowded research space:** ML pipeline governance is well-served by MLflow, Arize, Weights & Biases, Datadog. Differentiating a paper here requires beating commercial baselines on real datasets — high bar for an undergrad first paper.

**LLM application governance**, in contrast, is where the field is hungry in 2026. Public benchmarks exist (HaluEval, RAGTruth, BBQ, AdvBench), industry adoption is nascent, and counterfactual causal RCA for LLM apps is unexplored in the literature. Approximately 60% of existing code transfers cleanly to the new framing.

**Title compatibility:** the registered college title ("Self-Healing Autonomous ML Governance" or similar within "AI governance / ML safety / autonomous systems") flexes naturally to "Self-Healing Autonomous Governance for LLM Applications."

---

## 3. Architecture

### 3.1 Core architectural decision: 3-stage interception pipeline

The previous project's structural problem was diffuse responsibility across seven agents. The new architecture imposes a strict three-stage pipeline — every component has exactly one place it belongs:

```
┌──────────────────────────────────────────────────────────────────┐
│  Demo App: MedRAG Chat (React)                                   │
└──────────────────────────────────────────────────────────────────┘
                              ↕ governed call
╔══════════════════════════════════════════════════════════════════╗
║         GuardianAI Governance Plane (the product)                ║
║                                                                   ║
║  PRE-FLIGHT  (sync, blocking, ≤80ms)                             ║
║    Prompt Injection · PII-In · Policy                             ║
║                                                                   ║
║  IN-FLIGHT  (sync, observation only)                              ║
║    Retrieval Observer · Prompt Construction Observer              ║
║                                                                   ║
║  POST-FLIGHT  (async-parallel with stream, ≤300ms)               ║
║    Hallucination · Bias/Toxicity · PII-Out · Cost/Performance     ║
║                                                                   ║
║  CAUSAL DIAGNOSIS ENGINE  ★ research kernel ★                    ║
║    DAG construction · DoWhy counterfactual interventions          ║
║    Ranked root causes with confidence intervals                   ║
║                                                                   ║
║  DECISION & REMEDIATION ENGINE                                    ║
║    Constraint-based action selection                              ║
║    Actions: BLOCK | REWRITE | REDACT | FALLBACK_MODEL |          ║
║             REGENERATE_WITH_CONTEXT | ADD_DISCLAIMER | ALERT |LOG║
║                                                                   ║
║  DECISION MEMORY  (vector RAG over past violations)               ║
╚══════════════════════════════════════════════════════════════════╝
                              ↕
┌──────────────────────────────────────────────────────────────────┐
│  LLM Stack: Groq Llama-3.3-70B (primary) + Claude Haiku (fallback)│
│  Embedder: BGE-large-en · Vector DB: ChromaDB                    │
│  Corpus: PubMed abstracts + WHO/India MoH guidelines + DrugBank  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Architectural principles

1. **Pre-flight blocks before tokens are spent.** Synchronous, hard-budgeted at 80ms.
2. **In-flight is pure observation.** Captures structured trace; never decides.
3. **Post-flight runs in parallel with response streaming.** User sees output immediately; remediation can interrupt or follow.
4. **Causal Diagnosis is the only novel research claim.** All other components are solid engineering, not novel.
5. **Decision Memory is the real learning loop.** No fake Q-learning. RAG over past violation→remediation→outcome triples.

### 3.3 Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Pydantic 2 |
| LLM (primary) | Groq Llama-3.3-70B Versatile |
| LLM (fallback) | Anthropic Claude Haiku |
| Embeddings | BGE-large-en or sentence-transformers all-mpnet-base-v2 |
| Vector store | ChromaDB (corpus + decision memory) |
| Causal | DoWhy + NetworkX (existing code, retargeted) |
| Trace storage | DuckDB |
| Metrics | Prometheus + prometheus-fastapi-instrumentator |
| Eval tracking | MLflow |
| Frontend | React 18 + TypeScript + Vite |
| UI primitives | shadcn/ui + Radix |
| Styling | TailwindCSS + custom design tokens |
| Animation | Framer Motion |
| 2D graph | React Flow |
| 3D graph | React Three Fiber + Drei |
| Streaming | Server-Sent Events |
| State | React Query + Zustand |

---

## 4. Backend components

### 4.1 Pre-flight agents (sync, blocking, ≤80ms total)

| Agent | Detection method | Public benchmark | Actions |
|---|---|---|---|
| **Prompt Injection** | Hybrid: rule patterns + Llama-Guard-3-1B (CPU) + Lakera-style detector ensemble | AdvBench, Garak, Lakera Gandalf | `BLOCK` (high-conf) / `ALERT+PROCEED` (low-conf) |
| **PII-In** | Microsoft Presidio + India-specific recognizers (Aadhaar, PAN) | Presidio test set + custom Indian-PII | `REDACT` / `BLOCK` (strict mode) |
| **Policy** | Declarative YAML rule engine, hot-reloadable | Custom 500-case medical-policy set (hand-labeled) | Inject disclaimers / `BLOCK` |

### 4.2 In-flight observers (sync, no decisions)

- **Retrieval Observer:** captures `(query_embedding, retrieved_doc_ids, retrieval_scores, retrieval_latency_ms)`
- **Prompt Construction Observer:** captures `(template_id, template_variables, final_prompt_tokens, system_prompt_hash, model_params)`

Trace is the immutable input to the Causal Diagnosis Engine. One trace record per query, persisted to DuckDB.

### 4.3 Post-flight agents (async-parallel with stream, ≤300ms post-stream for hard violations)

| Agent | Detection method | Public benchmark | Actions |
|---|---|---|---|
| **Hallucination** | Three-signal ensemble: (a) RoBERTa-large-MNLI entailment vs. retrieval; (b) self-consistency at varied temperature; (c) Groq Llama-3.3-70B LLM-judge with structured factuality prompt | HaluEval, FActScore, RAGTruth, custom PubMedQA test set | `REGENERATE_WITH_CONTEXT` / `REWRITE` / `ALERT` / `LOG` |
| **Bias & Toxicity** | Detoxify model + custom medical fairness probes (counterfactual same-symptoms-different-demographic) | BBQ, Detoxify benchmarks, custom medical fairness probes from MedHELM | `REWRITE` / `ALERT` / `LOG` |
| **PII-Out** | Presidio + retrieved-context cross-check (output entities not in retrieved context flagged) | Presidio test set + leakage probes | `REDACT` / `ALERT` / `LOG` |
| **Cost & Performance** | Real-time token accumulator + DuckDB historical context | Synthetic load test | `FALLBACK_MODEL` / `THROTTLE` / `ALERT` |

### 4.4 Causal Diagnosis Engine (the research kernel)

**Trigger:** any post-flight violation OR user-clicks "Diagnose" in UI.

**Pipeline:**

1. **Build causal DAG** for the trace. Structure partly fixed (pipeline shape) and partly inferred (which retrieval docs causally influenced which output spans, via attention-proxy + token-ablation).
2. **Identify candidate causes** for the violation type.
3. **Run counterfactual interventions** via DoWhy:
   - Retrieval: vary top-k, vary retrieval algorithm
   - Prompt: vary template, vary system prompt
   - Model: swap model identity (Llama-3.3 ↔ Claude-Haiku ↔ GPT-4o)
   - Sampling: vary temperature, top-p
   For each: re-execute the LLM call under intervention, re-score the violation, compute causal effect P(violation | do(X=x)) − P(violation | do(X=x')).
4. **Rank root causes** by effect magnitude with 95% CIs.
5. **Map to remediation:** each ranked cause has a canonical fix; Decision Engine receives the ranked list.

**Why publishable:**
- No published paper applies counterfactual causal inference to LLM-application runtime governance. (Closest: causal abstraction in mechanistic interpretability — offline, model-internal, not for production governance.)
- Produces a novel quantitative metric: per-pipeline-stage attribution percentages on standard benchmarks.
- Evaluable: on RAGTruth/HaluEval, attribution can be verified against human-expert labels.

**Reuse:** ~80% of existing `backend/src/telemetry/causal_graph.py` + `causal_analyzer.py`. Mainly retargets DAG schema to the LLM pipeline.

### 4.5 Decision & Remediation Engine

- **Input:** `(violation, ranked_causes, similar_past_decisions)`
- **Logic:** constraint-based selection. Hard constraints (regulatory rules, must-block lists) eliminate options; soft constraints (cost, latency, user preference) score remaining options; pick highest-scoring.
- **No RL, no fake game theory.** Honest, explainable selection.
- **Action set:** `BLOCK | REWRITE | REDACT | FALLBACK_MODEL | REGENERATE_WITH_CONTEXT | ADD_DISCLAIMER | ALERT | LOG`
- **Output:** `Decision(action, rationale, alternatives_considered, expected_outcome, confidence)`.

### 4.6 Decision Memory

- On every new violation: embed `(query + violation_type)`, retrieve top-k similar past cases with their decisions and measured outcomes.
- Decision Engine uses retrieved cases as additional context.
- This is the real learning loop — replaces never-trained Q-learning.
- **Reuse:** ~95% of existing `backend/src/memory/vector_store.py`.

---

## 5. Data flow + deployment modes

### 5.1 Canonical query data flow

```
1. INGEST  (≤5ms)  — generate trace_id, capture metadata
2. PRE-FLIGHT  (≤80ms)  — Injection, PII-In, Policy parallel; aggregate verdicts
3. IN-FLIGHT  — embed query, ChromaDB retrieval, prompt build, Groq stream
4. POST-FLIGHT  (parallel with stream, ≤300ms post-stream)  — Hallucination, Bias, PII-Out, Cost
5. CAUSAL DIAGNOSIS  (≤2s, async, on violation only)
6. DECISION  (≤50ms)  — query memory, apply constraints, pick action
7. REMEDIATE  — execute action; emit final response or correction notice
8. PERSIST  (async fire-and-forget)  — DuckDB trace, ChromaDB memory, Prometheus metrics
```

**User-perceived overhead:** ≤100ms vs. raw LLM call on clean path; ≤500ms on blocking-class violations after stream completes.

### 5.2 Three deployment modes (one core engine)

All three call the same core governance plane (`backend/src/guardian/`); they differ only in ingestion surface.

#### Mode 1: Built-in MedRAG demo (priority, weeks 5–7)
Single FastAPI app + React UI + ChromaDB + Groq + DuckDB. Reference application; what reviewers see.

- **Corpus:** ~50K PubMed abstracts (MedHELM-aligned topics) + WHO/India MoH treatment guidelines + DrugBank-Lite. All public/redistributable.
- **API:** `POST /api/medrag/chat` (streaming), `GET /api/medrag/sessions`, `POST /api/medrag/feedback`.

#### Mode 2: Python SDK (weeks 7–8)

```python
# Decorator pattern (zero-config)
from guardianai import guardian

@guardian.govern(domain="medical")
def diagnose_query(user_input: str) -> str:
    return openai.chat.completions.create(...).choices[0].message.content


# Context-manager pattern (full control)
from guardianai import Guardian

g = Guardian(domain="medical", agents=["hallucination", "pii", "bias"])

with g.session(user_id="u123") as session:
    pre = session.preflight(user_input)
    if pre.blocked:
        return pre.refusal_message
    raw = my_llm_pipeline(pre.sanitized_input)
    post = session.postflight(raw, context=pre.context)
    return session.remediate(raw, post.violations).text
```

- **Backends:** embedded (in-process for pre-flight), remote (call backend governance API for heavy lifting).
- **Distribution:** TestPyPI.

#### Mode 3: HTTP Proxy (weeks 8–9)

OpenAI-compatible API surface. Drop-in: change `base_url` from `https://api.openai.com/v1` → `http://guardian.local:8001/v1`. Zero code change otherwise.

- Implements OpenAI Chat Completions + streaming SSE
- Supports multi-provider routing (OpenAI, Anthropic, Groq) per route
- Adds non-breaking custom headers: `X-Guardian-Trace-Id`, `X-Guardian-Violations`, `X-Guardian-Causal-Diagnosis`, `X-Guardian-Action`

### 5.3 Storage layout

| Store | Data | Retention | Access |
|---|---|---|---|
| DuckDB | Traces, governance events, decisions | 90 days rolling | Append-heavy writes, time-windowed reads |
| ChromaDB (corpus) | Medical-knowledge embeddings | Static, versioned | Read-only retrieval |
| ChromaDB (memory) | Past violation→decision→outcome triples | 1 year rolling | Top-k similarity per query |
| Prometheus | Live metrics | 30 days | Time-series scrape |
| MLflow | Eval runs | Indefinite | Run-keyed artifact + metric storage |

---

## 6. Frontend / UI/UX design

### 6.1 Design philosophy

Technical sophistication over playfulness. Vibes: Linear × Vercel Observability × Stripe Sigma × academic-paper figures. Dark-first. Restraint over flash. Causal-graph motif as visual identity.

### 6.2 Visual identity

- **Logo:** directed causal-graph fragment forming a stylized "G."
- **Wordmark:** `GuardianAI` in IBM Plex Sans Semibold + Mono "AI" subscript.
- **Typefaces:** IBM Plex Sans (UI), IBM Plex Mono (technical), Instrument Serif (display only).

### 6.3 Color tokens (dark base)

```
--bg-deep        #0A0E1A
--bg-surface     #121828
--bg-elevated    #1A2238
--border-subtle  #1F2A44
--border-strong  #2D3B5E
--text-primary   #E8EDF7
--text-secondary #97A3BD
--text-tertiary  #5A6783

--signal-safe    #4ADE80   (agent passed)
--signal-watch   #FBBF24   (low-confidence flag)
--signal-block   #F87171   (violation, block)
--signal-causal  #A78BFA   (causal/diagnostic)
--signal-info    #60A5FA   (in-flight, neutral)
```

Light mode: derived, accessible (WCAG AA), not an afterthought.

### 6.4 Motion principles

- 200ms cubic-bezier(0.32, 0.72, 0, 1) for state changes.
- Spring (stiffness 260, damping 20) for interactive elements.
- No animation for static content; no gratuity.

### 6.5 The 8 pages

1. **Landing / Hero (`/`)** — public marketing surface; hero with rotating value-prop text; always-on animated demo (4 cycling scenarios); architecture diagram (interactive); 3 use-case cards; install snippets.
2. **MedRAG Chat (`/chat`)** — primary product surface; split-pane (60% chat, 40% live governance trace); inline span annotations (green/amber/red underlines); clickable PubMed citations; live trace updates as response streams; `Diagnose` button opens Causal Explorer pre-loaded.
3. **Governance Console (`/console`)** — Stripe-events-style live event feed; top ticker with sparklines; filterable side panel; SSE-driven real-time updates with subtle pulse.
4. **Causal Explorer (`/causal`)** — research showpiece. 2D React Flow DAG (default) and 3D React Three Fiber DAG (toggle). Edges weighted by causal effect. Counterfactual playground with sliders for top-k, temperature, model — drag → live re-runs → DAG re-colors. Export PNG / JSON.
5. **Decision Replay (`/replay`)** — time-travel scrubber across 24h/7d/30d; decision detail card; A/B compare slider for "what would alternative action have done."
6. **Evaluation Bench (`/eval`)** — paper-grade: benchmark scoreboards (GuardianAI vs. baselines on HaluEval, FActScore, RAGTruth, BBQ, AdvBench, MedHELM) with confidence intervals; ablation card (causal on vs. off); latency budget breakdown; one-click reproducibility re-run.
7. **Deployment / Settings (`/deploy`)** — three tabs (Built-in, SDK, Proxy) with copyable install snippets, config examples, live status; agent toggle matrix; severity threshold sliders; YAML policy editor.
8. **Audit & Compliance (`/audit`)** — auto-generated reports for EU AI Act / India DPDP / HIPAA / SOC 2 subset; one-click PDF export (reuses existing ReportLab code); compliance score dashboard.

### 6.6 The 6 "wow" moments

1. Live trace pulse on chat page (per-agent verdict appearing in real time).
2. Inline span annotations with hover-evidence tooltips.
3. Counterfactual sliders → live DAG re-coloring on Causal Explorer.
4. 3D causal graph mode (toggle).
5. Time-travel scrubber on Decision Replay.
6. Animated landing-page constellation (4 cycling demos showing real attacks getting caught).

### 6.7 Mobile / responsive

Out of scope for v1. Desktop-first (researcher / developer / clinician at workstation). Tablet readable; phone non-target but functional.

---

## 7. Evaluation + testing + paper strategy

### 7.1 Three evaluation categories

**A. Per-agent benchmarks (engineering quality)**

| Agent | Benchmark | Bar |
|---|---|---|
| Hallucination | HaluEval, RAGTruth, FActScore | F1 ≥ NeMo Guardrails |
| Bias & Toxicity | BBQ, Detoxify | F1 ≥ baseline |
| PII (in/out) | Presidio test + custom Indian-PII | F1 ≥ 0.92 entity-level |
| Prompt Injection | AdvBench, Lakera Gandalf, Garak | TPR @ FPR=5% ≥ Llama-Guard-3 |
| Cost & Performance | Synthetic load | latency p95 overhead ≤ 100ms |
| Policy | Custom 500-case medical-policy set | F1 ≥ 0.95 |

**B. End-to-end MedRAG (system quality)**

On 1,000-question test set from PubMedQA + MedHELM, compare bare-Llama-3.3-70B-RAG vs. GuardianAI-governed pipeline. Targets: 50%+ reduction in hallucination rate, 70%+ reduction in PII leak, <10% false-positive (over-block) rate, ≤100ms p50 overhead.

**C. Causal RCA (the research contribution)**

- **Ground-truth construction:** annotate ~500 hand-labeled causal-attribution cases on RAGTruth + custom medical hallucinations (weeks 7–9). Three annotation classes: retrieval-caused / prompt-caused / model-caused.
- **Baselines:** random attribution, attention-weight-only attribution, LLM-judge-prompted attribution.
- **Ours:** DoWhy counterfactual interventions.
- **Metric:** top-1 and top-3 attribution accuracy vs. expert labels.
- **Ablation:** turn off causal engine → does decision quality drop, and by how much?
- **Paper target:** ≥15% absolute improvement over LLM-judge baseline on top-1 attribution accuracy.

### 7.2 Testing

| Layer | Tooling | Cadence |
|---|---|---|
| Unit | pytest + hypothesis | per commit |
| Integration | pytest + FastAPI test client + LLM mocks | per commit |
| E2E (live LLM) | pytest, 20-case smoke set | pre-merge |
| Eval regression | MLflow custom runner, 50-case subset | pre-merge |
| Full eval | full benchmark suite | nightly + pre-paper |
| Frontend | Storybook + Playwright | pre-merge |
| Load | k6 at 10/100/1000 RPS | once before paper |

**Coverage bar:** ≥80% backend line coverage; every agent has ≥1 adversarial test.

### 7.3 Paper

**Working title:** "Counterfactual Causal Diagnosis for Runtime Governance of LLM Applications"

**Structure (workshop 8–10pp / conference 12–14pp):**
1. Introduction
2. Related Work (LLM safety, MLOps governance, causal inference)
3. System (Sections 3–5 of this design)
4. Causal Diagnosis Method ★
5. Experimental Setup
6. Results (per-agent, end-to-end, causal RCA accuracy, ablation, latency)
7. Case Studies (3–4 qualitative diagnosis walk-throughs)
8. Discussion (limitations, threats to validity, ethics)
9. Conclusion + Future Work

**Target venues (ranked):**
1. **NeurIPS Workshop on Safe & Trustworthy ML** — primary, deadline Sep 2026
2. ACM AIES — secondary
3. IEEE Access — open-access journal backup
4. ICSE 2027 Industry Track
5. ACM FAccT 2027 — stretch

### 7.4 Reproducibility

- MIT-licensed open-source on GitHub.
- Eval harness with pinned model versions, fixed seeds.
- Public benchmarks only.
- Hardware results on local M4 Pro + single A10 cloud comparison.
- Anonymized for double-blind submission.

---

## 8. Repository cleanup requirements

The current repository contains substantial clutter that signals "vibe-coded prototype" rather than "research artifact." Cleanup is a first-class workstream in the implementation plan, not a side task.

### 8.1 Files / directories to delete

- `backend/src/use_cases/` — replaced by MedRAG demo
- `backend/src/ml_pipeline/` — no longer training tabular ML models (preserve any utility helpers needed by Cost agent)
- `mlruns/493377988130992154/` — stale MLflow experiment from January
- `data/models/` — no persisted models in current scope
- `demo.py` — replaced by proper demo
- `verify_setup.py` — replaced by proper test infrastructure
- `.zencoder/`, `.zenflow/` — third-party tooling artifacts not needed
- `prometheus/` — empty stub directory; configure Prometheus via Docker compose instead
- All `.DS_Store` files (add to `.gitignore`)

### 8.2 Markdown files to delete

| File | Reason |
|---|---|
| `ROADMAP.md` | Aspirational; replaced by spec + plan |
| `docs/roadmap.md` | Duplicate of above |
| `COMPLETE_PRESENTATION_GUIDE.md` | 1700-line aspirational presentation deck |
| `PRESENTATION_ENHANCEMENTS.md` | Aspirational features |
| `new_changes.md` | Inflated retroactive changelog |
| `what_i_did.md` | Inflated progress tracker |
| `docs/BUGFIXES.md` | Lists no actual bugs |
| `docs/ENHANCEMENTS_2026.md` | Aspirational |
| `docs/ENHANCEMENT_SUMMARY_JAN2026.md` | Duplicate of above |
| `docs/IMPROVEMENTS_SUMMARY.md` | High-level vague |
| `docs/RECENT_UPDATES.md` | Vague |
| `docs/TROUBLESHOOTING.md` | Generic; no specifics |
| `docs/QUICK_REFERENCE.md` | Incomplete API reference |
| `docs/OBSERVATIONS_AND_DATA_COLLECTION.md` | Early brainstorm; not a spec |
| `docs/CHAT_ASSISTANT.md` | Documents removed feature |
| `docs/DEMO_GUIDE.md` | Replaced by new MedRAG demo guide |
| `docs/PROJECT_PRESENTATION.md` | Replaced by paper |
| `docs/PROJECT_SUMMARY.md` | Replaced by README |
| `docs/QUICKSTART.md` / `docs/GETTING_STARTED.md` | Consolidated into single new README |
| `docs/idea.md` | Source pivoted; archive in `/docs/archive/` for provenance |
| `backend/IMPLEMENTATION_SUMMARY.md` | Superseded |

### 8.3 Markdown files to keep / rewrite

- `README.md` — **rewrite from scratch** for GuardianAI. Concise, professional, with: one-paragraph overview, install for all 3 modes, 60-second demo, link to spec + paper.
- `ARCHITECTURE.md` — **rewrite** to match the new 3-stage architecture. Replace existing.
- `docs/superpowers/specs/2026-04-27-guardianai-design.md` — this file (source of truth).
- `docs/CONTRIBUTING.md` — **new**, lightweight.
- `docs/EVALUATION.md` — **new**, document benchmark methodology + reproducibility instructions.
- `docs/DEPLOYMENT.md` — **new**, install instructions for all three modes.
- `docs/archive/` — **new directory**; move historical docs here for provenance, but exclude from primary navigation.
- `.claude/proposed_claude.md` — **preserve as-is** per user request 2026-04-27. Brainstorm transcript; provenance value. Excluded from primary navigation but not deleted.

### 8.4 Code-level cleanup

- Fix broken pytest collection (asyncio_mode config + missing dependencies).
- Replace `datetime.utcnow()` everywhere — already done per `what_i_did.md`, verify.
- Remove all `# TODO` comments that are aspirational (vs. actionable).
- Remove dead Q-learning code paths.
- Remove "agent negotiation" stub.
- Remove all references to removed features (CHAT_ASSISTANT, ML pipelines).
- Add proper `pyproject.toml` with all deps + dev deps separated.
- Add `pre-commit` config (black, ruff, mypy, prettier for frontend).
- Add `LICENSE` file (MIT).
- Add `CITATION.cff` for the eventual paper.

### 8.5 Repository structure (target end state)

```
ai-governance/
├── README.md                       # rewritten, concise
├── LICENSE
├── CITATION.cff
├── pyproject.toml
├── docker-compose.yml              # all services for local dev
├── .pre-commit-config.yaml
├── .gitignore
│
├── backend/
│   ├── pyproject.toml
│   ├── src/
│   │   ├── guardian/               # NEW: core governance plane
│   │   │   ├── pipeline.py
│   │   │   ├── agents/
│   │   │   │   ├── injection.py
│   │   │   │   ├── pii_in.py
│   │   │   │   ├── policy.py
│   │   │   │   ├── hallucination.py
│   │   │   │   ├── bias.py
│   │   │   │   ├── pii_out.py
│   │   │   │   └── cost.py
│   │   │   ├── observers.py
│   │   │   ├── causal/             # repurposed from telemetry/
│   │   │   ├── decision.py
│   │   │   └── memory.py           # repurposed from memory/vector_store.py
│   │   ├── medrag/                 # NEW: MedRAG demo app
│   │   ├── sdk/                    # NEW: Python SDK
│   │   ├── proxy/                  # NEW: HTTP proxy
│   │   ├── api/                    # FastAPI routes
│   │   ├── eval/                   # NEW: evaluation harness
│   │   ├── reporting/              # PDF reports (kept)
│   │   ├── models/                 # Pydantic schemas
│   │   └── main.py
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
│
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── pages/                  # 8 pages (Section 6)
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── governance/         # domain-specific components
│   │   │   ├── causal/             # 2D + 3D graph
│   │   │   └── chat/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── styles/
│   └── tests/
│
├── data/
│   ├── corpus/                     # PubMed + WHO/MoH + DrugBank
│   ├── benchmarks/                 # cached benchmark fixtures
│   └── eval_artifacts/             # MLflow runs
│
├── docs/
│   ├── ARCHITECTURE.md             # rewritten
│   ├── EVALUATION.md               # new
│   ├── DEPLOYMENT.md               # new
│   ├── CONTRIBUTING.md             # new
│   ├── superpowers/specs/          # design specs
│   └── archive/                    # historical docs (provenance only)
│
└── paper/
    ├── manuscript.tex
    ├── figures/
    └── refs.bib
```

---

## 9. Build order (high-level)

| Phase | Weeks | Deliverable |
|---|---|---|
| 0. Cleanup + scaffolding | 1 | Delete clutter, fix pytest, set up new structure, archive history |
| 1. Core governance plane | 1–3 | Pre/in/post-flight pipeline, all 7 agents, decision engine, memory |
| 2. Causal engine ★ | 3–5 | DAG construction, DoWhy interventions, ranked-cause output |
| 3. Built-in MedRAG demo | 5–7 | Chat app, corpus ingestion, end-to-end |
| 4. Frontend (parallel) | 4–9 | 8 pages built to high polish |
| 5. Python SDK | 7–8 | Decorator + context manager, embedded + remote, TestPyPI |
| 6. HTTP Proxy | 8–9 | OpenAI-compat, streaming, multi-provider |
| 7. Evaluation harness | 9–10 | Reproducible benchmark runs, ablation |
| 8. Paper writing | 9–11 | Draft → revise → submit |
| 9. Polish & deploy | 11–12 | Docker compose, deploy guide, viva prep, demo recording |

The detailed plan with step-level milestones is produced in the next phase via `superpowers:writing-plans`.

---

## 10. Out-of-scope / non-goals

- Mobile / phone responsiveness (desktop-first).
- Multi-tenancy / SaaS hosting (local-first).
- Cloud deployment (single-machine demo + optional A10 eval).
- Training custom LLMs (we only govern existing ones).
- Active learning / human-in-the-loop annotation UIs (for v1; future work).
- Authentication, billing, audit-log encryption (post-v1; flagged in paper as future work).
- Languages other than English (and limited Hindi/regional terms in PII recognizers).
- Cross-model dependency management (cut from original scope; was claim-only).
- Meta-learning predictive governance (cut; was claim-only).
- Fake "agent negotiation" using Nash equilibrium (cut; replaced by honest constraint-based selection).

---

## 11. Decisions captured

- **Pivot direction:** "Self-Healing Autonomous ML Governance" → "Self-Healing Autonomous Governance for **LLM Applications**." Title spirit preserved.
- **Demo domain:** medical Q&A (MedRAG) — chosen for safety narrative, public benchmarks, and compliance angle.
- **Deployment modes:** all three in v1 (built-in MedRAG, Python SDK, HTTP Proxy).
- **Novel research claim:** *only* causal counterfactual diagnosis. Other components are solid engineering, not novel.
- **Frontend stack:** React + TypeScript + Tailwind + shadcn/ui + Framer Motion + React Flow + React Three Fiber. Dark-first.
- **3D causal graph:** built as a toggle (default off; default 2D mode).
- **Paper venue:** NeurIPS Workshop on Safe & Trustworthy ML (primary) + AIES / IEEE Access fallbacks.
- **Evaluation effort:** 500 hand-labeled causal-attribution cases by author in weeks 7–9 (acknowledged labor-heavy item).
- **Cleanup scope:** delete ~14 aspirational MD files, 5 dead directories, all stale code paths; rewrite README + ARCHITECTURE.

---

## 12. Open questions (deferred to writing-plans)

- Exact hand-labeling protocol for the 500-case causal-attribution annotation (single annotator vs. dual + IRR).
- Frontend deployment target (Vercel vs. self-hosted alongside backend).
- Whether to include a fourth agent dimension ("compliance" as a standalone agent vs. as Policy + Audit fold-in) — currently folded.
- Specific Indian-PII patterns to support (Aadhaar + PAN minimum; Voter ID, driving license — phased).
- Final color-token validation against WCAG AA contrast in light-mode derivation.
