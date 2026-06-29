"""
Application configuration loaded from environment variables.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ root (parent of app/)
BACKEND_DIR = Path(__file__).resolve().parents[2]
ML_MODELS_DIR = BACKEND_DIR / "ml" / "models"


class Settings(BaseSettings):
    """Runtime settings for the SepsisAI Guard API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SepsisAI Guard API"
    app_version: str = "1.0.0"
    debug: bool = False

    # CORS — comma-separated origins in env, e.g. http://localhost:3000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"

    # ML artifacts
    model_path: Path = ML_MODELS_DIR / "sepsis_model.pkl"
    feature_columns_path: Path = ML_MODELS_DIR / "feature_columns.pkl"
    model_metadata_path: Path = ML_MODELS_DIR / "model_metadata.json"

    # Supabase (optional)
    supabase_url: str | None = None
    supabase_key: str | None = None

    # Gemini clinical assistant (optional — explanations/chat only, not ML inference)
    gemini_api_key: str | None = None
    enable_gemini_agent: bool = False
    gemini_model: str = "gemini-2.5-flash"

    # Alert thresholds
    alert_probability_threshold: float = 0.61
    prediction_threshold: float = 0.5

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

    @property
    def gemini_enabled(self) -> bool:
        return self.enable_gemini_agent and bool(self.gemini_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
