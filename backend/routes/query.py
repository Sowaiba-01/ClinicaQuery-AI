from fastapi import APIRouter
from pydantic import BaseModel
from core.generator import answer_medical_query

router = APIRouter()

class QueryRequest(BaseModel):
    question: str

@router.post("/query")
async def query_papers(request: QueryRequest):
    if len(request.question.strip()) < 5:
        return {"error": "Please ask a longer question"}

    result = answer_medical_query(request.question)
    return result