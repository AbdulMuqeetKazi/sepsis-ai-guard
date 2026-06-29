"""Shared helper utilities."""

from typing import Any

# Feature fields accepted by the ML model (excludes API-only fields like patient_id)
FEATURE_FIELDS = {
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
}


def format_model_version(version: str) -> str:
    """Ensure model version is prefixed with 'v'."""
    version = version.strip()
    if not version:
        return "v1.0.0"
    return version if version.startswith("v") else f"v{version}"


def patient_to_feature_dict(patient: Any) -> dict[str, Any]:
    """Convert a Pydantic patient model to a plain feature dictionary."""
    data = patient.model_dump(exclude_none=False)
    return {
        k: v
        for k, v in data.items()
        if k in FEATURE_FIELDS and v is not None
    }


def safe_round(value: float, decimals: int = 4) -> float:
    return round(float(value), decimals)
