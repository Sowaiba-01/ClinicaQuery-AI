from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.upload import router as upload_router
from routes.query import router as query_router
from routes.papers import router as papers_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Medical Research Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(query_router, prefix="/api")
app.include_router(papers_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "Medical Research Assistant is running!"}
