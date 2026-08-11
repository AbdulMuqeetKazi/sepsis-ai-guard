"""Clinician feedback endpoints."""

import uuid

from fastapi import APIRouter, Query

from app.agents.feedback_agent import FeedbackAgent
from app.schemas.feedback_schema import (
    FeedbackListResponse,
    FeedbackRecord,
    FeedbackRequest,
    FeedbackResponse,
)
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


@router.get("", response_model=FeedbackListResponse)
def list_feedback(
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return"),
) -> FeedbackListResponse:
    """
    Retrieve recent clinician feedback records, newest first.

    Returns up to `limit` records (default 20, max 100).
    """
    records = supabase_service.get_feedback(limit=limit)
    feedback_items = [
        FeedbackRecord(
            id=str(r.get("id", "")),
            prediction_id=str(r.get("prediction_id", "")),
            actual_result=r.get("actual_result"),
            doctor_comment=r.get("doctor_comment"),
            is_prediction_correct=r.get("is_prediction_correct"),
            created_at=r.get("created_at"),
        )
        for r in records
    ]
    return FeedbackListResponse(feedback=feedback_items, count=len(feedback_items))
