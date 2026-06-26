import os
import time
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from vectorstore.chroma_store import get_vector_store
from core.registry import register_document
from dotenv import load_dotenv

load_dotenv()

Settings.embed_model = GoogleGenAIEmbedding(
    model_name="gemini-embedding-001",
    api_key=os.getenv("GEMINI_API_KEY"),
    embed_batch_size=5,   # 5 per batch → fewer API calls
)


def ingest_pdf(file_path: str, doc_id: str, original_filename: str, size_bytes: int):
    documents = SimpleDirectoryReader(input_files=[file_path]).load_data()

    for i, doc in enumerate(documents):
        doc.metadata["doc_id"] = doc_id
        doc.metadata["source"] = original_filename
        if "page_label" not in doc.metadata:
            doc.metadata["page_label"] = str(i + 1)

    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
    nodes = splitter.get_nodes_from_documents(documents)

    for node in nodes:
        node.metadata.setdefault("doc_id", doc_id)
        node.metadata.setdefault("source", original_filename)

    print(f"[ingestion] {original_filename}: {len(documents)} pages → {len(nodes)} chunks")

    # Embed in small batches with a pause to stay under RPM limits
    vector_store, storage_context = get_vector_store()

    BATCH = 5
    for i in range(0, len(nodes), BATCH):
        batch = nodes[i : i + BATCH]
        VectorStoreIndex(batch, storage_context=storage_context)
        if i + BATCH < len(nodes):
            time.sleep(2)   # 2-second pause between batches

    register_document(
        doc_id=doc_id,
        filename=original_filename,
        chunks=len(nodes),
        size_bytes=size_bytes,
    )

    return {
        "status": "success",
        "chunks_created": len(nodes),
        "doc_id": doc_id,
        "pages": len(documents),
    }
