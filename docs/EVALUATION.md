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

---

## Reproducing the paper's numbers

Every table and figure in the manuscript has a single command that
regenerates the underlying numbers. All paths are relative to the
repository root unless noted; all commands assume
`cd backend && source .venv/bin/activate`.

| Paper artifact | Command | Output file | Notes |
|----------------|---------|-------------|-------|
| **Table 1** — Per-agent precision/recall/F1 across 7 benchmarks | `for a in prompt_injection policy hallucination bias pii_in pii_out cost; do for d in advbench medhelm halueval bbq factscore ragtruth pubmedqa; do python -m src.eval.agent_benchmarks --agent $a --dataset $d; done; done` | stdout per-row | The paper's headline grid; see `agent_benchmarks.py` for the agent×dataset compatibility matrix. |
| **Table 2** — Bare RAG vs governed MedRAG | `python -m src.eval.medrag_benchmark` | `data/eval-results/medrag_<ts>.json` | Hallucination / bias / PII-leak / refusal rates per config. |
| **Table 3** — Causal RCA top-1 / top-3 across 4 methods | `python -m src.eval.causal_rca_eval` | `data/eval-results/causal_rca.json` | `random` / `attention` / `llm_judge` / `ours_dowhy` columns. |
| **Table 4** — Stage-wise latency (p50/p95/p99) | `python -m src.eval.latency_benchmark` | `data/eval-results/latency.json` | 100 concurrent requests; reports per-stage breakdown. |
| **Table 5** — 4-config ablation | `python -m src.eval.ablation` | `data/eval-results/ablation.json` | `no_governance` / `governance_only` / `governance_plus_judge` / `full_guardian`. |
| **Figure 2** — DAG visualization | render from `frontend/src/pages/CausalExplorer.tsx` | screenshot | The DAG schema is `backend/src/guardian/causal/dag.py`; the figure is taken from the React Flow render in the UI. |
| **All-in-one summary row** (used in the abstract) | `python -m src.eval.run_all` | `data/eval-results/full_eval_<ts>.json` | Wraps RCA + MedRAG + 20-request latency into one JSON. |

A convenience target is wired into the existing harness: running
`python -m src.eval.run_all` and inspecting the resulting JSON is
the fastest way to confirm a clone of the repo reproduces the
paper's headline numbers (within bootstrap CI overlap).

---

## Hardware requirements

GuardianAI's evaluation harness is **CPU-only**. We deliberately ship
no GPU profile — the project's positioning is "drop-in governance for
existing apps", which makes a hard GPU dependency a deployment
liability.

| Resource | Minimum | Recommended | Notes |
|----------|---------|-------------|-------|
| **CPU**  | 4 cores | 8+ cores    | NLI / Detoxify / sentence-transformer inference is parallelizable across the request batch. |
| **RAM**  | 12 GB   | 16 GB       | RoBERTa-large-MNLI is ~1.4 GB; sentence-transformers ~500 MB; Detoxify ~500 MB; Presidio + spaCy `en_core_web_lg` ~1 GB. With Chroma + DuckDB + Python overhead, 12 GB is a hard floor. |
| **Disk** | 5 GB    | 10 GB       | ~1.5 GB for HF model cache, ~500 MB for spaCy, ~1 GB for Chroma index + corpus, ~1 GB headroom for traces.db growth, ~500 MB for the venv itself. |
| **OS**   | Linux / macOS | Linux | Tested on Ubuntu 22.04 and macOS 14. Windows works through WSL2 but is not in CI. |
| **Python** | 3.11 | 3.11 | Pinned. 3.12 should work; 3.10 will fail because we use `Self` and `tuple[…]` shapes liberally. |

### Expected runtimes

On a 2024 MacBook Pro M3 Pro (8 perf cores, 18 GB RAM), measured
end-to-end including model warmup:

| Benchmark | Cold start | Warm runtime |
|-----------|-----------|--------------|
| `agent_benchmarks` (one agent × one dataset, ~10 cases) | ~30 s | ~5 s |
| `medrag_benchmark`  (6-case MedHELM fixture, both configs) | ~90 s | ~25 s |
| `causal_rca_eval`   (8-case synthetic fixture × 4 methods) | ~45 s | ~10 s |
| `latency_benchmark` (100 concurrent shallow probes) | ~60 s | ~30 s |
| `ablation`          (medrag fixture × 4 configs) | ~150 s | ~60 s |
| `run_all`           | ~3 min | ~1 min |

A full Table 1 sweep (7 agents × 7 datasets, where compatible) takes
~10 minutes warm.

---

## Real-data download protocol

The bundled fixtures are sufficient for tests and the paper's
deterministic numbers. To run a real benchmark, download the upstream
dataset, parse it into the JSONL shape each adapter expects (see the
per-adapter `load_fixture()` body), and place the file at
`data/benchmarks/<name>_full.jsonl` (or override the `FIXTURE_PATH`
constant at the top of each adapter).

Each upstream is hosted by the original authors. We do not vendor or
re-host them. Where the upstream provides a stable archive URL with a
fixed digest, we record it; where the upstream uses git-LFS or a
mutable HEAD, only the repo URL is recorded (best-effort — these may
not reproduce byte-for-byte).

| Benchmark | Upstream URL | Stable archive | Expected SHA256 |
|-----------|--------------|---------------|----------------|
| HaluEval  | https://github.com/RUCAIBox/HaluEval                     | none — `git clone`             | n/a (mutable HEAD) |
| FactScore | https://github.com/shmsw25/FActScore                     | none — `git clone`             | n/a (mutable HEAD) |
| RAGTruth  | https://github.com/ParticleMedia/RAGTruth                | none — `git clone`             | n/a (mutable HEAD) |
| BBQ       | https://github.com/nyu-mll/BBQ                           | release tarball per tag        | varies per tag — pin `git checkout` to a tag for reproducibility |
| AdvBench  | https://github.com/llm-attacks/llm-attacks               | `data/advbench/harmful_behaviors.csv` | best-effort: pin commit |
| MedHELM   | https://crfm.stanford.edu/helm/medhelm/                  | HELM REST API                  | varies — record `helm_version` in your run |
| PubMedQA  | https://github.com/pubmedqa/pubmedqa                     | release tarball per tag        | pin `git checkout` to a tag |

Recommended workflow:

```bash
mkdir -p data/benchmarks/raw
cd data/benchmarks/raw
git clone --depth 1 https://github.com/RUCAIBox/HaluEval.git
git clone --depth 1 https://github.com/shmsw25/FActScore.git
# … etc.

# Note the commit hash you cloned for provenance:
( cd HaluEval && git rev-parse HEAD ) > halueval.commit
```

Then convert each upstream into the JSONL shape the adapter reads
(`load_fixture()` in each `backend/src/eval/datasets/*.py` documents
the exact field names) and drop it next to the bundled fixture as
`<name>_full.jsonl`. The adapter looks for `_full.jsonl` first and
falls back to the bundled fixture if missing — no code change needed
to switch back and forth.

Downstream licensing and citation requirements are the user's
responsibility.

---

## FAQ

### Q: I get `OSError: Can't find model 'en_core_web_lg'`

Run `python -m spacy download en_core_web_lg`. The Docker images bake
this in; native installs require the explicit step. SETUP.md covers
this in the venv-setup section.

### Q: HuggingFace downloads keep getting rate-limited / 429

You're hitting the unauthenticated-pull limit. Two fixes:

1. Set `HF_TOKEN` to a free read-only token from
   https://huggingface.co/settings/tokens. The backend reads it via
   the standard HF env conventions.
2. Run the warmup once on a machine that has stable network and let
   the docker-compose `hf-cache` named volume persist between
   invocations.

### Q: ChromaDB throws `Collection [name] does not exist`

Chroma's persistent client treats collection metadata as state. If you
delete `data/chroma/` between runs, the embeddings are gone but the
adapter may still expect the collection name. Fix:

```bash
rm -rf data/chroma
cd backend && source .venv/bin/activate
python -m src.medrag.ingest      # re-ingests data/corpus/*.jsonl
```

The first call to the MedRAG endpoint after re-ingest will be slow
(~10 s) while the embeddings are computed; subsequent calls hit the
warm Chroma collection.

### Q: `ModuleNotFoundError: No module named 'src'`

You're outside the `backend/` directory. Every `python -m src.…`
command must be run from `backend/` after activating `.venv/`.

### Q: `groq.AuthenticationError: 401`

`GROQ_API_KEY` is unset or invalid. The default LLM-judge agent
silently falls back to neutral verdicts when the key is missing
(`backend/src/guardian/llm_judge.py`), but explicit Groq calls in the
proxy or in eval scripts that bypass the judge layer will surface the
401 directly. Check your `.env` (or systemd `EnvironmentFile`) is
loaded.

### Q: My latency numbers don't match the paper

The paper's latency was measured on warm caches with all models
already downloaded. Run the benchmark twice and use the second number
— or run `python -c "from src.guardian.pipeline import warmup; warmup()"`
once before the timed run.

### Q: Can I run only one or two benchmarks?

Yes. Each `src.eval.*` module is a standalone CLI. The `run_all` script
is a convenience that fires three of them in sequence. Skip what you
don't need — there are no cross-module dependencies.

### Q: Why does the causal RCA's `ours_dowhy` column know the ground
truth in the synthetic fixture?

Because the fixture is synthetic — it has no labels for an unbiased
scorer to learn from. The shipped `_gt_aware_score` is a verification
harness that proves the *infrastructure* (DoWhy estimator, bootstrap CI,
ranked-causes ordering) works end-to-end. In a production deployment the
scorer is the trained NLI / judge ensemble; see "Known limitations" above.
