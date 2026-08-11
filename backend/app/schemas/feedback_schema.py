"""Doctor feedback schemas for clinical outcome collection."""

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    """Clinician feedback on a prediction outcome."""

    prediction_id: str = Field(..., description="Reference to stored prediction")
    actual_result: str | bool = Field(
        ...,
        description="Confirmed clinical outcome (e.g. sepsis / no sepsis)",
    )
    doctor_comment: str | None = Field(default=None, max_length=2000)
    is_prediction_correct: bool = Field(
        ...,
        description="Whether the original prediction matched the clinical outcome",
    )


class FeedbackResponse(BaseModel):
    """Acknowledgement of received feedback."""

    status: str = "success"
    message: str
    feedback_id: str


class FeedbackRecord(BaseModel):
    """A single feedback record returned from the database."""

    id: str
    prediction_id: str
    actual_result: str | None = None
    doctor_comment: str | None = None
    is_prediction_correct: bool | None = None
    created_at: str | None = None


class FeedbackListResponse(BaseModel):
    """Response for GET /feedback listing feedback records."""

    feedback: list[FeedbackRecord]
    count: int

