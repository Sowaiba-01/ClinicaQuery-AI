"""
One-time migration: backfill documents.json registry from existing ChromaDB data.
Run with: python migrate_registry.py
"""
import os
import sys
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

import chromadb
from core.registry import register_document, list_documents

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploaded_pdfs")

def main():
    existing = {d["doc_id"] for d in list_documents()}
    print(f"Registry already has {len(existing)} documents.")

    client = chromadb.PersistentClient(path=CHROMA_PATH)
    try:
        col = client.get_collection("medical_papers")
    except Exception:
        print("No 'medical_papers' collection found — nothing to migrate.")
        return

    # Pull all items with metadata
    result = col.get(include=["metadatas"])
    metadatas = result.get("metadatas", []) or []

    # Aggregate chunks per (doc_id, source)
    doc_info: dict[str, dict] = {}
    for meta in metadatas:
        if not meta:
            continue
        doc_id = meta.get("doc_id", "unknown")
        source = meta.get("source", "unknown.pdf")
        if doc_id not in doc_info:
            doc_info[doc_id] = {"source": source, "chunks": 0}
        doc_info[doc_id]["chunks"] += 1

    print(f"Found {len(doc_info)} unique documents in ChromaDB.")

    registered = 0
    for doc_id, info in doc_info.items():
        if doc_id in existing:
            print(f"  skip (already registered): {info['source']}")
            continue

        # Try to get file size from uploaded_pdfs/
        size_bytes = 0
        for fname in os.listdir(UPLOAD_DIR):
            if fname.startswith(doc_id):
                try:
                    size_bytes = os.path.getsize(os.path.join(UPLOAD_DIR, fname))
                except OSError:
                    pass
                break

        register_document(
            doc_id=doc_id,
            filename=info["source"],
            chunks=info["chunks"],
            size_bytes=size_bytes,
        )
        print(f"  registered: {info['source']} ({info['chunks']} chunks)")
        registered += 1

    print(f"\nDone. Registered {registered} new documents.")

if __name__ == "__main__":
    main()
