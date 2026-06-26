import os
from llama_index.core import VectorStoreIndex, Settings
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from vectorstore.chroma_store import get_vector_store
from core.guardrails import check_hallucination
from dotenv import load_dotenv


load_dotenv()

Settings.llm = GoogleGenAI(
    model="gemini-2.5-flash",
    api_key=os.getenv("GEMINI_API_KEY")
)

Settings.embed_model = GoogleGenAIEmbedding(
    model_name="gemini-embedding-001",
    api_key=os.getenv("GEMINI_API_KEY")
)

MEDICAL_SYSTEM_PROMPT = """You are a medical research assistant helping
clinicians and researchers understand scientific papers.

RULES:
1. Only answer based on the provided source documents
2. Always mention which paper your answer comes from
3. If the answer is not in the documents say:
   I cannot find this information in the uploaded papers
4. Never make up drug dosages, statistics, or clinical data
5. Always add: Consult a licensed physician for clinical decisions
"""


def _build_source_metadata(source_nodes: list) -> list:
    return [
        {
            "text_snippet": node.text[:400] + ("..." if len(node.text) > 400 else ""),
            "source_file": node.metadata.get("source", "Unknown"),
            "page_label": node.metadata.get("page_label", None),
            "relevance_score": round(node.score, 3) if node.score else None,
        }
        for node in source_nodes
    ]


def answer_medical_query(question: str) -> dict:
    """Non-streaming query — returns the full response dict."""
    vector_store, _ = get_vector_store()
    index = VectorStoreIndex.from_vector_store(vector_store)

    query_engine = index.as_query_engine(
        similarity_top_k=5,
        response_mode="compact",
    )

    response = query_engine.query(
        f"{MEDICAL_SYSTEM_PROMPT}\n\nQuestion: {question}"
    )

    source_texts = [node.text for node in response.source_nodes]
    source_metadata = _build_source_metadata(response.source_nodes)

    guardrail_result = check_hallucination(
        question=question,
        answer=str(response),
        source_texts=source_texts,
    )

    return {
        "answer": str(response),
        "sources": source_metadata,
        "guardrails": guardrail_result,
    }


def stream_medical_query(question: str):
    """
    Streaming query.
    Yields (token_or_none, metadata_or_none) tuples.
    The last tuple has token=None and metadata=dict with sources + guardrails.
    """
    vector_store, _ = get_vector_store()
    index = VectorStoreIndex.from_vector_store(vector_store)

    query_engine = index.as_query_engine(
        similarity_top_k=5,
        response_mode="compact",
        streaming=True,
    )

    streaming_response = query_engine.query(
        f"{MEDICAL_SYSTEM_PROMPT}\n\nQuestion: {question}"
    )

    full_answer = ""
    for token in streaming_response.response_gen:
        full_answer += token
        yield token, None

    # After streaming is done, compute sources + guardrails
    source_texts = [node.text for node in streaming_response.source_nodes]
    source_metadata = _build_source_metadata(streaming_response.source_nodes)

    guardrail_result = check_hallucination(
        question=question,
        answer=full_answer,
        source_texts=source_texts,
    )

    yield None, {
        "sources": source_metadata,
        "guardrails": guardrail_result,
    }
