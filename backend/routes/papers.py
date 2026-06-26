from fastapi import APIRouter
from core.registry import list_documents, delete_document

router = APIRouter()


@router.get("/papers")
async def get_papers():
    """Return all indexed documents with their metadata."""
    docs = list_documents()
    return {"papers": docs, "total": len(docs)}


@router.delete("/papers/{doc_id}")
async def remove_paper(doc_id: str):
    """Remove a paper from the registry (does not delete from vector store)."""
    removed = delete_document(doc_id)
    if not removed:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document removed from registry.", "doc_id": doc_id}
