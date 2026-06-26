"""
RAG Evaluation Framework — Gemini-as-Judge
==========================================
Faithfulness · Answer Relevance · Context Precision
Each metric judged by Gemini on a 1–5 scale, normalised to 0–1.
"""

import os, json, time
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from google import genai as google_genai

_client = google_genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
_MODEL  = "gemini-2.0-flash"


def _score(prompt: str, retries: int = 3) -> float:
    for attempt in range(retries):
        try:
            resp = _client.models.generate_content(
                model=_MODEL,
                contents=prompt + "\n\nRespond with ONLY a single integer from 1 to 5. No explanation.",
                config={"temperature": 0, "max_output_tokens": 4},
            )
            raw = resp.text.strip()
            val = int("".join(c for c in raw if c.isdigit())[:1])
            val = max(1, min(5, val))
            return round((val - 1) / 4, 3)
        except Exception:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return 0.5


def score_faithfulness(question: str, answer: str, contexts: list) -> float:
    ctx = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(contexts[:4]))
    return _score(f"""You are a rigorous fact-checker for medical AI.

QUESTION: {question}
RETRIEVED CONTEXT:\n{ctx}
GENERATED ANSWER: {answer}

Rate how faithfully the answer is grounded in the context.
1=major hallucinations  2=some unsupported claims  3=mostly grounded  4=well-grounded  5=fully traceable""")


def score_answer_relevance(question: str, answer: str) -> float:
    return _score(f"""You are evaluating a medical Q&A system.

QUESTION: {question}
ANSWER: {answer}

Rate how well the answer addresses the question.
1=off-topic  2=misses main point  3=partial  4=addresses it well  5=complete and direct""")


def score_context_precision(question: str, contexts: list) -> float:
    ctx = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(contexts[:4]))
    return _score(f"""You are evaluating a medical retrieval system.

QUESTION: {question}
RETRIEVED CHUNKS:\n{ctx}

Rate how relevant the retrieved chunks are to the question.
1=unrelated  2=mostly irrelevant  3=mixed  4=mostly relevant  5=highly relevant""")


def evaluate_rag(benchmark_path: str = "evaluation/benchmark.json") -> dict:
    from core.generator import answer_medical_query

    bpath = Path(benchmark_path)
    if not bpath.exists():
        raise FileNotFoundError(f"Benchmark not found at {benchmark_path}")

    with open(bpath) as f:
        benchmark = json.load(f)

    results = []
    print(f"\n{'='*55}\n RAG EVALUATION  ({len(benchmark)} questions)\n{'='*55}")

    for i, item in enumerate(benchmark):
        q = item["question"]
        print(f"\n[{i+1}/{len(benchmark)}] {q[:70]}")
        try:
            rag = answer_medical_query(q)
            answer   = rag.get("answer", "")
            contexts = [s["text_snippet"] for s in rag.get("sources", [])]
        except Exception as e:
            print(f"  RAG error: {e}")
            answer, contexts = "", []

        f_s = score_faithfulness(q, answer, contexts)
        r_s = score_answer_relevance(q, answer)
        p_s = score_context_precision(q, contexts)
        print(f"  Faith {f_s:.2f}  Rel {r_s:.2f}  Prec {p_s:.2f}")
        time.sleep(1)

        results.append({
            "question": q, "answer": answer[:400],
            "faithfulness": f_s, "answer_relevance": r_s,
            "context_precision": p_s, "sources_count": len(contexts),
        })

    agg = {
        "faithfulness":      round(sum(r["faithfulness"]      for r in results) / len(results), 3),
        "answer_relevance":  round(sum(r["answer_relevance"]  for r in results) / len(results), 3),
        "context_precision": round(sum(r["context_precision"] for r in results) / len(results), 3),
    }
    agg["overall"] = round(sum(agg.values()) / 3, 3)

    output = {"aggregate": agg, "per_question": results}
    out = Path("evaluation/results.json")
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(output, indent=2))

    print(f"\n{'='*55}\n RESULTS\n{'='*55}")
    for k, v in agg.items():
        print(f"  {k:22s} {v:.3f}  {'█'*int(v*30)}")
    return output
