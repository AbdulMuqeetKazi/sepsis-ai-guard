"""Agent that inspects patient vitals for abnormalities."""

from typing import Any

from app.services.explanation_service import THRESHOLDS


class MonitoringAgent:
    """Checks incoming vitals against clinical reference thresholds."""

    name = "MonitoringAgent"

    def run(self, patient: dict[str, Any]) -> dict[str, Any]:
        flags: list[str] = []

        hr = patient.get("heart_rate")
        if hr is not None and hr > THRESHOLDS["heart_rate_high"]:
            flags.append("tachycardia")

        temp = patient.get("temperature")
        if temp is not None and temp > THRESHOLDS["temperature_high"]:
            flags.append("fever")

        sbp = patient.get("systolic_bp")
        map_val = patient.get("map")
        if sbp is not None and sbp < THRESHOLDS["systolic_bp_low"]:
            flags.append("hypotension")
        elif map_val is not None and map_val < THRESHOLDS["map_low"]:
            flags.append("low_map")

        spo2 = patient.get("spo2")
        if spo2 is not None and spo2 < THRESHOLDS["spo2_low"]:
            flags.append("hypoxemia")

        lactate = patient.get("lactate")
        if lactate is not None and lactate > THRESHOLDS["lactate_high"]:
            flags.append("hyperlactatemia")

        wbc = patient.get("wbc_count")
        if wbc is not None and (
            wbc < THRESHOLDS["wbc_low"] or wbc > THRESHOLDS["wbc_high"]
        ):
            flags.append("abnormal_wbc")

        return {
            "agent": self.name,
            "status": "abnormal" if flags else "normal",
            "flags": flags,
            "flag_count": len(flags),
        }
