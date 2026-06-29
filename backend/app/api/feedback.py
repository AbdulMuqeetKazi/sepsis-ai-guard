"""Clinician feedback endpoints."""

import uuid

from fastapi import APIRouter

from app.agents.feedback_agent import FeedbackAgent
from app.schemas.feedback_schema import FeedbackRequest, FeedbackResponse
from app.services import supabase_service
from app.utils.logger import logger

router = APIRouter(prefix="/feedback", tags=["Feedback"])

_feedback_agent = FeedbackAgent()


@router.post("", response_model=FeedbackResponse)
def submit_feedback(request: FeedbackRequest) -> FeedbackResponse:
    """
    Submit clinician feedback on a prediction outcome.

    Feedback is persisted for clinical audit. Model retraining is not triggered.
    """
    agent_result = _feedback_agent.run(request.model_dump())

    save_result = supabase_service.save_feedback(
        {
            "prediction_id": request.prediction_id,
            "actual_result": request.actual_result,
            "doctor_comment": request.doctor_comment,
            "is_prediction_correct": request.is_prediction_correct,
        }
    )

    feedback_id = save_result.get("feedback_id") or save_result.get("id")
    if save_result.get("saved") and feedback_id:
        logger.info("Feedback saved for prediction_id=%s feedback_id=%s", request.prediction_id, feedback_id)
        return FeedbackResponse(
            status="success",
            message="Feedback saved successfully",
            feedback_id=str(feedback_id),
        )

    if not feedback_id:
        feedback_id = str(uuid.uuid4())

    logger.warning(
        "Feedback accepted but not persisted for prediction_id=%s: %s",
        request.prediction_id,
        save_result.get("error", "unknown error"),
    )
    return FeedbackResponse(
        status="success",
        message=agent_result["message"],
        feedback_id=str(feedback_id),
    )
