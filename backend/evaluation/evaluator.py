"""
RAG Evaluation Framework — Gemini-as-Judge
==========================================
Scores the RAG pipeline on three metrics:

  Faithfulness      — Is the answer grounded in the retrieved context?
  Answer Relevance  — Does the answer actually address the question?
  Context Precision — Are the retrieved chunks relevant to the question?

Each metric is judged by Gemini on a 1–5 scale then normalised to 0–1.
"""

import os
import json
import time
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_judge = genai.GenerativeModel("gemini-2.0-flash-lite")   # cheap model for judging


# ─── Scoring helpers ─────────────────────────────────────────────────────────

def _score(prompt: str, retries: int = 3) -> float:
    """Ask Gemini to return a single integer 1-5 and normalise to 0-1."""
    for attempt in range(retries):
        try:
            resp = _judge.generate_content(
                prompt + "\n\nRespond with ONLY a single integer from 1 to 5. No explanation.",
                generation_config={"temperature": 0, "max_output_tokens": 4},
            )
            raw = resp.text.strip()
            val = int("".join(c for c in raw if c.isdigit())[:1])
            val = max(1, min(5, val))
            return round((val - 1) / 4, 3)   # 1→0.0, 3→0.5, 5→1.0
        except Exception:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return 0.5   # fallback neutral score


def score_faithfulness(question: str, answer: str, contexts: list[str]) -> float:
    """Is every claim in the answer supported by the context (no hallucinations)?"""
    ctx = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(contexts[:4]))
    prompt = f"""You are a rigorous fact-checker for medical AI systems.

QUESTION: {question}

RETRIEVED CONTEXT:
{ctx}

GENERATED ANSWER:
{answer}

Rate how faithfully the answer is grounded in the retrieved context.
1 = answer contains major claims NOT in context (hallucinations)
2 = answer has some unsupported claims
3 = mostly supported, minor extrapolation
4 = well-grounded, tiny gaps
5 = every claim is directly traceable to the context"""
    return _score(prompt)


def score_answer_relevance(question: str, answer: str) -> float:
    """Does the answer actually address what the question asked?"""
    prompt = f"""You are evaluating a medical Q&A system.

QUESTION: {question}

ANSWER: {answer}

Rate how well the answer addresses the question.
1 = completely off-topic or refuses to answer
2 = tangentially related, misses the main point
3 = partially addresses it but incomplete
4 = addresses the question well
5 = directly and completely answers the question"""
    return _score(prompt)


def score_context_precision(question: str, contexts: list[str]) -> float:
    """Are the retrieved chunks actually relevant to the question?"""
    ctx = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(contexts[:4]))
    prompt = f"""You are evaluating a medical retrieval system.

QUESTION: {question}

RETRIEVED CHUNKS:
{ctx}

Rate how relevant the retrieved text chunks are to answering the question.
1 = chunks are completely unrelated to the question
2 = mostly irrelevant with a little useful content
3 = mixed — some relevant, some not
4 = mostly relevant content
5 = all chunks are highly relevant and useful"""
    return _score(prompt)


# ─── Main evaluation runner ───────────────────────────────────────────────────

def evaluate_rag(benchmark_path: str = "evaluation/benchmark.json") -> dict:
    """
    Run the full RAG pipeline against each benchmark question and score it.
    Returns per-question results and aggregate means.
    """
    from core.generator import answer_medical_query

    bpath = Path(benchmark_path)
    if not bpath.exists():
        raise FileNotFoundError(
            f"Benchmark not found at {benchmark_path}. "
            "Call generate_benchmark() first."
        )

    with open(bpath) as f:
        benchmark = json.load(f)

    results = []
    print(f"\n{'='*60}")
    print(f" RAG EVALUATION  ({len(benchmark)} questions)")
    print(f"{'='*60}")

    for i, item in enumerate(benchmark):
        q = item["question"]
        print(f"\n[{i+1}/{len(benchmark)}] {q[:70]}")

        try:
            rag_result = answer_medical_query(q)
            answer = rag_result.get("answer", "")
            contexts = [s["text_snippet"] for s in rag_result.get("sources", [])]
        except Exception as e:
            print(f"  RAG error: {e}")
            answer, contexts = "", []

        f_score = score_faithfulness(q, answer, contexts)
        r_score = score_answer_relevance(q, answer)
        p_score = score_context_precision(q, contexts)

        print(f"  Faithfulness: {f_score:.2f}  Relevance: {r_score:.2f}  Precision: {p_score:.2f}")
        time.sleep(1)   # be gentle with the API

        results.append({
            "question": q,
            "answer": answer[:400],
            "faithfulness": f_score,
            "answer_relevance": r_score,
            "context_precision": p_score,
            "sources_count": len(contexts),
        })

    agg = {
        "faithfulness":      round(sum(r["faithfulness"]      for r in results) / len(results), 3),
        "answer_relevance":  round(sum(r["answer_relevance"]  for r in results) / len(results), 3),
        "context_precision": round(sum(r["context_precision"] for r in results) / len(results), 3),
    }
    agg["overall"] = round(sum(agg.values()) / 3, 3)

    output = {"aggregate": agg, "per_question": results}
    out_path = Path("evaluation/results.json")
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n{'='*60}")
    print(" AGGREGATE SCORES")
    print(f"{'='*60}")
    for k, v in agg.items():
        bar = "█" * int(v * 30)
        print(f"  {k:22s} {v:.3f}  {bar}")
    print(f"{'='*60}\n")
    print(f"Results saved to {out_path}")

    return output
