"""Corpus ingestion: load → chunk → embed → ChromaDB index."""

from __future__ import annotations

import argparse
import contextlib
import json
import logging
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import chromadb

logger = logging.getLogger(__name__)

DEFAULT_CHUNK_SIZE_TOKENS = 512
DEFAULT_CHUNK_OVERLAP_TOKENS = 50

DEFAULT_CORPUS_PATH = Path("data/corpus/demo_medical_corpus.jsonl")
DEFAULT_CHROMA_PATH = "data/chroma/medrag-corpus"
DEFAULT_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
DEFAULT_COLLECTION = "medrag"


@dataclass
class CorpusDocument:
    doc_id: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Chunk:
    chunk_id: str  # f"{doc_id}::chunk-{i}"
    doc_id: str
    text: str
    metadata: dict[str, Any]


def load_jsonl_corpus(path: str | Path) -> Iterator[CorpusDocument]:
    """Yield CorpusDocument from a JSONL file with {doc_id, text, metadata?}."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Corpus not found: {p}")
    with p.open() as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line:
                continue
            obj = json.loads(line)
            yield CorpusDocument(
                doc_id=obj["doc_id"],
                text=obj["text"],
                metadata=obj.get("metadata", {}),
            )


def chunk_documents(
    docs: Iterable[CorpusDocument],
    *,
    chunk_size_tokens: int = DEFAULT_CHUNK_SIZE_TOKENS,
    overlap_tokens: int = DEFAULT_CHUNK_OVERLAP_TOKENS,
) -> list[Chunk]:
    """Whitespace-token chunker. Phase-3 baseline; replace with tiktoken for production."""
    chunks: list[Chunk] = []
    for doc in docs:
        words = doc.text.split()
        if len(words) <= chunk_size_tokens:
            chunks.append(
                Chunk(
                    chunk_id=f"{doc.doc_id}::chunk-0",
                    doc_id=doc.doc_id,
                    text=doc.text,
                    metadata=doc.metadata,
                )
            )
            continue
        step = max(1, chunk_size_tokens - overlap_tokens)
        for idx, start in enumerate(range(0, len(words), step)):
            piece = words[start : start + chunk_size_tokens]
            if not piece:
                break
            chunks.append(
                Chunk(
                    chunk_id=f"{doc.doc_id}::chunk-{idx}",
                    doc_id=doc.doc_id,
                    text=" ".join(piece),
                    metadata=doc.metadata,
                )
            )
            if start + chunk_size_tokens >= len(words):
                break
    return chunks


def embed_and_index(
    chunks: list[Chunk],
    *,
    chroma_path: str = DEFAULT_CHROMA_PATH,
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
    collection_name: str = DEFAULT_COLLECTION,
    rebuild: bool = False,
) -> int:
    """Embed each chunk and persist to ChromaDB. Returns chunk count."""
    from sentence_transformers import SentenceTransformer

    Path(chroma_path).mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=chroma_path)
    if rebuild:
        with contextlib.suppress(Exception):
            client.delete_collection(collection_name)
    collection = client.get_or_create_collection(collection_name)

    model = SentenceTransformer(embedding_model)
    texts = [c.text for c in chunks]
    if not texts:
        return 0
    embeddings = model.encode(texts, show_progress_bar=False).tolist()

    collection.upsert(
        ids=[c.chunk_id for c in chunks],
        documents=texts,
        embeddings=embeddings,
        metadatas=[c.metadata or {"_": ""} for c in chunks],  # chroma rejects empty dicts
    )
    return len(chunks)


def ingest(
    *,
    corpus_path: str | Path = DEFAULT_CORPUS_PATH,
    chroma_path: str = DEFAULT_CHROMA_PATH,
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
    collection_name: str = DEFAULT_COLLECTION,
    rebuild: bool = False,
) -> int:
    """End-to-end: load → chunk → embed → index. Returns indexed-chunk count."""
    docs = list(load_jsonl_corpus(corpus_path))
    chunks = chunk_documents(docs)
    return embed_and_index(
        chunks,
        chroma_path=chroma_path,
        embedding_model=embedding_model,
        collection_name=collection_name,
        rebuild=rebuild,
    )


def _cli() -> None:
    parser = argparse.ArgumentParser(prog="medrag-ingest")
    parser.add_argument("--corpus", default=str(DEFAULT_CORPUS_PATH))
    parser.add_argument("--chroma-path", default=DEFAULT_CHROMA_PATH)
    parser.add_argument("--embedding-model", default=DEFAULT_EMBEDDING_MODEL)
    parser.add_argument("--collection", default=DEFAULT_COLLECTION)
    parser.add_argument("--rebuild", action="store_true")
    args = parser.parse_args()
    n = ingest(
        corpus_path=args.corpus,
        chroma_path=args.chroma_path,
        embedding_model=args.embedding_model,
        collection_name=args.collection,
        rebuild=args.rebuild,
    )
    logger.warning("ingested %d chunks into %s/%s", n, args.chroma_path, args.collection)
    print(f"ingested {n} chunks into {args.chroma_path}/{args.collection}")


if __name__ == "__main__":
    _cli()
