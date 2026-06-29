"""Clinician feedback endpoints."""

from fastapi import APIRouter

from app.agents.feedback_agent import FeedbackAgent
from app.schemas.feedback_schema import FeedbackRequest, FeedbackResponse
from app.services import supabase_service

router = APIRouter(prefix="/feedback", tags=["Feedback"])

_feedback_agent = FeedbackAgent()


@router.post("", response_model=FeedbackResponse)
def submit_feedback(request: FeedbackRequest) -> FeedbackResponse:
    """
    Submit clinician feedback on a prediction (placeholder for future learning loop).
    """
    agent_result = _feedback_agent.run(request.model_dump())
    save_result = supabase_service.save_feedback(
        {
            "prediction_id": request.prediction_id,
            "patient_id": request.patient_id,
            "actual_sepsis": request.actual_sepsis,
            "comments": request.comments,
            "clinician_id": request.clinician_id,
            "agent_result": agent_result,
        }
    )

    return FeedbackResponse(
        feedback_id=save_result["id"],
        saved=save_result["saved"],
        message=agent_result["message"],
    )
