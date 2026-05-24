import asyncio
import base64
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Request, UploadFile
from fastapi.responses import Response, StreamingResponse

from ...agent.graph import graph_ainvoke
from ...core import logger
from ...utils.export import export_quizzes_to_csv_bytes
from ..jobs import Job, JobStatus, create_job, get_job, get_queue, push_event, update_job
from ..limiter import limiter

router = APIRouter(tags=["quiz"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_PDF_MAGIC = b"%PDF"


async def _run_quiz_job(job_id: str, pdf_bytes: bytes) -> None:
    """Background task: run the full quiz generation pipeline and emit SSE events."""
    await update_job(job_id, status=JobStatus.PROCESSING)

    async def on_progress(message: str) -> None:
        await push_event(job_id, {"type": "progress", "message": message})

    try:
        await push_event(job_id, {"type": "progress", "message": "Starting quiz generation..."})

        b64_input = "data:application/pdf;base64," + base64.b64encode(pdf_bytes).decode()
        result = await graph_ainvoke(
            pdf_url_or_base64=b64_input,
            thread_id=f"job_{job_id}",
            progress_callback=on_progress,
        )

        state_values = result.values if hasattr(result, "values") else result
        quizzes: list[dict] = state_values.get("final_quiz", [])

        await update_job(job_id, status=JobStatus.COMPLETED, quizzes=quizzes)
        await push_event(job_id, {"type": "completed", "quizzes": quizzes})

    except Exception:
        logger.exception(f"Quiz job {job_id} failed")
        error_msg = "Quiz generation failed. Check server logs for details."
        await update_job(job_id, status=JobStatus.FAILED, error=error_msg)
        await push_event(job_id, {"type": "failed", "error": error_msg})


@router.post("/generate", status_code=202)
@limiter.limit("10/minute")
async def generate_quiz(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> dict:
    """
    Upload a PDF and start asynchronous quiz generation.
    Returns a job_id to track progress via /jobs/{job_id}/events.
    """
    pdf_bytes = await file.read()

    if len(pdf_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"PDF too large. Maximum allowed size is {_MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    if not pdf_bytes.startswith(_PDF_MAGIC):
        raise HTTPException(status_code=400, detail="Invalid file: not a valid PDF.")

    job = create_job()
    background_tasks.add_task(_run_quiz_job, job.id, pdf_bytes)

    return {"job_id": job.id, "status": job.status}


@router.get("/jobs/{job_id}", response_model=Job)
async def get_job_status(job_id: str) -> Job:
    """Poll the current status and results of a quiz generation job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.get("/jobs/{job_id}/events")
async def stream_job_events(job_id: str, request: Request) -> StreamingResponse:
    """
    Server-Sent Events stream for real-time progress updates.
    Emits: progress | completed | failed | ping events.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    queue = get_queue(job_id)

    async def event_gen() -> AsyncGenerator[str, None]:
        # If already finished (race: job done before client connected), emit final state immediately
        current = get_job(job_id)
        if current and current.status == JobStatus.COMPLETED:
            yield f"data: {json.dumps({'type': 'completed', 'quizzes': current.quizzes})}\n\n"
            return
        if current and current.status == JobStatus.FAILED:
            yield f"data: {json.dumps({'type': 'failed', 'error': current.error})}\n\n"
            return

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=2.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") in ("completed", "failed"):
                    break
            except asyncio.TimeoutError:
                # Heartbeat keeps the connection alive and guards against missed final events
                yield 'data: {"type":"ping"}\n\n'
                current = get_job(job_id)
                if current and current.status == JobStatus.COMPLETED:
                    yield f"data: {json.dumps({'type': 'completed', 'quizzes': current.quizzes})}\n\n"
                    break
                if current and current.status == JobStatus.FAILED:
                    yield f"data: {json.dumps({'type': 'failed', 'error': current.error})}\n\n"
                    break

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/jobs/{job_id}/download")
async def download_csv(job_id: str) -> Response:
    """Download the generated quiz as a CSV file."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Quiz generation is not yet complete.")
    if not job.quizzes:
        raise HTTPException(status_code=404, detail="No quizzes available for this job.")

    csv_bytes = export_quizzes_to_csv_bytes(job.quizzes)
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="quiz_{job_id[:8]}.csv"',
        },
    )
