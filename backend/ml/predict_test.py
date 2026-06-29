"""
Demonstrate inference with a sample patient profile using the trained sepsis model.
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

import joblib
import pandas as pd

from ml.config import (
    COMMON_FEATURES,
    FEATURE_COLUMNS_PATH,
    MODEL_METADATA_PATH,
    MODEL_PATH,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def get_risk_level(probability: float) -> str:
    """Map sepsis probability to a clinical risk tier."""
    if probability <= 0.30:
        return "Low Risk"
    if probability <= 0.60:
        return "Medium Risk"
    if probability <= 0.80:
        return "High Risk"
    return "Critical Risk"


def load_model_and_metadata() -> tuple[Any, dict]:
    """Load trained pipeline and metadata."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. Run train_model first."
        )
    model = joblib.load(MODEL_PATH)

    metadata: dict = {}
    if MODEL_METADATA_PATH.exists():
        with open(MODEL_METADATA_PATH, encoding="utf-8") as f:
            metadata = json.load(f)

    return model, metadata


def get_top_input_factors(
    sample: dict[str, Any],
    feature_columns: list[str],
    top_n: int = 8,
) -> list[str]:
    """
    Return the most informative non-null input factors present in the sample.
    Clinical vitals and lab values are prioritized over demographics.
    """
    priority_order = [
        "lactate",
        "wbc_count",
        "temperature",
        "heart_rate",
        "respiratory_rate",
        "systolic_bp",
        "diastolic_bp",
        "map",
        "spo2",
        "sofa_score",
        "qsofa_score",
        "gcs_score",
        "creatinine",
        "blood_urea_nitrogen",
        "platelet_count",
        "hemoglobin",
        "shock_index",
        "glucose",
        "ph_level",
        "pao2",
        "paco2",
        "bilirubin",
        "urine_output",
        "icu_los",
        "age",
        "gender",
    ]

    available = [
        key
        for key in priority_order
        if key in feature_columns and sample.get(key) is not None
    ]
    return available[:top_n]


def build_sample_patient() -> dict[str, Any]:
    """Create a representative ICU patient profile for demo inference."""
    return {
        "age": 72,
        "gender": "Male",
        "heart_rate": 118,
        "respiratory_rate": 24,
        "temperature": 38.6,
        "systolic_bp": 92,
        "diastolic_bp": 58,
        "map": 69,
        "spo2": 91,
        "wbc_count": 14.2,
        "platelet_count": 98000,
        "hemoglobin": 10.1,
        "lactate": 3.8,
        "creatinine": 2.1,
        "blood_urea_nitrogen": 38,
        "glucose": 198,
        "sofa_score": 6,
        "qsofa_score": 2,
        "gcs_score": 13,
    }


def predict_patient(
    model: Any,
    sample: dict[str, Any],
    feature_columns: list[str],
) -> float:
    """Run inference and return sepsis probability (class 1)."""
    row = {col: sample.get(col, None) for col in feature_columns}
    input_df = pd.DataFrame([row])
    proba = model.predict_proba(input_df)[0, 1]
    return float(proba)


def run_prediction_demo() -> dict[str, Any]:
    """Execute a full demo prediction and return results."""
    model, metadata = load_model_and_metadata()

    if FEATURE_COLUMNS_PATH.exists():
        feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
    else:
        feature_columns = metadata.get("feature_columns", COMMON_FEATURES)

    sample = build_sample_patient()
    probability = predict_patient(model, sample, feature_columns)
    risk_level = get_risk_level(probability)
    version = metadata.get("version", "unknown")
    model_name = metadata.get("model_name", "unknown")
    top_factors = get_top_input_factors(sample, feature_columns)

    result = {
        "probability": probability,
        "risk_level": risk_level,
        "model_version": version,
        "model_name": model_name,
        "top_input_factors": top_factors,
        "sample_patient": sample,
    }

    print("\n" + "=" * 60)
    print("  SepsisAI Guard — Sample Prediction")
    print("=" * 60)
    print(f"  Model         : {model_name} (v{version})")
    print(f"  Probability   : {probability:.4f}")
    print(f"  Risk Level    : {risk_level}")
    print(f"  Top Factors   : {', '.join(top_factors)}")
    print("=" * 60 + "\n")

    return result


def main() -> int:
    """CLI entry point."""
    try:
        run_prediction_demo()
        return 0
    except Exception as exc:
        logger.exception("Prediction demo failed: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
