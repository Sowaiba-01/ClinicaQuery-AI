"""
Document registry — persists metadata for all indexed PDFs.
Stored in ./documents.json next to main.py.
"""
import json
import os
from datetime import datetime, timezone
from threading import Lock

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "..", "documents.json")
_lock = Lock()


def _load() -> list:
    if not os.path.exists(REGISTRY_PATH):
        return []
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save(docs: list) -> None:
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2)


def register_document(doc_id: str, filename: str, chunks: int, size_bytes: int) -> dict:
    entry = {
        "doc_id": doc_id,
        "filename": filename,
        "chunks": chunks,
        "size_bytes": size_bytes,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    with _lock:
        docs = _load()
        # de-dup by doc_id
        docs = [d for d in docs if d.get("doc_id") != doc_id]
        docs.insert(0, entry)
        _save(docs)
    return entry


def list_documents() -> list:
    with _lock:
        return _load()


def delete_document(doc_id: str) -> bool:
    with _lock:
        docs = _load()
        new_docs = [d for d in docs if d.get("doc_id") != doc_id]
        if len(new_docs) == len(docs):
            return False
        _save(new_docs)
        return True
