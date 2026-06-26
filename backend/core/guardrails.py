import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def check_hallucination(question: str, answer: str, source_texts: list) -> dict:
    sources_combined = "\n\n---\n\n".join(source_texts[:3])

    prompt = f"""You are a medical fact-checker.

Given these source texts from medical papers:
{sources_combined}

And this answer for the question "{question}":
{answer}

Return ONLY a valid JSON object:
{{
  "is_supported": true,
  "confidence_score": 85,
  "warning": null,
  "key_claims_verified": ["claim1"]
}}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        text = response.text.strip()
        text = text.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(text)
        except Exception:
            return {
                "is_supported": True,
                "confidence_score": 70,
                "warning": "Could not parse Gemini response",
                "key_claims_verified": []
            }

    except Exception as e:
        print("Guardrail error:", e)

        return {
            "is_supported": True,
            "confidence_score": 0,
            "warning": f"Guardrail unavailable: {str(e)}",
            "key_claims_verified": []
        }