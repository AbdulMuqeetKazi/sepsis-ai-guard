"""Prediction request and response schemas."""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.patient_schema import PatientInput


class PredictionRequest(PatientInput):
    """Patient vitals/labs used to generate a sepsis risk assessment."""

    patient_id: str | None = Field(
        default=None,
        description="Optional patient identifier for logging and alerts",
    )


class PredictionResponse(BaseModel):
    """Structured sepsis prediction output."""

    sepsis_probability: float = Field(..., ge=0.0, le=1.0)
    risk_level: str
    prediction: int = Field(..., description="Binary prediction: 0 = non-sepsis, 1 = sepsis")
    explanation: list[str] = Field(default_factory=list)
    recommendation: str = ""
    agent_summary: dict[str, Any] = Field(default_factory=dict)
    model_version: str = "v1.0.0"
    # Supabase record IDs (null when persistence is unavailable)
    patient_uuid: str | None = Field(
        default=None, description="Supabase UUID from patients table"
    )
    vitals_id: str | None = Field(
        default=None, description="Supabase UUID from patient_vitals table"
    )
    prediction_id: str | None = Field(
        default=None, description="Supabase UUID from predictions table"
    )
    alert_id: str | None = Field(
        default=None, description="Supabase UUID from alerts table (high/critical only)"
    )


class AlertResponse(BaseModel):
    """Alert generated from a high-risk prediction."""

    alert_id: str
    patient_id: str | None = None
    risk_level: str
    sepsis_probability: float
    message: str
    created: bool = True
