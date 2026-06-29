"""Health check endpoints."""

from fastapi import APIRouter

from app.core.config import get_settings
from app.services.prediction_service import prediction_service

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check() -> dict:
    """Return API and model health status."""
    settings = get_settings()
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "model_loaded": prediction_service.is_loaded,
        "model_name": prediction_service.metadata.get("model_name", "unknown"),
        "model_version": prediction_service.metadata.get("version", "unknown"),
        "supabase_configured": settings.supabase_configured,
    }
