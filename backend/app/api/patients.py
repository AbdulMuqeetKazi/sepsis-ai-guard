"""Patient management endpoints (in-memory placeholder)."""

import uuid

from fastapi import APIRouter

from app.schemas.patient_schema import PatientInput, PatientRecord

router = APIRouter(prefix="/patients", tags=["Patients"])

_patients: dict[str, PatientRecord] = {}


@router.get("")
def list_patients() -> dict:
    """List registered patients."""
    return {
        "count": len(_patients),
        "patients": [p.model_dump() for p in _patients.values()],
    }


@router.post("", response_model=PatientRecord)
def register_patient(patient: PatientInput) -> PatientRecord:
    """Register a new patient profile."""
    patient_id = str(uuid.uuid4())[:8].upper()
    record = PatientRecord(patient_id=patient_id, **patient.model_dump())
    _patients[patient_id] = record
    return record


@router.get("/{patient_id}")
def get_patient(patient_id: str) -> PatientRecord:
    """Retrieve a patient by ID."""
    if patient_id not in _patients:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Patient not found")
    return _patients[patient_id]
