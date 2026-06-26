
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes.upload import router as upload_router
from routes.query import router as query_router
from routes.papers import router as papers_router
from routes.evaluation import router as evaluation_router
from dotenv import load_dotenv

load_dotenv()

BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up ChromaDB singleton — one connection, held for the process lifetime
    from vectorstore.chroma_store import get_chroma_client
    get_chroma_client()
    print("[startup] ChromaDB client initialised")
    yield
    print("[shutdown] Shutting down")


app = FastAPI(title="Medical Research Assistant API", lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────────────────────
allowed_origins = [
    "http://localhost:3000",
    "https://med-research-ai.vercel.app",
    os.getenv("FRONTEND_URL", ""),
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in allowed_origins if o],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API key auth middleware ───────────────────────────────────────────────────
@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """
    Validate X-API-Key on all /api/* routes.
    Requests without a valid key cannot upload files, run queries,
    or exhaust the Gemini quota — even if they know the backend URL.

    Skip check if BACKEND_API_KEY is not configured (local dev fallback).
    """
    if BACKEND_API_KEY and request.url.path.startswith("/api/"):
        key = request.headers.get("X-API-Key", "")
        if key != BACKEND_API_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized: invalid or missing API key."},
            )
    return await call_next(request)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(upload_router, prefix="/api")
app.include_router(query_router, prefix="/api")
app.include_router(papers_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "Medical Research Assistant is running!"}
