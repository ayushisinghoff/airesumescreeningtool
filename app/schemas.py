from pydantic import BaseModel, Field
from typing import Literal


class ScreeningReport(BaseModel):
    match_score: int = Field(ge=0, le=100, description="Estimated relevance score, 0-100")
    recommendation: Literal["Strong Match", "Potential Match", "Low Match"]
    summary: str
    matched_skills: list[str]
    missing_skills: list[str]
    strengths: list[str]
    improvement_suggestions: list[str]
    experience_relevance: str
    education_relevance: str
    interview_questions: list[str]
    disclaimer: str = "This AI-generated report is an assistive summary, not a hiring decision. Review the resume manually and evaluate candidates consistently and fairly."
