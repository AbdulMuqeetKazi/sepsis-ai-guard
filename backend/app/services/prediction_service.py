"""ML model loading and inference service."""

from __future__ import annotations

import json
from typing import Any

import joblib
import pandas as pd

from app.core.config import Settings, get_settings
from app.utils.helpers import safe_round
from app.utils.logger import logger

# Default feature order matches training pipeline
DEFAULT_FEATURES = [
    "age",
    "gender",
    "heart_rate",
    "respiratory_rate",
    "temperature",
    "systolic_bp",
    "diastolic_bp",
    "map",
    "spo2",
    "wbc_count",
    "platelet_count",
    "hemoglobin",
    "lactate",
    "creatinine",
    "bilirubin",
    "blood_urea_nitrogen",
    "glucose",
    "ph_level",
    "pao2",
    "paco2",
    "sofa_score",
    "qsofa_score",
    "gcs_score",
    "urine_output",
    "shock_index",
    "icu_los",
]


class PredictionService:
    """Singleton-style service that loads the sepsis model once at startup."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._model: Any = None
        self._feature_columns: list[str] = []
        self._metadata: dict[str, Any] = {}
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def metadata(self) -> dict[str, Any]:
        return self._metadata

    @property
    def feature_columns(self) -> list[str]:
        return self._feature_columns

    def load_model(self) -> None:
        """Load model pipeline, feature columns, and metadata from disk."""
        model_path = self.settings.model_path
        if not model_path.exists():
            raise FileNotFoundError(
                f"Sepsis model not found at {model_path}. "
                "Run `python -m ml.train_model` first."
            )

        try:
            self._model = joblib.load(model_path)
            logger.info("Loaded sepsis model from %s", model_path)
        except Exception as exc:
            raise RuntimeError(f"Failed to load model: {exc}") from exc

        feature_path = self.settings.feature_columns_path
        if feature_path.exists():
            self._feature_columns = list(joblib.load(feature_path))
        else:
            self._feature_columns = DEFAULT_FEATURES.copy()
            logger.warning("feature_columns.pkl not found; using default feature list")

        metadata_path = self.settings.model_metadata_path
        if metadata_path.exists():
            with open(metadata_path, encoding="utf-8") as f:
                self._metadata = json.load(f)
        else:
            self._metadata = {"version": "1.0.0", "model_name": "unknown"}

        self._loaded = True

    def predict_probability(self, patient_features: dict[str, Any]) -> float:
        """Run inference and return P(sepsis=1)."""
        if not self._loaded or self._model is None:
            raise RuntimeError("Model not loaded. Call load_model() during startup.")

        row = {col: patient_features.get(col) for col in self._feature_columns}
        input_df = pd.DataFrame([row])

        try:
            proba = float(self._model.predict_proba(input_df)[0, 1])
        except Exception as exc:
            logger.exception("Prediction failed")
            raise RuntimeError(f"Inference error: {exc}") from exc

        return safe_round(proba)

    def predict_class(self, probability: float) -> int:
        """Binary class from probability using configured threshold."""
        return int(probability >= self.settings.prediction_threshold)


# Module-level singleton used by agents and API routes
prediction_service = PredictionService()
