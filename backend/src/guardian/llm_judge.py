"""LLM-as-judge factuality scoring via Groq."""
from __future__ import annotations

import json
import os
from typing import Any

from groq import AsyncGroq

_PROMPT = """\
You are a factuality judge. Given a CLAIM and retrieved CONTEXT, score how well the
CONTEXT supports the CLAIM on a scale from 0.0 (contradicted / unsupported) to 1.0
(fully supported). Return JSON: {{"factuality_score": <float>, "rationale": "<one sentence>"}}.

CLAIM: {claim}

CONTEXT: {context}
"""


async def judge_factuality(
    *,
    output: str,
    retrieved_context: str,
    model: str = "llama-3.3-70b-versatile",
) -> dict[str, Any]:
    """Score factuality of `output` against `retrieved_context` via an LLM judge.

    Returns {"factuality_score": float in [0,1], "rationale": str}.

    If GROQ_API_KEY is not set, returns a neutral verdict so unit tests can run
    without a live key.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {
            "factuality_score": 0.5,
            "rationale": "GROQ_API_KEY not configured; neutral fallback.",
        }

    client = AsyncGroq(api_key=api_key)
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": _PROMPT.format(claim=output, context=retrieved_context),
            },
        ],
        temperature=0.0,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or "{}"
    parsed = json.loads(content)
    score = float(parsed.get("factuality_score", 0.5))
    rationale = str(parsed.get("rationale", ""))
    return {"factuality_score": max(0.0, min(1.0, score)), "rationale": rationale}
