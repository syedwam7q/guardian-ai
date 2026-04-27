import pytest

from src.guardian.agents.pii_out import PIIOutAgent
from src.guardian.schemas import Severity


@pytest.fixture(scope="module")
def agent():
    return PIIOutAgent(timeout_ms=300)


@pytest.mark.asyncio
async def test_pii_in_output_not_in_context_flagged(agent):
    ctx = {
        "output": "Contact Dr. Sharma at 9876543210 for follow-up.",
        "retrieved_docs": [{"text": "General medical information."}],
    }
    v = await agent.evaluate(ctx)
    assert v.severity >= Severity.WARN


@pytest.mark.asyncio
async def test_pii_present_in_context_allowed(agent):
    ctx = {
        "output": "The number 9876543210 was given as the example.",
        "retrieved_docs": [{"text": "Example phone: 9876543210"}],
    }
    v = await agent.evaluate(ctx)
    # PII appears but is grounded in retrieved context — lower severity
    assert v.severity < Severity.BLOCK
