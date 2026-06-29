"""Clinical prompts and rule-based fallbacks for the Gemini assistant."""

from __future__ import annotations

from typing import Any

from app.services.explanation_service import generate_explanations
from app.services.risk_service import get_recommendation, should_escalate

OUT_OF_SCOPE_REPLY = (
    "I can only help with sepsis prediction results, patient risk explanation, "
    "clinical summaries, alerts, and monitoring support."
)

SYSTEM_INSTRUCTION = """You are SepsisAI Guard, a clinical decision-support assistant for sepsis risk assessment.

STRICT RULES — you MUST follow all of these:
- Do NOT diagnose the patient or state that the patient definitely has sepsis.
- Do NOT prescribe medicine, dosages, or specific treatment commands.
- Do NOT override or recalculate sepsis probability or risk level — treat the provided ML output as fixed.
- Explain ONLY using the vitals, risk level, probability, abnormal features, and model output given in the prompt.
- Always state that a qualified doctor or clinician must review the case.
- Keep answers short, clear, and professional.
- For High Risk or Critical Risk, recommend urgent clinical review.
- This is decision support only, not a substitute for clinical judgment.

SCOPE — answer ONLY about:
- sepsis prediction results, risk explanation, abnormal vitals, patient summary
- risk level meaning, monitoring suggestions, alert explanation, feedback explanation
- SepsisAI Guard project help

If a question is outside this scope, reply exactly:
"I can only help with sepsis prediction results, patient risk explanation, clinical summaries, alerts, and monitoring support."
"""

_IN_SCOPE_KEYWORDS = (
    "sepsis",
    "risk",
    "critical",
    "high risk",
    "medium risk",
    "low risk",
    "probability",
    "vital",
    "heart rate",
    "temperature",
    "lactate",
    "oxygen",
    "spo2",
    "blood pressure",
    "alert",
    "monitor",
    "monitoring",
    "prediction",
    "predict",
    "feedback",
    "summary",
    "explain",
    "patient",
    "abnormal",
    "model",
    "guard",
    "sepsisai",
    "help",
    "why",
    "what",
    "how",
    "meaning",
    "result",
    "score",
    "wbc",
    "creatinine",
    "sofa",
    "qsofa",
)


def is_in_scope(message: str) -> bool:
    """Return True when the user message is within the clinical assistant scope."""
    text = message.lower().strip()
    if not text:
        return False
    return any(keyword in text for keyword in _IN_SCOPE_KEYWORDS)


def _format_probability(probability: float) -> str:
    return f"{probability:.0%}"


def _format_vitals(vitals: dict[str, Any]) -> str:
    if not vitals:
        return "No vitals provided."
    parts = [f"{key}: {value}" for key, value in vitals.items() if value is not None]
    return ", ".join(parts) if parts else "No vitals provided."


def _format_abnormal_features(features: list[str]) -> str:
    if not features:
        return "None listed."
    return "; ".join(features)


def _clinical_review_note(risk_level: str) -> str:
    note = "A qualified clinician must review this case."
    if should_escalate(risk_level):
        note += " Urgent clinical review is recommended."
    return note


def build_explain_prompt(
    *,
    patient_id: str | None,
    risk_level: str,
    sepsis_probability: float,
    vitals: dict[str, Any],
    abnormal_features: list[str],
) -> str:
    patient_label = patient_id or "unknown patient"
    return f"""Provide a concise clinical explanation for this sepsis risk assessment.

Patient ID: {patient_label}
ML sepsis probability: {_format_probability(sepsis_probability)} (fixed — do not change)
ML risk level: {risk_level} (fixed — do not change)
Vitals: {_format_vitals(vitals)}
Abnormal features: {_format_abnormal_features(abnormal_features)}

Write 3–5 sentences explaining why the model output may reflect the current findings.
Do not diagnose. End with a clinician review reminder."""


def build_summary_prompt(
    *,
    patient_id: str | None,
    risk_level: str,
    sepsis_probability: float,
    vitals: dict[str, Any],
    abnormal_features: list[str],
) -> str:
    patient_label = patient_id or "unknown patient"
    return f"""Provide a brief clinical summary for handoff or dashboard display.

Patient ID: {patient_label}
ML sepsis probability: {_format_probability(sepsis_probability)} (fixed — do not change)
ML risk level: {risk_level} (fixed — do not change)
Vitals: {_format_vitals(vitals)}
Abnormal features: {_format_abnormal_features(abnormal_features)}

Write 2–4 sentences. Do not diagnose or prescribe. Mention clinician review."""


def build_chat_prompt(
    *,
    message: str,
    patient_id: str | None,
    risk_level: str,
    sepsis_probability: float,
    abnormal_features: list[str],
) -> str:
    patient_label = patient_id or "unknown patient"
    return f"""Answer the clinician's question using ONLY the context below.

Patient ID: {patient_label}
ML sepsis probability: {_format_probability(sepsis_probability)} (fixed — do not change)
ML risk level: {risk_level} (fixed — do not change)
Abnormal features: {_format_abnormal_features(abnormal_features)}

Question: {message}

Keep the answer concise (2–5 sentences). Do not diagnose or prescribe."""


def build_voice_prompt(
    *,
    message: str,
    patient_id: str | None,
    risk_level: str,
    sepsis_probability: float,
    abnormal_features: list[str],
) -> str:
    patient_label = patient_id or "unknown patient"
    return f"""Answer for text-to-speech playback. Use plain spoken language.

Patient ID: {patient_label}
ML sepsis probability: {_format_probability(sepsis_probability)} (fixed — do not change)
ML risk level: {risk_level} (fixed — do not change)
Abnormal features: {_format_abnormal_features(abnormal_features)}

Question: {message}

Reply in at most 3 short sentences. No lists, no markdown, no dosage or treatment orders."""


def fallback_explanation(
    *,
    risk_level: str,
    sepsis_probability: float,
    vitals: dict[str, Any],
    abnormal_features: list[str],
) -> str:
    parts = [
        (
            f"The ML model reports a {_format_probability(sepsis_probability)} sepsis probability, "
            f"classified as {risk_level}. This is decision support only and does not confirm sepsis."
        )
    ]

    if abnormal_features:
        parts.append(f"Notable findings: {_format_abnormal_features(abnormal_features)}.")
    elif vitals:
        rule_explanations = generate_explanations(vitals)
        if rule_explanations:
            parts.append(" ".join(rule_explanations))

    parts.append(get_recommendation(risk_level))
    parts.append(_clinical_review_note(risk_level))
    return " ".join(parts)


def fallback_summary(
    *,
    patient_id: str | None,
    risk_level: str,
    sepsis_probability: float,
    abnormal_features: list[str],
) -> str:
    patient_label = patient_id or "Patient"
    feature_text = (
        f" Key concerns: {_format_abnormal_features(abnormal_features)}."
        if abnormal_features
        else ""
    )
    escalation = (
        " Urgent clinical review is advised."
        if should_escalate(risk_level)
        else " Continue monitoring per local protocol."
    )
    return (
        f"{patient_label}: ML sepsis probability {_format_probability(sepsis_probability)}, "
        f"{risk_level}.{feature_text}{escalation} Clinician review required."
    )


def fallback_chat_reply(
    *,
    message: str,
    patient_id: str | None,
    risk_level: str,
    sepsis_probability: float,
    abnormal_features: list[str],
) -> str:
    if not is_in_scope(message):
        return OUT_OF_SCOPE_REPLY

    patient_label = patient_id or "This patient"
    feature_text = (
        f" Abnormal findings include {_format_abnormal_features(abnormal_features)}."
        if abnormal_features
        else ""
    )
    return (
        f"{patient_label} has an ML sepsis probability of {_format_probability(sepsis_probability)} "
        f"with a {risk_level} classification.{feature_text} "
        f"{get_recommendation(risk_level)} {_clinical_review_note(risk_level)}"
    )


def fallback_voice_reply(
    *,
    message: str,
    patient_id: str | None,
    risk_level: str,
    sepsis_probability: float,
    abnormal_features: list[str],
) -> str:
    if not is_in_scope(message):
        return OUT_OF_SCOPE_REPLY

    patient_label = patient_id or "The patient"
    prob = _format_probability(sepsis_probability)
    if should_escalate(risk_level):
        return (
            f"{patient_label} is {risk_level} with a {prob} sepsis probability. "
            "Please arrange urgent clinical review."
        )
    return (
        f"{patient_label} is {risk_level} with a {prob} sepsis probability. "
        "A clinician should review the case."
    )
