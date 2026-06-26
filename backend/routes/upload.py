import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from core.ingestion import ingest_pdf

router = APIRouter()

UPLOAD_DIR = "./uploaded_pdfs"
MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the 50 MB limit ({len(content) // (1024*1024)} MB received).",
        )
    if len(content) < 128:
        raise HTTPException(status_code=400, detail="File appears to be empty or corrupt.")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File does not appear to be a valid PDF.")

    original_filename = os.path.basename(file.filename)
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{original_filename}")

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        result = ingest_pdf(
            file_path=file_path,
            doc_id=doc_id,
            original_filename=original_filename,
            size_bytes=len(content),
        )
    except Exception as e:
        err = str(e)
        # Remove the uploaded file if indexing failed
        try:
            os.remove(file_path)
        except OSError:
            pass
        if "RESOURCE_EXHAUSTED" in err or "429" in err:
            raise HTTPException(
                status_code=429,
                detail="Gemini API quota exceeded. The free tier has daily embedding limits. "
                       "Please wait a few hours for your quota to reset, then try again.",
            )
        if "UNAVAILABLE" in err:
            raise HTTPException(
                status_code=503,
                detail="Gemini API is temporarily unavailable (high demand). Please try again in a minute.",
            )
        raise HTTPException(status_code=500, detail=f"Indexing failed: {err[:300]}")

    return {
        "message": "Paper uploaded and indexed successfully!",
        **result,
    }
