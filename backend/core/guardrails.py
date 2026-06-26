"""
Guardrails — hybrid approach:
  1. Deterministic lexical-overlap score (Jaccard similarity) — not foolable by LLM bias
  2. LLM self-check as a secondary signal only
  3. Final confidence = weighted blend of both

This avoids the "LLM grading its own homework" problem.
"""
import os
import re
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ── Deterministic helpers ─────────────────────────────────────────────────────

def _tokenize(text: str) -> set:
    """Lower-case word tokens, strip punctuation."""
    return set(re.findall(r"\b[a-z]{3,}\b", text.lower()))


def _jaccard(a: str, b: str) -> float:
    """Intersection-over-union on word tokens."""
    ta, tb = _tokenize(a), _tokenize(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _deterministic_support(answer: str, source_texts: list[str]) -> float:
    """
    Max Jaccard similarity between the answer and any source chunk.
    Score > 0.15  → answer shares substantial vocabulary with sources.
    Score < 0.05  → answer likely hallucinated (no lexical grounding).
    """
    if not source_texts:
        return 0.0
    return max(_jaccard(answer, src) for src in source_texts)


def _jaccard_to_confidence(j: float) -> int:
    """Map Jaccard [0,1] → confidence integer [0,100]."""
    # Jaccard >0.25 is very strong overlap for long texts
    return min(100, int(j * 350))


# ── LLM check (secondary signal) ─────────────────────────────────────────────

def _llm_check(question: str, answer: str, source_texts: list[str]) -> dict:
    sources_combined = "\n\n---\n\n".join(source_texts[:3])
    prompt = f"""You are a medical fact-checker. Given these source texts:
{sources_combined}

And this answer to "{question}":
{answer}

Return ONLY valid JSON:
{{
  "is_supported": true,
  "llm_confidence": 80,
  "key_claims_verified": ["claim1"]
}}
llm_confidence is 0-100. Be strict — penalise any claim not directly in the sources."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        text = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception:
        return {"is_supported": True, "llm_confidence": 50, "key_claims_verified": []}


# ── Public API ────────────────────────────────────────────────────────────────

def check_hallucination(question: str, answer: str, source_texts: list[str]) -> dict:
    """
    Returns a guardrail dict with a blended confidence score.
    Deterministic score weight = 60%, LLM score weight = 40%.
    """
    # 1. Deterministic check
    jaccard = _deterministic_support(answer, source_texts)
    det_confidence = _jaccard_to_confidence(jaccard)

    # 2. LLM check
    try:
        llm_result = _llm_check(question, answer, source_texts)
        llm_confidence = llm_result.get("llm_confidence", 50)
        is_supported = llm_result.get("is_supported", True)
        key_claims = llm_result.get("key_claims_verified", [])
    except Exception as e:
        llm_confidence = 50
        is_supported = True
        key_claims = []
        print("LLM guardrail error:", e)

    # 3. Blended score — deterministic has higher weight (more objective)
    blended = round(0.6 * det_confidence + 0.4 * llm_confidence)

    # 4. Hard override: if lexical grounding is near-zero, cap confidence at 30
    if jaccard < 0.04:
        blended = min(blended, 30)
        is_supported = False

    warning = None
    if blended < 40:
        warning = "Answer has low grounding in the source documents. Verify with original papers."
    elif blended < 60:
        warning = "Moderate confidence — cross-check key claims with source documents."

    return {
        "is_supported": is_supported,
        "confidence_score": blended,
        "lexical_overlap": round(jaccard, 3),
        "warning": warning,
        "key_claims_verified": key_claims,
    }
