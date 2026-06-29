"""Placeholder agent for future clinician feedback integration."""

from typing import Any


class FeedbackAgent:
    """
    Receives and acknowledges doctor feedback on predictions.
    Full learning-loop integration is planned for a future release.
    """

    name = "FeedbackAgent"

    def run(self, feedback: dict[str, Any]) -> dict[str, Any]:
        return {
            "agent": self.name,
            "status": "received",
            "message": (
                "Feedback recorded. Model retraining pipeline will use this "
                "in a future release."
            ),
            "feedback": feedback,
        }
