import hashlib
from typing import Iterable, List

from langchain_core.embeddings import Embeddings

from app.core.config import settings

EMBEDDING_DIM = 1536


def _hash_token(token: str) -> int:
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big")


def _normalize(vector: list[float]) -> list[float]:
    norm = sum(v * v for v in vector) ** 0.5
    if norm == 0:
        return vector
    return [v / norm for v in vector]


def embed_text(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    tokens = [t for t in text.lower().split() if t.isascii()]
    if not tokens:
        return [0.0] * dim

    vector = [0.0] * dim
    for token in tokens:
        idx = _hash_token(token) % dim
        vector[idx] += 1.0

    return _normalize(vector)


class HashEmbeddings(Embeddings):
    def __init__(self, dim: int = EMBEDDING_DIM) -> None:
        self.dim = dim

    def embed_documents(self, texts: Iterable[str]) -> List[List[float]]:
        return [embed_text(text, self.dim) for text in texts]

    def embed_query(self, text: str) -> List[float]:
        return embed_text(text, self.dim)


class EmbeddingProvider(Embeddings):
    def __init__(self) -> None:
        self.provider_name = "hash"
        self.model = "hash-embedding"
        self._provider = self._load_provider()

    def _load_provider(self) -> Embeddings:
        if settings.embedding_provider == "openai" and settings.openai_api_key:
            try:
                from langchain_openai import OpenAIEmbeddings

                self.provider_name = "openai"
                self.model = settings.openai_embedding_model
                return OpenAIEmbeddings(
                    api_key=settings.openai_api_key,
                    model=settings.openai_embedding_model,
                )
            except ImportError:
                pass
        return HashEmbeddings()

    def embed_documents(self, texts: Iterable[str]) -> List[List[float]]:
        return self._provider.embed_documents(list(texts))

    def embed_query(self, text: str) -> List[float]:
        return self._provider.embed_query(text)

    def info(self) -> dict[str, str]:
        return {"provider": self.provider_name, "model": self.model}
