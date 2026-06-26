"""
Auto-generate a benchmark Q&A dataset from indexed documents.
Uses Gemini to produce diverse questions + ground-truth answers
directly from the text chunks already stored in ChromaDB.
"""

import os
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def generate_benchmark(num_questions: int = 8, output_path: str = "evaluation/benchmark.json") -> list:
    """Pull text from ChromaDB and ask Gemini to generate Q&A pairs."""
    from vectorstore.chroma_store import get_vector_store

    vector_store, _ = get_vector_store()
    collection = vector_store._collection

    data = collection.get(limit=15, include=["documents", "metadatas"])
    docs = data.get("documents") or []

    if not docs:
        raise RuntimeError("No documents indexed yet. Upload a PDF first.")

    sample_text = "\n\n---\n\n".join(docs[:12])[:4000]

    prompt = f"""You are a medical AI evaluation expert.

Below are excerpts from a medical research paper. Generate {num_questions} high-quality test questions and their ground-truth answers to evaluate a RAG system.

Requirements:
- Mix question types: factual, methodological, comparative, clinical implication
- Ground truths should be 1-3 sentences based strictly on the text
- Make questions specific enough that only someone who read the paper could answer correctly

Paper excerpts:
{sample_text}

Return ONLY valid JSON array, no markdown:
[
  {{"question": "...", "ground_truth": "..."}},
  ...
]"""

    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt, generation_config={"temperature": 0.3})
    raw = response.text.strip()

    # Strip markdown code fences if present
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.split("```")[0].strip()

    benchmark = json.loads(raw)

    Path(output_path).parent.mkdir(exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(benchmark, f, indent=2)

    print(f"Generated {len(benchmark)} benchmark questions → {output_path}")
    return benchmark


if __name__ == "__main__":
    generate_benchmark()
