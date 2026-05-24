import asyncio
import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    quizzes: list[dict] = Field(default_factory=list)
    error: str | None = None


_jobs: dict[str, Job] = {}
_queues: dict[str, asyncio.Queue] = {}


def create_job() -> Job:
    job = Job()
    _jobs[job.id] = job
    _queues[job.id] = asyncio.Queue()
    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def get_queue(job_id: str) -> asyncio.Queue | None:
    return _queues.get(job_id)


async def update_job(job_id: str, **kwargs) -> None:
    job = _jobs.get(job_id)
    if job:
        for key, value in kwargs.items():
            setattr(job, key, value)


async def push_event(job_id: str, event: dict) -> None:
    queue = _queues.get(job_id)
    if queue is not None:
        await queue.put(event)
