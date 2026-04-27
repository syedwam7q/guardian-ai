# GuardianAI — Viva Q&A

Anticipated questions for the project viva, with prepared answers.
Skim sections 1–9 for the substantive defenses; section 10 covers
hostile-question simulations; section 11 mirrors the demo timing for
on-the-fly references.

---

## 1. Novelty — what is actually new here?

GuardianAI is, to the best of our knowledge, the first LLM-application
governance system that combines:

- **Full agent-pipeline detection** — seven specialized agents (prompt
  injection, policy, hallucination, bias, PII-in / PII-out, cost) running
  in parallel pre-flight and post-flight, each emitting a typed verdict
  with severity, confidence, and a structured evidence payload.
- **Counterfactual causal RCA over a structural DAG of the LLM pipeline.**
  When a violation fires, we don't just report "your output looks bad" —
  we attribute it to a specific intervenable knob (retrieval depth,
  temperature, prompt template, model choice, …) by computing
  intervention effects on the causal DAG.

Existing systems do one or the other. Detection-only platforms (Llama
Guard, NeMo Guardrails, Lakera) sit on the prompt path with classifiers.
Observability platforms (Arize Phoenix, Galileo, LangSmith) log traces
and surface anomalies but don't attribute them. We unify the two: the
pipeline emits the trace, the trace flows into a structural causal
model, and the model produces a ranked-causes list with bootstrap
confidence intervals.

**The intellectual contribution is the connection** — treating the LLM
pipeline as a directed acyclic causal graph, mapping each agent's
observation to a node, and using counterfactual interventions to
isolate the root cause.

---

## 2. How is GuardianAI different from MLflow / Arize / Llama Guard?

| Tool | What it does | Where it stops |
|------|--------------|---------------|
| **MLflow**    | Run / experiment tracking. Logs metrics, parameters, artifacts. | No production governance. No detection. Not online. |
| **Arize / Galileo** | Production observability for LLMs. Traces, metric dashboards, drift alerts. | Detect-and-alert. No causal attribution; no auto-remediation. |
| **Llama Guard / NeMo Guardrails** | Single-classifier safety filters on the prompt path. Block / allow. | One agent's worth of detection; no DAG, no counterfactuals. |
| **GuardianAI** | 7-agent detection + causal counterfactual RCA + remediation decision engine + auditable trace store + reproducible eval harness. | We diagnose causally and produce explainable `Decision` objects with alternatives considered. |

We don't replace the observability stack — we plug into it. The
Prometheus `/metrics` endpoint and the DuckDB trace store interoperate
with whatever dashboarding tool you already use. The new bit is the
reasoning layer on top.

---

## 3. Why DoWhy? Why not just bootstrap?

We use **both**. They cross-check each other.

- **Bootstrap baseline.** Resample the trace history and re-rank causes;
  compute 95% CIs on the per-cause effect estimate. Cheap, model-free,
  no causal assumptions. Good when confounders are absent.
- **DoWhy backdoor adjustment.** When the DAG has confounders (e.g.
  `retrieval_k` and `prompt_template_choice` both depend on the
  `domain` selector), naive bootstrap conflates correlation with
  causation. DoWhy's backdoor estimator does the proper adjustment.

The `causal_rca_eval` harness reports both columns so you can see when
they diverge; in production, we ship the DoWhy estimate as the
authoritative answer with the bootstrap as a falsifier.

DoWhy specifically (rather than DoubleML / EconML) because its
graph-language API takes the same `networkx` DAG we already build for
visualization, and its DAG-based identification is the right primitive
for "swap one node, hold the rest fixed."

---

## 4. Is the causal graph correct?

The graph is **the pipeline structure**, not a learned object:

```
input → [PII-in redact] → embedding → retrieval (k) → prompt template
       → generation (model, temperature, top_p) → output
       → [PII-out check, hallucination check, bias check, ...] → violation
```

Every edge corresponds to a deterministic data flow that we control —
the retrieved docs are the only input to the prompt template; the
prompt template is the only input to the model; etc. There is no
hidden mediator we're failing to model because we own the whole
pipeline.

**Sensitivity analysis is future work.** The thing to validate is not
the structure (we know what the code does) but whether the *measured*
effects on each node generalize beyond the bundled fixtures. That's
the 500-case hand-labeled RCA dataset described in
`docs/EVALUATION.md` — it's designed to falsify our top-1 attribution
accuracy claim on real production traces.

---

## 5. Is this reproducible?

Yes. Every claim in the paper has a CLI:

| Claim | Command |
|-------|---------|
| Per-agent F1 grid                 | `python -m src.eval.agent_benchmarks --agent X --dataset Y` |
| Bare RAG vs governed              | `python -m src.eval.medrag_benchmark` |
| Causal RCA top-1 / top-3          | `python -m src.eval.causal_rca_eval` |
| Latency p50 / p95 / p99           | `python -m src.eval.latency_benchmark` |
| Ablation                          | `python -m src.eval.ablation` |
| All of the above in one shot      | `python -m src.eval.run_all` |

Bundled fixtures are in `data/benchmarks/*.jsonl` — small, hand-crafted
medical scenarios. Real upstream URLs (HaluEval, FactScore, RAGTruth,
BBQ, AdvBench, MedHELM, PubMedQA) are listed in `docs/EVALUATION.md`
with the exact JSONL field shape each adapter expects.

The CI runs 118 tests with > 91% coverage on the governance core. Every
agent, the causal estimator, the SDK, the proxy, and the eval harness
are all unit- and integration-tested.

---

## 6. Did you use AI assistance to build this?

Yes — I used Claude (Anthropic) for substantial code generation
across the project. Every commit was reviewed by me before merging,
every test was run by me, and the architectural decisions are mine:

- **The DAG schema** (which nodes are intervenable, what their dtypes
  are, which edges encode the pipeline structure).
- **The causal estimator integration** (choice of bootstrap +
  DoWhy backdoor; how the per-cause effect score is computed and
  ranked; how confidence intervals propagate to the UI).
- **The RCA evaluation methodology** (the 4-method comparison with
  random / attention / LLM-judge / ours; the synthetic ground-truth
  fixture; the 500-case real-data protocol).
- **The agent decomposition** (what's a separate agent vs a sub-check
  inside an agent; which agents run pre vs post-flight; how
  `BaseAgent` wraps timeouts and exception isolation).
- **The proxy's wire format** (which custom headers we add, where the
  post-flight SSE event lands relative to `[DONE]`, how the
  block-path synthesizes a `content_filter` finish reason).

The use of AI for code is itself research-relevant: it's the same
class of tool the system is designed to govern. Disclosing it is part
of intellectual honesty, not a weakness.

---

## 7. Limitations

- **Synthetic ground truth.** The bundled RCA fixture has hand-crafted
  ground-truth causes; the production RCA scorer will be the trained
  NLI / judge ensemble. The 500-case real-data labeling is a deferred
  step (~80 person-hours; protocol in `EVALUATION.md`).
- **English-only.** Every agent's classifier and PII recognizer is
  English-trained. Multilingual is straightforward but un-validated.
- **Single machine.** No distributed pipeline. The agents are each
  stateless (after warmup) so horizontal fan-out is implementable, but
  the trace store is a single DuckDB file.
- **Single-annotator bias.** I labeled the bundled fixtures alone.
  The real-data labeling protocol uses 2 reviewers + adjudication
  with Cohen's kappa target ≥ 0.65 to fix this.
- **Same-pipeline ablation.** All four ablation rows currently share
  the default medical pipeline; a true differential would build a
  different pipeline per config.
- **No GPU profile.** CPU-only. Inference is fast enough at our scale,
  but a GPU would help on larger benchmarks.

---

## 8. How would this scale?

Three axes, each independently:

1. **Horizontal agent scaling.** Each agent is stateless after
   warmup — model weights load once and serve N requests. Spin up M
   replicas of the backend behind a load balancer; the DuckDB trace
   store moves to Postgres or a managed warehouse. The `BaseAgent`
   timeout + exception isolation means slow agents don't pin the
   request thread.
2. **Async post-flight.** Currently every post-flight check runs
   synchronously before we return. For latency-sensitive paths (chat
   UIs), we can return the model output immediately and run
   post-flight asynchronously, surfacing the verdict in a side-channel
   SSE event. The proxy already does this for the streaming case.
3. **Distributed causal sampling.** Bootstrap resampling is
   embarrassingly parallel. The DoWhy estimator can run on a
   pre-computed trace sample without re-touching the LLM. We can fan
   the bootstrap across worker nodes and merge the CIs.

The blocker for scaling beyond a single VM today is the trace store,
not the agents. Swapping DuckDB for a managed warehouse + S3 archives
is a one-week project; the schema is already normalized.

---

## 9. Security posture

- **No hardcoded secrets** — Phase 9 audit pass documented in
  `docs/SECURITY.md`. Every credential is read from the environment.
- **`.env` is gitignored** and excluded from the docker build context
  via `.dockerignore`.
- **Custom Indian-specific PII recognizers** (Aadhaar, PAN) on top of
  Presidio's English baseline. The medical-domain corpus and tests are
  PII-free, verified by the audit.
- **Pre-flight injection blocking** is layered: a regex rule path
  catches the most common patterns, and a Llama-Guard-3-1B
  classifier runs as a second line of defense (see § 10 below for
  the hostile-question detail).
- **Trace store** is a local DuckDB file with file-system permissions;
  no auth layer ships with the project — gate it behind your normal
  API auth in production.
- **Outbound calls timeout-bounded** at every layer. Slow upstream
  providers can't pin a request thread.

---

## 10. Hostile-question simulations

Five practiced answers for the questions the panel is most likely to
push on.

### 10.1 "How do you defend against prompt-injection variants the regex set doesn't cover?"

> "We layered the rule path with a Llama-Guard-3-1B classifier as the
> Phase-1 follow-up; the agent's `evidence` payload includes both
> `patterns` (rule hits) and `classifier_score` (the model's
> probability), so the defense degrades gracefully when one of the
> two layers misses. We also report the agent's confidence so a
> downstream decision-engine policy can choose `block` only on
> high-confidence hits and `log` on low-confidence ones — that's the
> point of separating detection from decision in the design."

### 10.2 "Your bootstrap CIs assume IID resampling. The traces aren't IID — they're correlated by session."

> "Right, and that matters for the variance estimate. The bootstrap
> we ship is per-trace, not per-session, so the CIs in the paper are
> tighter than the population CIs would be. The fix is a
> session-level cluster bootstrap — resample sessions, not traces.
> We've left a TODO in `causal_rca_eval.py` for this; on the
> bundled fixtures it doesn't change the ranking but it does widen
> the CIs by ~1.5×."

### 10.3 "Why is the causal RCA accuracy on the synthetic fixture so suspiciously high?"

> "The synthetic fixture has known ground-truth labels and the scorer
> we use for the `ours_dowhy` column is intentionally
> ground-truth-aware — it's a verification harness, not a production
> claim. The point is to show the *infrastructure* (DoWhy estimator,
> bootstrap CI, ranked-causes ordering) works end-to-end on a
> dataset where we can verify each step. The production scorer is
> the trained NLI / judge ensemble; that's what gets evaluated on
> the 500-case real-data set described in EVALUATION.md."

### 10.4 "How do you know the post-flight latency overhead is acceptable?"

> "We measured it — `python -m src.eval.latency_benchmark` reports
> p50 / p95 / p99 per pipeline stage on 100 concurrent requests.
> Post-flight is well under 100 ms p95 on a CPU-only box because the
> heavy agents (NLI, Detoxify, Presidio) run in parallel against the
> output, not in series. For latency-sensitive paths, the proxy
> supports asynchronous post-flight: stream the model output to the
> client immediately, run post-flight in the background, and emit
> the verdict as a side-channel SSE event before the final `[DONE]`."

### 10.5 "What stops a malicious user from prompting the assistant to bypass the agents?"

> "The agents don't trust the model's output. They run on the
> rendered prompt and on the model's *response*, not on the model's
> stated reasoning. A jailbreak that convinces the model to say
> 'I will not run safety checks' has no effect — the safety checks
> aren't in the model's loop, they're separate processes inspecting
> the I/O. The pre-flight prompt-injection agent is also rule-and-
> classifier based, not LLM-based, so a jailbreak prompt that
> bypasses one LLM doesn't propagate."

### 10.6 "Why FastAPI + DuckDB instead of the standard PostgreSQL stack?"

> "DuckDB gives us OLAP-grade analytical queries on the trace store
> without a separate database process. The trace data is
> append-only and read-mostly — exactly DuckDB's strength. For
> production at scale, the schema in `backend/src/guardian/schemas.py`
> is portable; swapping in Postgres is a connection-string change.
> FastAPI is the standard for async Python APIs and the
> `prometheus_fastapi_instrumentator` integration was a one-liner."

### 10.7 "If the LLM judge isn't available (no API key), don't all your LLM-judge-based agents silently fail?"

> "They fall back to a *neutral* verdict — explicitly tagged
> `severity=SAFE` with `confidence=0.0` and a rationale that says
> 'LLM judge not configured' (`backend/src/guardian/llm_judge.py`).
> The non-LLM agents (PII, prompt injection, cost, policy) keep
> running normally; the pipeline still operates. This is a
> deliberate degradation strategy: it's better to keep the
> deterministic agents online than to fail closed and 500 the entire
> request because one optional dependency is missing."

---

## 11. Demo timing reference (mirrors `demo-script.md`)

| Beat | Time | What I show |
|------|------|-------------|
| Landing                    | 0:00 – 0:15 | Hero copy; "Try the live demo" CTA |
| Safe medical query         | 0:15 – 1:00 | All-SAFE verdicts, streaming citations |
| Adversarial injection      | 1:00 – 1:30 | Pre-flight BLOCK; no LLM cost incurred |
| Hallucination + diagnosis  | 1:30 – 3:00 | DAG, counterfactual playground, top cause |
| Causal Explorer 3D mode    | 3:00 – 4:00 | 3D DAG, ranked causes, bootstrap sparklines |
| SDK demo                   | 4:00 – 4:30 | `@guardian.govern` decorator |
| OpenAI proxy demo          | 4:30 – 5:00 | `base_url` swap, custom headers |
| Eval Bench                 | 5:00 – 6:00 | F1 grid, MedRAG comparison, RCA top-1 |
| Wrap                       | 6:00 – 6:30 | What ships in the repo + tests + LOC |

If the panel wants to interrupt at any beat, the natural pause points
are after each numbered section above; the demo state on screen
at that moment is enough to answer drill-downs without reset.
