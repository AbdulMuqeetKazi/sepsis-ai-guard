"""Agent that executes ML-based sepsis prediction."""

from typing import Any

from app.services.prediction_service import PredictionService, prediction_service
from app.utils.helpers import format_model_version


class PredictionAgent:
    """Wraps the trained sepsis model for agentic orchestration."""

    name = "PredictionAgent"

    def __init__(self, service: PredictionService | None = None) -> None:
        self.service = service or prediction_service

    def run(self, patient: dict[str, Any]) -> dict[str, Any]:
        probability = self.service.predict_probability(patient)
        prediction = self.service.predict_class(probability)
        metadata = self.service.metadata

        return {
            "agent": self.name,
            "sepsis_probability": probability,
            "prediction": prediction,
            "model_name": metadata.get("model_name", "unknown"),
            "model_version": format_model_version(metadata.get("version", "1.0.0")),
        }
