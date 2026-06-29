"""Gemini-powered clinical assistant endpoints (explanations, chat, voice)."""

from fastapi import APIRouter

from app.schemas.agent_schema import (
    AgentChatRequest,
    AgentChatResponse,
    AgentContextRequest,
    AgentExplainResponse,
    AgentSummaryResponse,
)
from app.services.gemini_service import gemini_service
from app.utils.logger import logger

router = APIRouter(prefix="/agent", tags=["Clinical Agent"])


@router.post("/explain", response_model=AgentExplainResponse)
def explain_prediction(request: AgentContextRequest) -> AgentExplainResponse:
    """
    Generate a clinical explanation from ML output and vitals.

    Uses Gemini when enabled; otherwise returns a rule-based fallback.
    Does not run ML inference or modify sepsis probability.
    """
    logger.info(
        "POST /agent/explain patient_id=%s risk=%s probability=%.4f",
        request.patient_id,
        request.risk_level,
        request.sepsis_probability,
    )
    explanation, source = gemini_service.explain(
        patient_id=request.patient_id,
        risk_level=request.risk_level,
        sepsis_probability=request.sepsis_probability,
        vitals=request.vitals,
        abnormal_features=request.abnormal_features,
    )
    return AgentExplainResponse(success=True, source=source, explanation=explanation)


@router.post("/summary", response_model=AgentSummaryResponse)
def summarize_prediction(request: AgentContextRequest) -> AgentSummaryResponse:
    """
    Generate a short clinical summary for dashboard or handoff.

    Uses Gemini when enabled; otherwise returns a rule-based fallback.
    """
    logger.info(
        "POST /agent/summary patient_id=%s risk=%s probability=%.4f",
        request.patient_id,
        request.risk_level,
        request.sepsis_probability,
    )
    summary, source = gemini_service.summarize(
        patient_id=request.patient_id,
        risk_level=request.risk_level,
        sepsis_probability=request.sepsis_probability,
        vitals=request.vitals,
        abnormal_features=request.abnormal_features,
    )
    return AgentSummaryResponse(success=True, source=source, summary=summary)


@router.post("/chat", response_model=AgentChatResponse)
def agent_chat(request: AgentChatRequest) -> AgentChatResponse:
    """
    Answer scoped questions about a prediction result.

    Scope: sepsis risk, vitals, alerts, monitoring, and project help only.
    """
    ctx = request.prediction_context
    logger.info(
        "POST /agent/chat patient_id=%s risk=%s message_len=%d",
        request.patient_id,
        ctx.risk_level,
        len(request.message),
    )
    reply, source = gemini_service.chat(
        message=request.message,
        patient_id=request.patient_id,
        risk_level=ctx.risk_level,
        sepsis_probability=ctx.sepsis_probability,
        abnormal_features=ctx.abnormal_features,
    )
    return AgentChatResponse(success=True, source=source, reply=reply)


@router.post("/voice-query", response_model=AgentChatResponse)
def voice_query(request: AgentChatRequest) -> AgentChatResponse:
    """
    Spoken-friendly short answer — same scope as /agent/chat.

    Responses are kept brief for text-to-speech playback.
    """
    ctx = request.prediction_context
    logger.info(
        "POST /agent/voice-query patient_id=%s risk=%s message_len=%d",
        request.patient_id,
        ctx.risk_level,
        len(request.message),
    )
    reply, source = gemini_service.voice_query(
        message=request.message,
        patient_id=request.patient_id,
        risk_level=ctx.risk_level,
        sepsis_probability=ctx.sepsis_probability,
        abnormal_features=ctx.abnormal_features,
    )
    return AgentChatResponse(success=True, source=source, reply=reply)
