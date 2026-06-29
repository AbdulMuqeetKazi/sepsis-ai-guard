"""Schemas for Gemini-powered clinical assistant endpoints."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentContextRequest(BaseModel):
    """Shared prediction context for explain and summary endpoints."""

    patient_id: str | None = Field(default=None, description="Display patient code, e.g. P001")
    risk_level: str = Field(..., description="Risk tier from the ML model")
    sepsis_probability: float = Field(..., ge=0.0, le=1.0, description="ML model probability")
    vitals: dict[str, Any] = Field(default_factory=dict, description="Selected vitals/labs only")
    abnormal_features: list[str] = Field(
        default_factory=list,
        description="Human-readable abnormal findings from monitoring",
    )


class PredictionContext(BaseModel):
    """Minimal prediction context passed to chat and voice endpoints."""

    risk_level: str
    sepsis_probability: float = Field(..., ge=0.0, le=1.0)
    abnormal_features: list[str] = Field(default_factory=list)


class AgentChatRequest(BaseModel):
    """Chat or voice query about a prediction result."""

    message: str = Field(..., min_length=1, max_length=2000)
    patient_id: str | None = None
    prediction_context: PredictionContext


class AgentExplainResponse(BaseModel):
    success: bool = True
    source: Literal["gemini", "fallback"]
    explanation: str


class AgentSummaryResponse(BaseModel):
    success: bool = True
    source: Literal["gemini", "fallback"]
    summary: str


class AgentChatResponse(BaseModel):
    success: bool = True
    source: Literal["gemini", "fallback"]
    reply: str
