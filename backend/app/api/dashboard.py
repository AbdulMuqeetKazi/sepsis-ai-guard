"""Dashboard summary endpoints."""

from fastapi import APIRouter

from app.core.config import get_settings
from app.services import supabase_service
from app.services.prediction_service import prediction_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("")
def dashboard_summary() -> dict:
    """Return high-level API and prediction statistics."""
    settings = get_settings()
    stats = supabase_service.get_dashboard_stats()

    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "model": {
            "loaded": prediction_service.is_loaded,
            "name": prediction_service.metadata.get("model_name", "unknown"),
            "version": prediction_service.metadata.get("version", "unknown"),
        },
        "stats": stats,
        "supabase_configured": settings.supabase_configured,
    }
