"""Rule-based clinical explanation for prediction outputs."""

from typing import Any


# Clinical reference thresholds (general ICU guidance; not site-specific protocols)
THRESHOLDS = {
    "heart_rate_high": 100.0,
    "temperature_high": 38.0,
    "systolic_bp_low": 90.0,
    "map_low": 65.0,
    "spo2_low": 94.0,
    "lactate_high": 2.0,
    "wbc_low": 4.0,
    "wbc_high": 12.0,
    "creatinine_high": 1.2,
    "sofa_high": 2.0,
    "qsofa_high": 2.0,
}


def _fmt(value: float, unit: str = "") -> str:
    suffix = f" {unit}" if unit else ""
    if value == int(value):
        return f"{int(value)}{suffix}"
    return f"{value:.1f}{suffix}"


def generate_explanations(patient: dict[str, Any]) -> list[str]:
    """
    Build human-readable explanations from rule-based vital/lab checks.
    Only evaluates fields that are present in the input.
    """
    explanations: list[str] = []

    hr = patient.get("heart_rate")
    if hr is not None and hr > THRESHOLDS["heart_rate_high"]:
        explanations.append(
            f"Elevated heart rate detected ({_fmt(hr, 'bpm')}); tachycardia may indicate physiological stress."
        )

    temp = patient.get("temperature")
    if temp is not None and temp > THRESHOLDS["temperature_high"]:
        explanations.append(
            f"Elevated body temperature ({_fmt(temp, '°C')}); fever is a common sepsis-associated sign."
        )

    sbp = patient.get("systolic_bp")
    map_val = patient.get("map")
    if sbp is not None and sbp < THRESHOLDS["systolic_bp_low"]:
        explanations.append(
            f"Low systolic blood pressure ({_fmt(sbp, 'mmHg')}); may suggest hemodynamic compromise."
        )
    elif map_val is not None and map_val < THRESHOLDS["map_low"]:
        explanations.append(
            f"Low mean arterial pressure ({_fmt(map_val, 'mmHg')}); may suggest hemodynamic compromise."
        )

    spo2 = patient.get("spo2")
    if spo2 is not None and spo2 < THRESHOLDS["spo2_low"]:
        explanations.append(
            f"Low oxygen saturation ({_fmt(spo2, '%')}); hypoxemia warrants closer respiratory assessment."
        )

    lactate = patient.get("lactate")
    if lactate is not None and lactate > THRESHOLDS["lactate_high"]:
        explanations.append(
            f"Elevated lactate ({_fmt(lactate, 'mmol/L')}); associated with tissue hypoperfusion in sepsis."
        )

    wbc = patient.get("wbc_count")
    if wbc is not None and (
        wbc < THRESHOLDS["wbc_low"] or wbc > THRESHOLDS["wbc_high"]
    ):
        explanations.append(
            f"Abnormal white blood cell count ({_fmt(wbc, '×10⁹/L')}); may reflect infection or immune dysregulation."
        )

    creatinine = patient.get("creatinine")
    if creatinine is not None and creatinine > THRESHOLDS["creatinine_high"]:
        explanations.append(
            f"Elevated creatinine ({_fmt(creatinine, 'mg/dL')}); may indicate acute kidney involvement."
        )

    sofa = patient.get("sofa_score")
    if sofa is not None and sofa >= THRESHOLDS["sofa_high"]:
        explanations.append(
            f"Elevated SOFA score ({_fmt(sofa)}); suggests organ dysfunction severity."
        )

    qsofa = patient.get("qsofa_score")
    if qsofa is not None and qsofa >= THRESHOLDS["qsofa_high"]:
        explanations.append(
            f"Elevated qSOFA score ({_fmt(qsofa)}); quick sepsis screening criteria met."
        )

    return explanations
