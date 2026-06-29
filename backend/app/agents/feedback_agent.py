"""Agent for collecting clinician feedback on predictions (audit only)."""

from typing import Any

from app.utils.logger import logger


class FeedbackAgent:
    """
    Records clinician feedback on predictions for clinical audit and quality review.
    Does not trigger model retraining.
    """

    name = "FeedbackAgent"

    def run(self, feedback: dict[str, Any]) -> dict[str, Any]:
        prediction_id = feedback.get("prediction_id")
        actual_result = feedback.get("actual_result")
        is_correct = feedback.get("is_prediction_correct")
        has_comment = bool(feedback.get("doctor_comment"))

        accuracy = "correct" if is_correct else "incorrect"
        logger.info(
            "FeedbackAgent: recorded feedback prediction_id=%s actual_result=%s "
            "prediction_%s comment_provided=%s",
            prediction_id,
            actual_result,
            accuracy,
            has_comment,
        )

        return {
            "agent": self.name,
            "status": "recorded",
            "prediction_id": prediction_id,
            "actual_result": actual_result,
            "is_prediction_correct": is_correct,
            "message": (
                f"Clinician feedback recorded — prediction marked {accuracy}. "
                "Stored for clinical audit only; the model is not retrained automatically."
            ),
        }
