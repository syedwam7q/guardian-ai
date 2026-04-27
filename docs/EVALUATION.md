# Evaluation Harness

GuardianAI ships a deterministic, in-repo evaluation harness covering
seven public benchmarks, an end-to-end MedRAG comparison, a causal-RCA
attribution study, a local latency benchmark, and a 4-config ablation.
The full upstream datasets (HaluEval, FactScore, RAGTruth, BBQ,
AdvBench, MedHELM, PubMedQA) are large and require offline downloads
— this document describes the bundled fixtures used by tests, the
download/format steps for the real datasets, and the deferred
500-case hand-labeled RCA collection protocol.

---

## What ships in-repo

* `backend/src/eval/schemas.py` — `EvalCase`, `EvalMetrics`.
* `backend/src/eval/datasets/{halueval,factscore,ragtruth,bbq,advbench,medhelm,pubmedqa}.py`
  — adapters that return iterables of `EvalCase`.
* `backend/src/eval/agent_benchmarks.py` — per-agent runner with CLI.
* `backend/src/eval/medrag_benchmark.py` — bare-RAG vs governed comparison.
* `backend/src/eval/causal_rca_eval.py` — 4-method attribution comparison.
* `backend/src/eval/latency_benchmark.py` — local concurrent latency probe.
* `backend/src/eval/ablation.py` — 4-config ablation row builder.
* `backend/src/eval/run_all.py` — one-command summary runner.
* `data/benchmarks/*.jsonl` — bundled 5-10-case medical fixtures.
* `data/benchmarks/causal_rca_fixture.jsonl` — 8-case synthetic RCA dataset.
* `backend/tests/eval/` — smoke tests covering harness mechanics.

The fixtures are deliberately small, hand-crafted to be medically
plausible (medication dosing, contraindications, pregnancy, antibiotics,
emergencies) and topically diverse. They are **not** a substitute for
the upstream benchmarks; they exist so tests are deterministic and run
without internet access.

---

## Bundled fixtures

| Benchmark   | Cases | Domain                                               |
|-------------|-------|------------------------------------------------------|
| HaluEval    | 10    | Medical hallucination QA                             |
| FactScore   | 8     | Atomic medical facts (supported / unsupported)       |
| RAGTruth    | 6     | RAG-style answers grounded in supplied passages      |
| BBQ         | 10    | Bias in medical QA across age, gender, race, SES     |
| AdvBench    | 8     | Prompt-injection attempts at a medical assistant     |
| MedHELM     | 6     | Clinical reasoning across specialties                |
| PubMedQA    | 6     | Yes/no biomedical research questions                 |
| Causal RCA  | 8     | Synthetic ground-truth attribution traces            |

---

## Running the benchmarks

All commands assume `cd backend && source .venv/bin/activate`.

### Per-agent benchmark (CLI)

```bash
python -m src.eval.agent_benchmarks --agent prompt_injection --dataset advbench
python -m src.eval.agent_benchmarks --agent policy           --dataset medhelm
python -m src.eval.agent_benchmarks --agent hallucination    --dataset halueval
python -m src.eval.agent_benchmarks --agent bias             --dataset bbq
python -m src.eval.agent_benchmarks --agent pii_in           --dataset halueval
```

Output: `<agent> x <dataset>: n=<N> precision=<P> recall=<R> f1=<F1>`.

Heavy agents (`hallucination`, `bias`, `pii_in`, `pii_out`) load
RoBERTa-large-MNLI / Detoxify / Presidio respectively on first call.

### End-to-end MedRAG

```bash
python -m src.eval.medrag_benchmark
```

Compares **bare RAG** (no governance) against **governed** (full
pipeline) on the bundled MedHELM fixture. Writes
`data/eval-results/medrag_<timestamp>.json`.

### Causal RCA

```bash
python -m src.eval.causal_rca_eval
```

Runs 4 methods on the synthetic RCA fixture:

* `random` — pure-noise scorer baseline.
* `attention` — fixed-prior baseline (stand-in for attention attribution).
* `llm_judge` — fixed-bias scorer (stand-in for LLM-judge attribution).
* `ours_dowhy` — GuardianAI's causal estimator with a ground-truth-aware
  scorer (used to verify the harness on the synthetic fixture; the real
  scorer is the trained NLI / judge ensemble in production).

Writes `data/eval-results/causal_rca.json` with `top1` / `top3` per method.

### Latency

```bash
python -m src.eval.latency_benchmark
```

Fires 100 concurrent requests at the default pipeline and reports
p50/p95/p99/mean per stage. Writes `data/eval-results/latency.json`.

### Ablation

```bash
python -m src.eval.ablation
```

Runs the medrag fixture under 4 configs (`no_governance`,
`governance_only`, `governance_plus_judge`, `full_guardian`). The
4-config scaffold ships with the same pipeline shared across
`governance_only`, `governance_plus_judge`, and `full_guardian` — real
ablation runs would build a different pipeline per config. Writes
`data/eval-results/ablation.json`.

### One-command run

```bash
python -m src.eval.run_all
```

Runs RCA + MedRAG + a 20-request latency probe and writes a single
`data/eval-results/full_eval_<timestamp>.json` summary.

---

## Downloading the real upstream datasets

The bundled fixtures are sufficient for tests. To run a real benchmark,
download the upstream dataset, parse it into the JSONL shape each
adapter expects (see the per-adapter `load_fixture()` body), and place
the file at `data/benchmarks/<name>_full.jsonl` (or override the
`FIXTURE_PATH` constant at the top of each adapter).

| Benchmark   | Upstream URL                                                                                  |
|-------------|-----------------------------------------------------------------------------------------------|
| HaluEval    | https://github.com/RUCAIBox/HaluEval                                                          |
| FactScore   | https://github.com/shmsw25/FActScore                                                          |
| RAGTruth    | https://github.com/ParticleMedia/RAGTruth                                                     |
| BBQ         | https://github.com/nyu-mll/BBQ                                                                |
| AdvBench    | https://github.com/llm-attacks/llm-attacks                                                    |
| MedHELM     | https://crfm.stanford.edu/helm/medhelm/                                                       |
| PubMedQA    | https://github.com/pubmedqa/pubmedqa                                                          |

Each `load_fixture()` documents the exact fields it reads. Downstream
licensing and citation requirements are the user's responsibility.

---

## 500-case hand-labeled RCA dataset (deferred)

The full causal-RCA evaluation in the original spec calls for 500
hand-labeled real-world traces with expert ground-truth attributions.
That collection is an offline step and is **not** part of this
deliverable. The protocol:

1. **Sample** ~1500 production traces from `data/eval-results/` (or the
   trace store) where the post-flight pipeline emitted at least one
   violation with `confidence >= 0.6`.
2. **Stratify** the sample so the four causal nodes
   (`temperature`, `top_p`, `model_choice`, `retrieval_k`) are roughly
   balanced.
3. **Annotate** each trace with one or more expert reviewers. Each
   reviewer assigns a single `ground_truth_cause` per trace from the
   set above. Use 2 independent reviewers and a third-reviewer
   adjudication when they disagree (Cohen's kappa target >= 0.65).
4. **Store** the labels as JSONL matching `data/benchmarks/causal_rca_fixture.jsonl`'s
   schema (`trace`, `ground_truth_cause`, `_baseline_value`,
   `baseline_violation_score`, `summary`).
5. **Re-run** `python -m src.eval.causal_rca_eval` against the labeled
   set; replace the ground-truth-aware scorer in `_gt_aware_score`
   with the real trained NLI / judge ensemble.

A full collection at the rate of ~3 minutes per case takes one expert
roughly 25 hours; with two reviewers + adjudication, plan for ~80
person-hours.

---

## Interpreting results

* **Precision / recall / F1 (per-agent):** standard binary
  classification metrics. Predictions are derived from
  `verdict.severity > Severity.SAFE`; ground truth is
  `case.expected_violation_severity not in (None, SAFE)`.
* **MedRAG hallucination / bias / PII-leak / refusal rate:** fraction
  of cases in which the post-flight pipeline emits a violation of that
  category. The bare baseline reports the dataset's labeled rates.
* **Top-1 / Top-3 attribution accuracy:** fraction of labeled traces
  for which the ranked-causes list places the ground-truth node at
  position 1 (top-1) or anywhere in the top 3.
* **p50/p95/p99 latency:** stage-wise wall-clock latency in
  milliseconds across the concurrent batch.

---

## Known limitations

* **No internet downloads.** Adapters ship with bundled fixtures only.
* **Ground-truth-aware causal scorer.** `causal_rca_eval` uses a scorer
  that knows the ground truth on the synthetic fixture so the harness
  can be verified end-to-end. The production scorer is the trained
  NLI/judge ensemble.
* **Stub baselines for RCA.** `attention` and `llm_judge` are
  deterministic stand-ins, not real attention attribution or live
  LLM-judge calls.
* **Same-pipeline ablation.** All 4 ablation rows share the default
  medical pipeline; differentiating per-config pipeline construction is
  the next step (Phase 8+).
* **No k6.** The latency benchmark uses Python `asyncio.gather` rather
  than k6, trading high-fidelity load shaping for zero-install local
  reproducibility.
* **No MLflow tracking.** Results are written to `data/eval-results/`
  as JSON. MLflow integration is a follow-up.
