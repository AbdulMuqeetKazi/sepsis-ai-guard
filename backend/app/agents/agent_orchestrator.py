"""
Coordinates all agents for a single sepsis assessment request.
"""

from __future__ import annotations

from typing import Any

from app.agents.alert_agent import AlertAgent
from app.agents.monitoring_agent import MonitoringAgent
from app.agents.prediction_agent import PredictionAgent
from app.agents.reasoning_agent import ReasoningAgent
from app.schemas.prediction_schema import PredictionResponse
from app.services import supabase_service
from app.services.risk_service import should_escalate
from app.utils.helpers import patient_to_feature_dict
from app.utils.logger import logger


class AgentOrchestrator:
    """Runs the full agentic pipeline: monitor → predict → reason → alert → persist."""

    def __init__(self) -> None:
        self.monitoring_agent = MonitoringAgent()
        self.prediction_agent = PredictionAgent()
        self.reasoning_agent = ReasoningAgent()
        self.alert_agent = AlertAgent()

    def run(
        self,
        patient_input: Any,
        patient_id: str | None = None,
    ) -> PredictionResponse:
        patient = patient_to_feature_dict(patient_input)

        # --- Supabase: patient + vitals (non-blocking on failure) ---
        patient_uuid: str | None = None
        vitals_id: str | None = None

        patient_result = supabase_service.create_or_get_patient(
            patient_code=patient_id,
            demographics={"age": patient.get("age"), "gender": patient.get("gender")},
        )
        if patient_result.get("patient_uuid"):
            patient_uuid = patient_result["patient_uuid"]
            vitals_result = supabase_service.save_patient_vitals(patient_uuid, patient)
            vitals_id = vitals_result.get("vitals_id") or vitals_result.get("id")
        else:
            logger.warning(
                "Patient persistence skipped: %s",
                patient_result.get("error", "unknown error"),
            )

        # --- Agent pipeline ---
        monitoring = self.monitoring_agent.run(patient)
        logger.debug("MonitoringAgent: %s", monitoring)

        prediction_result = self.prediction_agent.run(patient)
        probability = prediction_result["sepsis_probability"]
        logger.debug("PredictionAgent: probability=%.4f", probability)

        reasoning = self.reasoning_agent.run(patient, probability, monitoring)
        risk_level = reasoning["risk_level"]

        alert = self.alert_agent.run(probability, risk_level, patient_id)

        agent_summary = {
            "monitoring": monitoring,
            "prediction": prediction_result,
            "reasoning": reasoning,
            "alert": alert,
        }

        # --- Supabase: prediction, agent logs, alert ---
        prediction_id: str | None = None
        alert_id: str | None = None

        if patient_uuid:
            pred_result = supabase_service.save_prediction(
                patient_uuid=patient_uuid,
                vitals_id=vitals_id,
                sepsis_probability=probability,
                risk_level=risk_level,
                prediction=prediction_result["prediction"],
                model_version=prediction_result["model_version"],
                explanation=reasoning["explanation"],
                recommendation=reasoning["recommendation"],
            )
            prediction_id = pred_result.get("prediction_id") or pred_result.get("id")

            # One agent_logs row per agent
            agent_outputs = [
                (monitoring.get("agent", "MonitoringAgent"), monitoring),
                (prediction_result.get("agent", "PredictionAgent"), prediction_result),
                (reasoning.get("agent", "ReasoningAgent"), reasoning),
                (alert.get("agent", "AlertAgent"), alert),
            ]
            for agent_name, output in agent_outputs:
                supabase_service.save_agent_log(
                    patient_uuid=patient_uuid,
                    prediction_id=prediction_id,
                    agent_name=agent_name,
                    agent_output=output,
                )

            # Alert only for High Risk or Critical Risk
            if alert.get("alert_required") and should_escalate(risk_level) and prediction_id:
                alert_result = supabase_service.save_alert(
                    patient_uuid=patient_uuid,
                    prediction_id=prediction_id,
                    risk_level=risk_level,
                    sepsis_probability=probability,
                    severity=alert.get("severity", "high"),
                    message=alert.get("message", ""),
                )
                alert_id = alert_result.get("alert_id") or alert_result.get("id")

        # Trim reasoning in agent_summary for API response (keep full in DB via agent_logs)
        agent_summary["reasoning"] = {
            "agent": reasoning["agent"],
            "risk_level": reasoning["risk_level"],
            "explanation_count": len(reasoning["explanation"]),
        }

        return PredictionResponse(
            sepsis_probability=probability,
            risk_level=risk_level,
            prediction=prediction_result["prediction"],
            explanation=reasoning["explanation"],
            recommendation=reasoning["recommendation"],
            agent_summary=agent_summary,
            model_version=prediction_result["model_version"],
            patient_uuid=patient_uuid,
            vitals_id=vitals_id,
            prediction_id=prediction_id,
            alert_id=alert_id,
        )


# Shared orchestrator instance
orchestrator = AgentOrchestrator()
