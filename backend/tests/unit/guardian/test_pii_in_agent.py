import pytest

from src.guardian.agents.pii_in import PIIInAgent
from src.guardian.schemas import Severity


@pytest.fixture(scope="module")
def agent():
    return PIIInAgent(timeout_ms=300)


@pytest.mark.asyncio
async def test_aadhaar_detected_and_redacted(agent):
    text = "My Aadhaar number is 1234 5678 9012, please verify."
    verdict = await agent.evaluate({"user_input": text})
    assert verdict.severity >= Severity.WARN
    assert "AADHAAR" in verdict.evidence.get("entities", {})
    assert "1234 5678 9012" not in verdict.evidence.get("redacted_text", "")


@pytest.mark.asyncio
async def test_pan_detected(agent):
    text = "My PAN is ABCDE1234F"
    verdict = await agent.evaluate({"user_input": text})
    assert verdict.severity >= Severity.WARN
    assert "PAN" in verdict.evidence.get("entities", {})


@pytest.mark.asyncio
async def test_email_phone_detected(agent):
    text = "Email me at jane.doe@example.com or call 9876543210"
    verdict = await agent.evaluate({"user_input": text})
    assert verdict.severity >= Severity.WATCH
    entities = verdict.evidence.get("entities", {})
    assert "EMAIL_ADDRESS" in entities or "PHONE_NUMBER" in entities


@pytest.mark.asyncio
async def test_no_pii_passes(agent):
    verdict = await agent.evaluate(
        {"user_input": "What is the recommended dose of paracetamol?"}
    )
    assert verdict.severity == Severity.SAFE
