import json
import os

from google import genai
from google.genai import types
from app.schemas import ScreeningReport


SYSTEM_PROMPT = """You are an assistant that helps recruiters compare a resume with a job description.

Evaluate only job-related qualifications, skills, experience, and education that are explicitly supported by the supplied text.

Do not infer or evaluate protected characteristics (such as age, gender, race, religion, disability, nationality, or family status), photos, names, or other unrelated personal details.

Do not treat keyword presence as proof of competence. Use a balanced, explainable assessment. The score is an approximate relevance indicator, not a hiring decision.

Keep the report practical, concise, and grounded in the provided text. If the resume does not provide enough information, say so rather than guessing.
"""


def analyze_resume(resume_text: str, job_description: str) -> ScreeningReport:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = f"""
RESUME TEXT:
{resume_text}

JOB DESCRIPTION:
{job_description}

Analyze the resume against the job description.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=ScreeningReport,
        ),
    )

    data = json.loads(response.text)
    return ScreeningReport.model_validate(data)