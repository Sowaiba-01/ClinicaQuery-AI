import os
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from vectorstore.chroma_store import get_vector_store
from dotenv import load_dotenv

load_dotenv()

Settings.embed_model = GoogleGenAIEmbedding(
    model_name="gemini-embedding-001",
    api_key=os.getenv("GEMINI_API_KEY"),
    embed_batch_size=1
)

def ingest_pdf(file_path: str, doc_id: str):
    documents = SimpleDirectoryReader(input_files=[file_path]).load_data()

    for doc in documents:
        doc.metadata["doc_id"] = doc_id
        doc.metadata["source"] = os.path.basename(file_path)

    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=50)
    nodes = splitter.get_nodes_from_documents(documents)
    print("Chunks created:", len(nodes))

    vector_store, storage_context = get_vector_store()
    VectorStoreIndex(nodes, storage_context=storage_context)

    return {
        "status": "success",
        "chunks_created": len(nodes),
        "doc_id": doc_id
    }