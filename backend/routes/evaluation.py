import json
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException

router = APIRouter()

RESULTS_PATH = Path("evaluation/results.json")
BENCHMARK_PATH = Path("evaluation/benchmark.json")
_running = False


@router.post("/evaluate/generate-benchmark")
def generate_benchmark_endpoint():
    """Auto-generate Q&A benchmark from indexed documents."""
    try:
        from evaluation.generate_benchmark import generate_benchmark
        items = generate_benchmark()
        return {"status": "ok", "questions_generated": len(items)}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate/run")
def run_evaluation_endpoint(background_tasks: BackgroundTasks):
    """Kick off a background evaluation run."""
    global _running
    if _running:
        raise HTTPException(status_code=409, detail="Evaluation already running.")
    if not BENCHMARK_PATH.exists():
        raise HTTPException(
            status_code=400,
            detail="No benchmark found. Call /api/evaluate/generate-benchmark first."
        )

    def _run():
        global _running
        _running = True
        try:
            from evaluation.evaluator import evaluate_rag
            evaluate_rag(str(BENCHMARK_PATH))
        finally:
            _running = False

    background_tasks.add_task(_run)
    return {"status": "started", "message": "Evaluation running in background. Poll /api/evaluate/results."}


@router.get("/evaluate/results")
def get_results():
    """Return latest evaluation results."""
    if _running:
        return {"status": "running"}
    if not RESULTS_PATH.exists():
        return {"status": "no_results"}
    with open(RESULTS_PATH) as f:
        data = json.load(f)
    return {"status": "ok", **data}


@router.get("/evaluate/benchmark")
def get_benchmark():
    """Return the current benchmark questions."""
    if not BENCHMARK_PATH.exists():
        return {"status": "no_benchmark", "questions": []}
    with open(BENCHMARK_PATH) as f:
        items = json.load(f)
    return {"status": "ok", "questions": items}
