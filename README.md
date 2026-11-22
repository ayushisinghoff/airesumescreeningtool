# ResumeLens — AI Resume Screening Tool

A lightweight resume-to-job-description analyzer using FastAPI, PyPDF, OpenAI, and Pydantic. It extracts selectable text from a PDF resume and returns a structured report: approximate match score, matched/missing skills, strengths, experience/education relevance, improvement suggestions, and interview questions.


## Features
- PDF resume upload (5 MB, 30 pages max)
- Job description input
- AI-generated structured report validated with Pydantic
- Responsive web UI
- Health endpoint at `/health`
- No database, Docker, or frontend build required


## Requirements
- Python 3.10+
- OpenAI API key (API usage may incur charges; ChatGPT subscription does not include API credits)


## Run locally (Windows)

1. Extract the project zip and open its folder in VS Code.
2. Open Terminal in the project root and run:

   ```powershell
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   ```
3. Open `.env` and paste your API key after `OPENAI_API_KEY=`. Do not share or upload this key.
4. Start the app:


   ```powershell
   uvicorn app.main:app --reload
   ```
5. Open http://127.0.0.1:8000 in a browser. API docs: http://127.0.0.1:8000/docs


## Deploy on Render

1. Push this folder to a GitHub repository (make sure `.env` is not committed).
2. In Render, choose **New → Web Service**, connect your repository.
3. Render detects `render.yaml` settings; if needed, set:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable `OPENAI_API_KEY` in Render's Environment settings.
5. Deploy. Open the generated service URL.


## API
`POST /api/analyze` — multipart fields:
- `resume`: PDF file
- `job_description`: text


## Limitations
- Scanned/image-only PDF files are not OCR'd yet; the PDF must contain selectable text.
- Resume and job-description text is sent to the configured AI API to produce the analysis. Avoid sending sensitive information that is not needed.
- Match scores and recommendations are estimates. This tool should support human review, not make automatic employment decisions. Apply the same criteria consistently to every candidate.
- OpenAI API calls require a funded/eligible API account and are billed separately from ChatGPT subscriptions.
