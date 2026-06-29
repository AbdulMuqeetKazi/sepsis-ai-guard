"""Sepsis prediction endpoint."""

from fastapi import APIRouter, HTTPException

from app.agents.agent_orchestrator import orchestrator
from app.schemas.prediction_schema import PredictionRequest, PredictionResponse
from app.services.prediction_service import prediction_service
from app.utils.logger import logger

router = APIRouter(tags=["Prediction"])


@router.post("/predict", response_model=PredictionResponse)
def predict_sepsis(request: PredictionRequest) -> PredictionResponse:
    """
    Run the agentic sepsis prediction pipeline on patient vitals/labs.

    Returns probability, risk level, explanations, and agent summary.
    """
    if not prediction_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Ensure sepsis_model.pkl exists and restart the API.",
        )

    try:
        result = orchestrator.run(request, patient_id=request.patient_id)
        logger.info(
            "Prediction complete — probability=%.4f risk=%s patient_id=%s",
            result.sepsis_probability,
            result.risk_level,
            request.patient_id,
        )
        return result
    except RuntimeError as exc:
        logger.exception("Prediction runtime error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected prediction error")
        raise HTTPException(status_code=500, detail="Prediction failed") from exc
