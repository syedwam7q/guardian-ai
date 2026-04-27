"""Bundled benchmark dataset adapters.

Each adapter exposes a ``load_fixture()`` generator that yields
:class:`src.eval.schemas.EvalCase` objects. Fixtures are small (5-10
cases) and bundled in ``data/benchmarks/`` so tests are deterministic
and run without internet access. The full upstream datasets are
documented in ``docs/EVALUATION.md`` along with download instructions.
"""
