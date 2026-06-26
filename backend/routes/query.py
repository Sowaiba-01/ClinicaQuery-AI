import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from core.generator import stream_medical_query

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query")
async def query_papers(request: QueryRequest):
    if len(request.question.strip()) < 5:
        return {"error": "Please ask a longer question"}

    def event_generator():
        try:
            for token, metadata in stream_medical_query(request.question):
                if token is not None:
                    # Stream a text token
                    yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
                else:
                    # Final metadata event (sources + guardrails)
                    yield f"data: {json.dumps({'type': 'done', **metadata})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
