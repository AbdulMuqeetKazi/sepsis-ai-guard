"""Patient input schemas for sepsis prediction."""

from pydantic import BaseModel, ConfigDict, Field


class PatientInput(BaseModel):
    """Optional clinical features accepted by the prediction endpoint."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
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
        }
    )

    age: float | None = None
    gender: str | None = None
    heart_rate: float | None = None
    respiratory_rate: float | None = None
    temperature: float | None = None
    systolic_bp: float | None = None
    diastolic_bp: float | None = None
    map: float | None = None
    spo2: float | None = None
    wbc_count: float | None = None
    platelet_count: float | None = None
    hemoglobin: float | None = None
    lactate: float | None = None
    creatinine: float | None = None
    bilirubin: float | None = None
    blood_urea_nitrogen: float | None = None
    glucose: float | None = None
    ph_level: float | None = None
    pao2: float | None = None
    paco2: float | None = None
    sofa_score: float | None = None
    qsofa_score: float | None = None
    gcs_score: float | None = None
    urine_output: float | None = None
    shock_index: float | None = None
    icu_los: float | None = None


class PatientRecord(PatientInput):
    """Stored patient record with identifier."""

    patient_id: str = Field(..., description="Unique patient identifier")
