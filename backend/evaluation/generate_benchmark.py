import os, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv()

from google import genai as google_genai
_client = google_genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def generate_benchmark(num_questions: int = 8, output_path: str = "evaluation/benchmark.json") -> list:
    from vectorstore.chroma_store import get_vector_store
    vector_store, _ = get_vector_store()
    data = vector_store._collection.get(limit=15, include=["documents"])
    docs = data.get("documents") or []
    if not docs:
        raise RuntimeError("No documents indexed. Upload a PDF first.")

    sample = "\n\n---\n\n".join(docs[:12])[:4000]
    prompt = f"""You are a medical AI evaluation expert.

Generate {num_questions} high-quality test questions and ground-truth answers from these paper excerpts.
Mix question types: factual, methodological, clinical implication, limitations.
Ground truths must be based strictly on the text (1-3 sentences).

Paper excerpts:
{sample}

Return ONLY a valid JSON array, no markdown:
[{{"question":"...","ground_truth":"..."}},...]"""

    resp = _client.models.generate_content(model="gemini-2.0-flash", contents=prompt,
                                            config={"temperature": 0.3})
    raw = resp.text.strip()
    if "```" in raw:
        raw = raw.split("```")[1]; raw = raw[4:] if raw.startswith("json") else raw
        raw = raw.split("```")[0].strip()

    benchmark = json.loads(raw)
    Path(output_path).parent.mkdir(exist_ok=True)
    Path(output_path).write_text(json.dumps(benchmark, indent=2))
    print(f"Generated {len(benchmark)} questions → {output_path}")
    return benchmark


if __name__ == "__main__":
    generate_benchmark()
