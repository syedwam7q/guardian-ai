from __future__ import annotations

from pathlib import Path

import pytest

from src.medrag.ingest import (
    DEFAULT_CORPUS_PATH,
    chunk_documents,
    ingest,
    load_jsonl_corpus,
)


@pytest.fixture(scope="module")
def demo_corpus_path() -> Path:
    # Resolve relative to repo root so tests work from any CWD.
    p = Path(__file__).resolve().parents[3] / DEFAULT_CORPUS_PATH
    assert p.exists(), f"demo corpus missing at {p}"
    return p


def test_demo_corpus_loads_at_least_30_docs(demo_corpus_path: Path) -> None:
    docs = list(load_jsonl_corpus(demo_corpus_path))
    assert len(docs) >= 30
    # Smoke check: each doc has the expected shape.
    for d in docs:
        assert d.doc_id and d.text and isinstance(d.metadata, dict)


def test_chunker_produces_chunks_for_demo_corpus(demo_corpus_path: Path) -> None:
    docs = list(load_jsonl_corpus(demo_corpus_path))
    chunks = chunk_documents(docs)
    # Demo chunks are short; expect roughly 1 chunk per doc.
    assert len(chunks) >= len(docs)


@pytest.mark.asyncio
async def test_ingest_and_query_paracetamol_pregnancy(
    tmp_path: Path, demo_corpus_path: Path
) -> None:
    """End-to-end: ingest demo corpus into a temp Chroma path; query top-5; verify relevance."""
    chroma_path = str(tmp_path / "chroma")
    n = ingest(
        corpus_path=demo_corpus_path,
        chroma_path=chroma_path,
        rebuild=True,
    )
    assert n >= 30

    # Query with the canonical "paracetamol pregnancy" prompt and verify the
    # top-5 contains at least one paracetamol-or-pregnancy chunk.
    import chromadb
    from sentence_transformers import SentenceTransformer

    client = chromadb.PersistentClient(path=chroma_path)
    coll = client.get_collection("medrag")
    embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")
    q = embedder.encode(["paracetamol pregnancy"])[0].tolist()
    results = coll.query(query_embeddings=[q], n_results=5)
    top_texts = [t.lower() for t in results["documents"][0]]
    assert any(
        ("paracetamol" in t) or ("acetaminophen" in t) or ("pregnancy" in t)
        for t in top_texts
    )
