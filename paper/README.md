# Paper

This directory contains the LaTeX manuscript for **GuardianAI:
Counterfactual Causal Diagnosis for Runtime Governance of LLM
Applications**, targeting the NeurIPS Workshop on Safe & Trustworthy
ML, 2026.

```
paper/
├── manuscript.tex     # the manuscript (8–10 pages, abstract + 8 sections)
├── refs.bib           # 30+ BibTeX entries
├── Makefile           # `make paper` → latexmk -pdf manuscript.tex
├── figures/           # placeholder boxes by default; drop in PDFs to override
│   └── README.md      # what each figure is and how to regenerate it
└── README.md          # this file
```

## Build

```bash
make paper            # default: latexmk -pdf manuscript.tex
make pdflatex         # explicit pdflatex + bibtex + 2 reruns
make watch            # latexmk -pvc continuous build
make clean            # drop intermediate aux/log/bbl/blg
make veryclean        # also drop the PDF
```

### Build prerequisites

- TeX Live full distribution (`pdflatex`, `bibtex`, `latexmk`).
- macOS: `brew install --cask mactex` (or `mactex-no-gui` for a
  smaller install).
- Linux: `apt install texlive-full latexmk` (Debian/Ubuntu) or the
  equivalent.
- The manuscript only depends on standard CTAN packages
  (`geometry`, `amsmath`, `amssymb`, `amsthm`, `algorithm`,
  `algpseudocode`, `graphicx`, `booktabs`, `xcolor`, `cite`,
  `etoolbox`, `hyperref`, `url`).
- No NeurIPS-specific style file is required; the manuscript falls
  back to standard `\documentclass{article}` with 1-inch margins. To
  produce a NeurIPS-styled camera-ready, drop `neurips_2024.sty` next
  to `manuscript.tex` and switch the document class accordingly.

## Where each section's content lives in the codebase

| Section                              | Source of truth in the repo                                                                |
|--------------------------------------|--------------------------------------------------------------------------------------------|
| §1 Introduction                      | `README.md`, `docs/ARCHITECTURE.md`                                                        |
| §2 Related Work                      | `paper/refs.bib`                                                                           |
| §3.1 Pipeline                        | `backend/src/guardian/pipeline.py`, `backend/src/guardian/agents/`                         |
| §3.2 Decision engine                 | `backend/src/guardian/decision.py`, `backend/src/guardian/schemas.py`                      |
| §3.3 Latency budgets / isolation     | `backend/src/guardian/agents/base.py`, `backend/src/guardian/pipeline.py`                  |
| §4.1 DAG                             | `backend/src/guardian/causal/dag_schema.py`                                                |
| §4.2 Interventions / ATE             | `backend/src/guardian/causal/intervention.py`                                              |
| §4.3 Bootstrap estimator             | `backend/src/guardian/causal/estimation.py` (`estimate_effect`)                            |
| §4.4 DoWhy fallback                  | `backend/src/guardian/causal/estimation.py` (`estimate_effect_dowhy`)                      |
| §4.5 Algorithm                       | `backend/src/guardian/causal/engine.py` (`CausalEngine.diagnose`)                          |
| §5.1 Per-agent benchmarks            | `backend/src/eval/agent_benchmarks.py`, `backend/src/eval/datasets/`                       |
| §5.2 MedRAG comparison               | `backend/src/eval/medrag_benchmark.py`                                                     |
| §5.3 Causal RCA                      | `backend/src/eval/causal_rca_eval.py`, `data/benchmarks/causal_rca_fixture.jsonl`          |
| §5.4 Latency                         | `backend/src/eval/latency_benchmark.py`                                                    |
| §5.5 Ablation                        | `backend/src/eval/ablation.py`                                                             |
| §6 Case studies                      | `data/benchmarks/medhelm.jsonl`, `data/benchmarks/advbench.jsonl`, `backend/policies/medical.yaml` |
| §7 Limitations                       | `docs/EVALUATION.md` (500-case protocol, single-machine, English-only, contamination)      |
| §8 Conclusion                        | (synthesis)                                                                                |

## Reproducing the numbers

The numbers in Tables 1–5 of the manuscript are produced by the
evaluation harness:

```bash
cd backend && source .venv/bin/activate
python -m src.eval.run_all
```

Per-table:

```bash
# Table 1: per-agent F1
python -m src.eval.agent_benchmarks --agent hallucination    --dataset halueval
python -m src.eval.agent_benchmarks --agent bias             --dataset bbq
python -m src.eval.agent_benchmarks --agent prompt_injection --dataset advbench
python -m src.eval.agent_benchmarks --agent policy           --dataset medhelm

# Table 2: end-to-end MedRAG
python -m src.eval.medrag_benchmark

# Table 3: causal RCA top-1/top-3
python -m src.eval.causal_rca_eval

# Table 4: latency p50/p95/p99
python -m src.eval.latency_benchmark

# Table 5: ablation
python -m src.eval.ablation
```

Results are written to `data/eval-results/` as JSON.

## Honesty disclaimer

§5 of the manuscript explicitly states that all numbers are computed
on bundled in-repo fixtures (5–10 cases per benchmark) and that the
500-case real-world causal-RCA dataset described in
`docs/EVALUATION.md` is in flight.

## Camera-ready iteration (Phase 8.8) and submission (Phase 8.9)

Both are human-driven and out of scope for this directory. The
camera-ready pass should:

- Switch to the venue's official `.sty` once chosen.
- Drop final figure PDFs into `figures/`.
- Trim the page count to the venue's limit (typically 8 pages
  excluding references for the NeurIPS workshop track).
- Run a final spell/grammar pass and a citation-completeness check.
