"""MedRAG retrieval service over the ChromaDB corpus."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer

DEFAULT_CHROMA_PATH = "data/chroma/medrag-corpus"
DEFAULT_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
DEFAULT_COLLECTION = "medrag"


@dataclass
class RetrievedChunk:
    doc_id: str
    text: str
    score: float
    metadata: dict[str, Any]


class MedRAGRetriever:
    """Retrieve top-k chunks from a ChromaDB corpus using a sentence-transformer embedder."""

    def __init__(
        self,
        *,
        collection_path: str = DEFAULT_CHROMA_PATH,
        embedding_model: str = DEFAULT_EMBEDDING_MODEL,
        collection_name: str = DEFAULT_COLLECTION,
    ) -> None:
        self.client = chromadb.PersistentClient(path=collection_path)
        self.collection = self.client.get_or_create_collection(collection_name)
        self.embedder = SentenceTransformer(embedding_model)

    async def retrieve(self, query: str, k: int = 5) -> list[RetrievedChunk]:
        """Return the top-k most similar chunks for ``query``.

        Both encoding and the ChromaDB query are sync (CPU/disk-bound), so we
        offload them to a worker thread to avoid blocking the event loop.
        """
        encoded = await asyncio.to_thread(self.embedder.encode, [query])
        emb = encoded[0].tolist()
        results = await asyncio.to_thread(
            self.collection.query, query_embeddings=[emb], n_results=k
        )

        ids = results["ids"][0]
        documents = results["documents"][0]
        distances = results["distances"][0]
        metadatas = results["metadatas"][0]

        chunks: list[RetrievedChunk] = []
        for i, doc_id in enumerate(ids):
            # Cosine distance in Chroma is in [0, 2]; clamp similarity to [0, 1].
            similarity = max(0.0, min(1.0, 1.0 - float(distances[i])))
            chunks.append(
                RetrievedChunk(
                    doc_id=doc_id,
                    text=documents[i],
                    score=similarity,
                    metadata=metadatas[i] or {},
                )
            )
        return chunks
