"""
Upload route — returns 202 immediately, runs ingestion in a background task.
This prevents 504 gateway timeouts on large PDFs.
"""
import os
import uuid
import struct
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from core.ingestion import ingest_pdf

router = APIRouter()

UPLOAD_DIR = "./uploaded_pdfs"
MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory task store — maps task_id → status dict
# For production scale this would be Redis; fine for single-instance deployment
_tasks: dict = {}


# ── PDF validation ────────────────────────────────────────────────────────────

def _validate_pdf_bytes(content: bytes) -> None:
    """
    Deterministic magic-byte + structure check.
    Returns an error string if invalid, None if OK.
    Does NOT rely on content-type or file extension.
    """
    # 1. PDF magic bytes
    if not content.startswith(b"%PDF-"):
        return "File is not a valid PDF (missing %PDF- header)."

    # 2. Must contain cross-reference table and EOF marker
    tail = content[-2048:]
    if b"%%EOF" not in tail:
        return "File appears to be a truncated or corrupt PDF (missing %%EOF marker)."
    if b"startxref" not in tail:
        return "File appears to be a corrupt PDF (missing startxref)."

    # 3. Bomb detection — suspiciously high object count
    # Real PDFs rarely exceed 100,000 objects; a PDF bomb inflates this
    obj_count = content.count(b" obj\n") + content.count(b" obj\r")
    if obj_count > 100_000:
        return "PDF rejected: abnormally high object count (possible PDF bomb)."

    return None


# ── Background ingestion task ─────────────────────────────────────────────────

def _run_ingestion(task_id: str, file_path: str, doc_id: str,
                   original_filename: str, size_bytes: int):
    try:
        result = ingest_pdf(
            file_path=file_path,
            doc_id=doc_id,
            original_filename=original_filename,
            size_bytes=size_bytes,
        )
        _tasks[task_id] = {"status": "done", "result": result}
    except Exception as e:
        err = str(e)
        try:
            os.remove(file_path)
        except OSError:
            pass

        if "RESOURCE_EXHAUSTED" in err or "429" in err:
            _tasks[task_id] = {
                "status": "failed",
                "error": "Gemini API quota exceeded. Please wait a few hours and try again.",
            }
        elif "UNAVAILABLE" in err:
            _tasks[task_id] = {
                "status": "failed",
                "error": "Gemini API temporarily unavailable. Please retry in a minute.",
            }
        else:
            _tasks[task_id] = {"status": "failed", "error": f"Indexing failed: {err[:300]}"}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
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

    # Strict magic-byte + structure validation (no extension/content-type trust)
    pdf_error = _validate_pdf_bytes(content)
    if pdf_error:
        raise HTTPException(status_code=400, detail=pdf_error)

    original_filename = os.path.basename(file.filename)
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{original_filename}")

    with open(file_path, "wb") as f:
        f.write(content)

    # Register task and offload to background — returns 202 immediately
    task_id = str(uuid.uuid4())
    _tasks[task_id] = {"status": "processing"}

    background_tasks.add_task(
        _run_ingestion, task_id, file_path, doc_id, original_filename, len(content)
    )

    return JSONResponse(
        status_code=202,
        content={
            "task_id": task_id,
            "status": "processing",
            "message": "PDF received. Indexing in background — poll /api/upload/status/{task_id} for progress.",
        },
    )


@router.get("/upload/status/{task_id}")
async def upload_status(task_id: str):
    task = _tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task
