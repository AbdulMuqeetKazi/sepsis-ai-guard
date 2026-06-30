"""
Supabase persistence layer for SepsisAI Guard.

Loads credentials from settings. When Supabase is unavailable or not configured,
all operations fail gracefully and the API continues to work.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from app.core.config import get_settings
from app.utils.helpers import FEATURE_FIELDS
from app.utils.logger import logger

# In-memory fallbacks when Supabase is not configured
_memory_patients: dict[str, dict[str, Any]] = {}
_memory_vitals: list[dict[str, Any]] = []
_memory_predictions: list[dict[str, Any]] = []
_memory_alerts: list[dict[str, Any]] = []
_memory_agent_logs: list[dict[str, Any]] = []
_memory_feedback: list[dict[str, Any]] = []


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _failure(operation: str, exc: Exception, **extra: Any) -> dict[str, Any]:
    logger.warning("Supabase %s failed: %s", operation, exc)
    return {"saved": False, "id": None, "storage": "none", "error": str(exc), **extra}


def _memory_success(record: dict[str, Any], storage_key: str) -> dict[str, Any]:
    return {"saved": True, "id": record["id"], "storage": "memory", storage_key: record}


@lru_cache
def _get_client():
    """Return a cached Supabase client when credentials are configured."""
    settings = get_settings()
    if not settings.supabase_configured:
        logger.debug("Supabase not configured — persistence disabled")
        return None

    try:
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("Supabase client initialized")
        return client
    except ImportError:
        logger.warning("supabase package not installed")
        return None
    except Exception as exc:
        logger.warning("Supabase client initialization failed: %s", exc)
        return None


def is_configured() -> bool:
    """Whether Supabase credentials are present."""
    return get_settings().supabase_configured


def _vitals_payload(patient_id: str, vitals: dict[str, Any]) -> dict[str, Any]:
    """Build a patient_vitals row from feature fields."""
    row: dict[str, Any] = {"patient_id": patient_id}
    for field in FEATURE_FIELDS:
        if field in vitals and vitals[field] is not None:
            row[field] = vitals[field]
    return row


def create_or_get_patient(
    patient_code: str | None,
    demographics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Look up a patient by patient_code or create a new record.

    The API ``patient_id`` field (e.g. ``P001``) is stored as ``patient_code``.
    Returns the Supabase UUID as ``patient_uuid``.
    """
    demographics = demographics or {}
    code = patient_code or f"ANON-{uuid.uuid4().hex[:8].upper()}"

    client = _get_client()
    if client is None:
        if code in _memory_patients:
            patient = _memory_patients[code]
            return {
                "saved": True,
                "patient_uuid": patient["id"],
                "patient_code": code,
                "created": False,
                "storage": "memory",
            }

        patient_id = str(uuid.uuid4())
        record = {
            "id": patient_id,
            "patient_code": code,
            "age": demographics.get("age"),
            "gender": demographics.get("gender"),
            "created_at": _utc_now(),
        }
        _memory_patients[code] = record
        return {
            "saved": True,
            "patient_uuid": patient_id,
            "patient_code": code,
            "created": True,
            "storage": "memory",
        }

    try:
        existing = (
            client.table("patients")
            .select("id, patient_code")
            .eq("patient_code", code)
            .limit(1)
            .execute()
        )
        if existing.data:
            row = existing.data[0]
            logger.debug("Found existing patient %s (%s)", code, row["id"])
            return {
                "saved": True,
                "patient_uuid": row["id"],
                "patient_code": row.get("patient_code", code),
                "created": False,
                "storage": "supabase",
            }

        insert_data: dict[str, Any] = {"patient_code": code}
        if demographics.get("age") is not None:
            insert_data["age"] = demographics["age"]
        if demographics.get("gender") is not None:
            insert_data["gender"] = str(demographics["gender"])

        created = client.table("patients").insert(insert_data).execute()
        if not created.data:
            return _failure("create_or_get_patient", RuntimeError("No data returned"))

        row = created.data[0]
        logger.info("Created patient %s (%s)", code, row["id"])
        return {
            "saved": True,
            "patient_uuid": row["id"],
            "patient_code": row.get("patient_code", code),
            "created": True,
            "storage": "supabase",
        }
    except Exception as exc:
        return _failure("create_or_get_patient", exc, patient_uuid=None, patient_code=code)


def save_patient_vitals(patient_uuid: str, vitals: dict[str, Any]) -> dict[str, Any]:
    """Insert a vitals snapshot linked to a patient UUID."""
    record = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_uuid,
        "created_at": _utc_now(),
        **_vitals_payload(patient_uuid, vitals),
    }

    client = _get_client()
    if client is None:
        _memory_vitals.append(record)
        return _memory_success(record, "vitals_id")

    try:
        insert_row = _vitals_payload(patient_uuid, vitals)
        result = client.table("patient_vitals").insert(insert_row).execute()
        if not result.data:
            return _failure("save_patient_vitals", RuntimeError("No data returned"))

        vitals_id = result.data[0]["id"]
        logger.info("Saved vitals %s for patient %s", vitals_id, patient_uuid)
        return {"saved": True, "id": vitals_id, "vitals_id": vitals_id, "storage": "supabase"}
    except Exception as exc:
        logger.warning("save_patient_vitals failed — continuing without persistence")
        return _failure("save_patient_vitals", exc, vitals_id=None)


def save_prediction(
    patient_uuid: str,
    vitals_id: str | None,
    sepsis_probability: float,
    risk_level: str,
    prediction: int,
    model_version: str,
    explanation: list[str],
    recommendation: str,
) -> dict[str, Any]:
    """Persist an ML prediction result."""
    record = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_uuid,
        "vitals_id": vitals_id,
        "sepsis_probability": sepsis_probability,
        "risk_level": risk_level,
        "prediction": prediction,
        "model_version": model_version,
        "explanation": explanation,
        "recommendation": recommendation,
        "created_at": _utc_now(),
    }

    client = _get_client()
    if client is None:
        _memory_predictions.append(record)
        return _memory_success(record, "prediction_id")

    try:
        insert_row = {
            "patient_id": patient_uuid,
            "vitals_id": vitals_id,
            "sepsis_probability": sepsis_probability,
            "risk_level": risk_level,
            "prediction": prediction,
            "model_version": model_version,
            "explanation": explanation,
            "recommendation": recommendation,
        }
        result = client.table("predictions").insert(insert_row).execute()
        if not result.data:
            return _failure("save_prediction", RuntimeError("No data returned"))

        prediction_id = result.data[0]["id"]
        logger.info("Saved prediction %s for patient %s", prediction_id, patient_uuid)
        return {
            "saved": True,
            "id": prediction_id,
            "prediction_id": prediction_id,
            "storage": "supabase",
        }
    except Exception as exc:
        return _failure("save_prediction", exc, prediction_id=None)


def save_alert(
    patient_uuid: str,
    prediction_id: str,
    risk_level: str,
    sepsis_probability: float,
    severity: str,
    message: str,
) -> dict[str, Any]:
    """Persist a clinical alert for high/critical risk cases."""
    record = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_uuid,
        "prediction_id": prediction_id,
        "alert_type": "sepsis",
        "severity": severity,
        "message": message,
        "status": "open",
        "created_at": _utc_now(),
    }

    client = _get_client()
    if client is None:
        _memory_alerts.append(record)
        return _memory_success(record, "alert_id")

    try:
        # Embed risk context in message; table has no risk_level/probability columns
        full_message = (
            f"[{risk_level} | {sepsis_probability:.1%}] {message}"
            if risk_level not in message
            else message
        )
        insert_row = {
            "patient_id": patient_uuid,
            "prediction_id": prediction_id,
            "alert_type": "sepsis",
            "severity": severity,
            "message": full_message,
        }
        result = client.table("alerts").insert(insert_row).execute()
        if not result.data:
            return _failure("save_alert", RuntimeError("No data returned"))

        alert_id = result.data[0]["id"]
        logger.info("Saved alert %s for patient %s", alert_id, patient_uuid)
        return {"saved": True, "id": alert_id, "alert_id": alert_id, "storage": "supabase"}
    except Exception as exc:
        return _failure("save_alert", exc, alert_id=None)


def save_agent_log(
    patient_uuid: str | None,
    prediction_id: str | None,
    agent_name: str,
    agent_output: dict[str, Any],
) -> dict[str, Any]:
    """Persist a single agent's output for audit and debugging."""
    agent_action = agent_output.get("status") or agent_output.get("agent")
    record = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_uuid,
        "prediction_id": prediction_id,
        "agent_name": agent_name,
        "agent_action": agent_action,
        "agent_output": agent_output,
        "created_at": _utc_now(),
    }

    client = _get_client()
    if client is None:
        _memory_agent_logs.append(record)
        return _memory_success(record, "agent_log_id")

    try:
        insert_row: dict[str, Any] = {
            "prediction_id": prediction_id,
            "agent_name": agent_name,
            "agent_output": agent_output,
        }
        if agent_action:
            insert_row["agent_action"] = str(agent_action)

        result = client.table("agent_logs").insert(insert_row).execute()
        if not result.data:
            return _failure("save_agent_log", RuntimeError("No data returned"))

        log_id = result.data[0]["id"]
        logger.debug("Saved agent log %s (%s)", log_id, agent_name)
        return {"saved": True, "id": log_id, "agent_log_id": log_id, "storage": "supabase"}
    except Exception as exc:
        return _failure("save_agent_log", exc, agent_log_id=None)


def save_feedback(payload: dict[str, Any]) -> dict[str, Any]:
    """Persist clinician feedback on a prediction."""
    record = {
        "id": str(uuid.uuid4()),
        "created_at": _utc_now(),
        **payload,
    }

    client = _get_client()
    if client is None:
        _memory_feedback.append(record)
        return _memory_success(record, "feedback_id")

    try:
        insert_row = {k: v for k, v in payload.items() if v is not None}
        result = client.table("feedback").insert(insert_row).execute()
        if not result.data:
            return _failure("save_feedback", RuntimeError("No data returned"))

        feedback_id = result.data[0]["id"]
        return {"saved": True, "id": feedback_id, "feedback_id": feedback_id, "storage": "supabase"}
    except Exception as exc:
        return _failure("save_feedback", exc, feedback_id=None)


def get_alerts(limit: int = 20) -> list[dict[str, Any]]:
    """Fetch recent alerts from Supabase or in-memory store."""
    client = _get_client()
    if client is None:
        return list(reversed(_memory_alerts[-limit:]))

    try:
        result = (
            client.table("alerts")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        logger.warning("get_alerts failed: %s", exc)
        return list(reversed(_memory_alerts[-limit:]))


def get_recent_alerts(limit: int = 20) -> list[dict[str, Any]]:
    """Backward-compatible alias for get_alerts."""
    return get_alerts(limit=limit)


def update_alert_status(alert_id: str, status: str) -> dict[str, Any]:
    """Update the status of an alert in Supabase or in-memory store."""
    valid_statuses = {"open", "reviewed", "resolved"}
    if status not in valid_statuses:
        raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")

    client = _get_client()
    if client is None:
        for alert in _memory_alerts:
            if alert["id"] == alert_id:
                alert["status"] = status
                return {"saved": True, "alert_id": alert_id, "status": status, "storage": "memory"}
        return {"saved": False, "error": "Alert not found", "storage": "memory"}

    try:
        result = client.table("alerts").update({"status": status}).eq("id", alert_id).execute()
        if not result.data:
            return _failure("update_alert_status", RuntimeError("Alert not found or no data returned"))
        
        return {"saved": True, "alert_id": alert_id, "status": status, "storage": "supabase"}
    except Exception as exc:
        return _failure("update_alert_status", exc, alert_id=alert_id)


def get_dashboard_stats() -> dict[str, Any]:
    """Return summary counts for the dashboard endpoint."""
    client = _get_client()
    if client is None:
        return {
            "total_patients": len(_memory_patients),
            "total_vitals": len(_memory_vitals),
            "total_predictions": len(_memory_predictions),
            "total_alerts": len(_memory_alerts),
            "total_agent_logs": len(_memory_agent_logs),
            "total_feedback": len(_memory_feedback),
            "storage": "memory",
        }

    try:
        stats: dict[str, Any] = {"storage": "supabase"}
        for table, key in [
            ("patients", "total_patients"),
            ("patient_vitals", "total_vitals"),
            ("predictions", "total_predictions"),
            ("alerts", "total_alerts"),
            ("agent_logs", "total_agent_logs"),
            ("feedback", "total_feedback"),
        ]:
            result = client.table(table).select("id", count="exact").execute()
            stats[key] = result.count or 0
        return stats
    except Exception as exc:
        logger.warning("get_dashboard_stats failed: %s", exc)
        return {
            "total_patients": len(_memory_patients),
            "total_vitals": len(_memory_vitals),
            "total_predictions": len(_memory_predictions),
            "total_alerts": len(_memory_alerts),
            "total_agent_logs": len(_memory_agent_logs),
            "total_feedback": len(_memory_feedback),
            "storage": "memory",
        }
