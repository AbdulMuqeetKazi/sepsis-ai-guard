"""Gemini API integration for clinical decision-support text generation."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.core.config import get_settings
from app.services import agent_prompt_service
from app.utils.logger import logger


class GeminiService:
    """
    Wraps the official google-genai SDK.

    Used only for explanations, summaries, and chat — never for ML inference.
    """

    def __init__(self) -> None:
        self._client: Any | None = None
        self._client_initialized = False

    @property
    def is_available(self) -> bool:
        settings = get_settings()
        return settings.gemini_enabled

    def _get_client(self) -> Any | None:
        if self._client_initialized:
            return self._client

        self._client_initialized = True
        settings = get_settings()

        if not settings.gemini_enabled:
            logger.debug("Gemini agent disabled or API key missing")
            return None

        try:
            from google import genai

            self._client = genai.Client(api_key=settings.gemini_api_key)
            logger.info("Gemini client initialized (model=%s)", settings.gemini_model)
            return self._client
        except ImportError:
            logger.warning("google-genai package not installed — Gemini features use fallback")
            return None
        except Exception as exc:
            logger.warning("Gemini client initialization failed: %s", exc)
            return None

    def generate_text(
        self,
        user_prompt: str,
        *,
        max_output_tokens: int = 512,
        temperature: float = 0.2,
    ) -> str | None:
        """Call Gemini generate_content. Returns None on failure or when disabled."""
        client = self._get_client()
        if client is None:
            return None

        settings = get_settings()
        try:
            from google.genai import types

            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=agent_prompt_service.SYSTEM_INSTRUCTION,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                ),
            )
            text = getattr(response, "text", None)
            if text and text.strip():
                logger.debug("Gemini response received (%d chars)", len(text.strip()))
                return text.strip()
            logger.warning("Gemini returned empty response")
            return None
        except Exception as exc:
            logger.warning("Gemini generate_content failed: %s", exc)
            return None

    def explain(
        self,
        *,
        patient_id: str | None,
        risk_level: str,
        sepsis_probability: float,
        vitals: dict[str, Any],
        abnormal_features: list[str],
    ) -> tuple[str, str]:
        prompt = agent_prompt_service.build_explain_prompt(
            patient_id=patient_id,
            risk_level=risk_level,
            sepsis_probability=sepsis_probability,
            vitals=vitals,
            abnormal_features=abnormal_features,
        )
        text = self.generate_text(prompt, max_output_tokens=512)
        if text:
            return text, "gemini"
        return (
            agent_prompt_service.fallback_explanation(
                risk_level=risk_level,
                sepsis_probability=sepsis_probability,
                vitals=vitals,
                abnormal_features=abnormal_features,
            ),
            "fallback",
        )

    def summarize(
        self,
        *,
        patient_id: str | None,
        risk_level: str,
        sepsis_probability: float,
        vitals: dict[str, Any],
        abnormal_features: list[str],
    ) -> tuple[str, str]:
        prompt = agent_prompt_service.build_summary_prompt(
            patient_id=patient_id,
            risk_level=risk_level,
            sepsis_probability=sepsis_probability,
            vitals=vitals,
            abnormal_features=abnormal_features,
        )
        text = self.generate_text(prompt, max_output_tokens=256)
        if text:
            return text, "gemini"
        return (
            agent_prompt_service.fallback_summary(
                patient_id=patient_id,
                risk_level=risk_level,
                sepsis_probability=sepsis_probability,
                abnormal_features=abnormal_features,
            ),
            "fallback",
        )

    def chat(
        self,
        *,
        message: str,
        patient_id: str | None,
        risk_level: str,
        sepsis_probability: float,
        abnormal_features: list[str],
    ) -> tuple[str, str]:
        if not agent_prompt_service.is_in_scope(message):
            return agent_prompt_service.OUT_OF_SCOPE_REPLY, "fallback"

        prompt = agent_prompt_service.build_chat_prompt(
            message=message,
            patient_id=patient_id,
            risk_level=risk_level,
            sepsis_probability=sepsis_probability,
            abnormal_features=abnormal_features,
        )
        text = self.generate_text(prompt, max_output_tokens=400)
        if text:
            return text, "gemini"
        return (
            agent_prompt_service.fallback_chat_reply(
                message=message,
                patient_id=patient_id,
                risk_level=risk_level,
                sepsis_probability=sepsis_probability,
                abnormal_features=abnormal_features,
            ),
            "fallback",
        )

    def voice_query(
        self,
        *,
        message: str,
        patient_id: str | None,
        risk_level: str,
        sepsis_probability: float,
        abnormal_features: list[str],
    ) -> tuple[str, str]:
        if not agent_prompt_service.is_in_scope(message):
            return agent_prompt_service.OUT_OF_SCOPE_REPLY, "fallback"

        prompt = agent_prompt_service.build_voice_prompt(
            message=message,
            patient_id=patient_id,
            risk_level=risk_level,
            sepsis_probability=sepsis_probability,
            abnormal_features=abnormal_features,
        )
        text = self.generate_text(prompt, max_output_tokens=160, temperature=0.1)
        if text:
            return text, "gemini"
        return (
            agent_prompt_service.fallback_voice_reply(
                message=message,
                patient_id=patient_id,
                risk_level=risk_level,
                sepsis_probability=sepsis_probability,
                abnormal_features=abnormal_features,
            ),
            "fallback",
        )


@lru_cache
def get_gemini_service() -> GeminiService:
    return GeminiService()


gemini_service = get_gemini_service()
