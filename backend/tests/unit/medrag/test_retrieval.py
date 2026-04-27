from __future__ import annotations

from pathlib import Path

import pytest

from src.medrag.ingest import DEFAULT_CORPUS_PATH, ingest
from src.medrag.retrieval import MedRAGRetriever, RetrievedChunk


@pytest.fixture(scope="module")
def populated_chroma_path(tmp_path_factory: pytest.TempPathFactory) -> str:
    """Ingest the demo corpus into a session-scoped temp Chroma path once."""
    chroma_path = str(tmp_path_factory.mktemp("retrieval-chroma"))
    # __file__ = backend/tests/unit/medrag/test_retrieval.py → parents[4] is the repo root
    corpus_path = Path(__file__).resolve().parents[4] / DEFAULT_CORPUS_PATH
    ingest(corpus_path=corpus_path, chroma_path=chroma_path, rebuild=True)
    return chroma_path


@pytest.fixture(scope="module")
def retriever(populated_chroma_path: str) -> MedRAGRetriever:
    return MedRAGRetriever(collection_path=populated_chroma_path)


@pytest.mark.asyncio
async def test_retrieve_returns_top_k_chunks(retriever: MedRAGRetriever) -> None:
    chunks = await retriever.retrieve("paracetamol in pregnancy", k=5)
    assert len(chunks) == 5
    for c in chunks:
        assert isinstance(c, RetrievedChunk)
        assert c.doc_id and c.text and 0.0 <= c.score <= 1.0


@pytest.mark.asyncio
async def test_retrieve_top_hit_is_topically_relevant(retriever: MedRAGRetriever) -> None:
    chunks = await retriever.retrieve("paracetamol in pregnancy", k=3)
    # The top-3 should include at least one chunk whose text mentions
    # paracetamol/acetaminophen or pregnancy.
    top_texts = [c.text.lower() for c in chunks]
    assert any(
        ("paracetamol" in t) or ("acetaminophen" in t) or ("pregnancy" in t)
        for t in top_texts
    )


@pytest.mark.asyncio
async def test_retrieve_off_topic_query_low_relevance(retriever: MedRAGRetriever) -> None:
    """An off-topic query (e.g., 'how to fix a flat tire on a bicycle') should
    return chunks whose top score is meaningfully lower than an on-topic query.
    The corpus has no bicycle content, so the closest match will still be a
    medical chunk but with a low cosine similarity.
    """
    on_topic = await retriever.retrieve("paracetamol in pregnancy", k=1)
    off_topic = await retriever.retrieve("how to fix a flat tire on a bicycle", k=1)
    # Both return something (Chroma always returns top-k), but the relative
    # similarity should favor on-topic.
    assert on_topic[0].score > off_topic[0].score


@pytest.mark.asyncio
async def test_retrieve_k_param_caps_results(retriever: MedRAGRetriever) -> None:
    chunks = await retriever.retrieve("antibiotic resistance", k=2)
    assert len(chunks) == 2
