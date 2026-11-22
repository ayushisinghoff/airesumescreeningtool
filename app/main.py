
import os
from pathlib import Path
from collections import defaultdict, deque
from time import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pypdf import PdfReader

from app.analyzer import analyze_resume

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_TEXT_CHARS = 40_000

app = FastAPI(
    title="AI Resume Screening Tool",
    description="Assistive resume-to-job-description analysis",
    version="1.0.0"
)

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "templates"),
    name="static"
)

# ---------------- USAGE LIMITS ----------------

request_history = defaultdict(deque)

MAX_REQUESTS_PER_MINUTE = 2
MAX_REQUESTS_PER_HOUR = 10
MAX_REQUESTS_PER_DAY = 20


def check_rate_limit(ip: str):
    now = time()
    history = request_history[ip]

    # Remove requests older than 24 hours
    while history and now - history[0] > 86400:
        history.popleft()

    # Daily limit
    if len(history) >= MAX_REQUESTS_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail="Daily screening limit reached. Try again tomorrow."
        )

    # Hourly limit
    hourly = sum(1 for t in history if now - t < 3600)

    if hourly >= MAX_REQUESTS_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail="Hourly screening limit reached. Please try again later."
        )

    # Per-minute limit
    minute = sum(1 for t in history if now - t < 60)

    if minute >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a minute."
        )

    history.append(now)


@app.get("/", response_class=HTMLResponse)
def home():
    return (
        BASE_DIR / "templates" / "index.html"
    ).read_text(encoding="utf-8")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def screen_resume(
    request: Request,
    resume: UploadFile = File(...),
    job_description: str = Form(...)
):
    # Check usage limit before using the AI API
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured. Add it to your .env file or deployment environment variables."
        )

    if not resume.filename or not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF resume."
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Please paste a job description."
        )

    if len(job_description) > MAX_TEXT_CHARS:
        raise HTTPException(
            status_code=413,
            detail="Job description is too long. Please shorten it and try again."
        )

    file_bytes = await resume.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF is empty."
        )

    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="PDF is larger than 5 MB. Please upload a smaller file."
        )

    try:
        from io import BytesIO

        reader = PdfReader(BytesIO(file_bytes))

        if len(reader.pages) > 30:
            raise HTTPException(
                status_code=413,
                detail="PDF has too many pages (limit: 30)."
            )

        resume_text = "\n".join(
            (page.extract_text() or "")
            for page in reader.pages
        ).strip()

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read this PDF. Please try another PDF file."
        )

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No selectable text was found in this PDF. Scanned/image-only PDFs are not supported yet."
        )

    if len(resume_text) > MAX_TEXT_CHARS:
        resume_text = resume_text[:MAX_TEXT_CHARS]

    try:
        report = analyze_resume(
            resume_text,
            job_description.strip()
        )
        return report.model_dump()

    except Exception as exc:
        # Avoid returning API/provider details or submitted resume content to the browser.
        print(f"Resume analysis error: {type(exc).__name__}: {exc}")

        raise HTTPException(
            status_code=502,
            detail="AI analysis failed. Check your API key and account billing/limits, then retry."
        )
