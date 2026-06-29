"""Doctor feedback schemas (placeholder for future integration)."""

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    """Clinician feedback on a prediction outcome."""

    prediction_id: str | None = Field(default=None, description="Reference to stored prediction")
    patient_id: str | None = None
    actual_sepsis: bool = Field(..., description="True if sepsis was confirmed clinically")
    comments: str | None = Field(default=None, max_length=2000)
    clinician_id: str | None = None


class FeedbackResponse(BaseModel):
    """Acknowledgement of received feedback."""

    feedback_id: str
    saved: bool
    message: str
