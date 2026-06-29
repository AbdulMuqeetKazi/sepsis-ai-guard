"""Clinical alert endpoints."""

from fastapi import APIRouter

from app.services import supabase_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
def list_alerts(limit: int = 20) -> dict:
    """Return recent sepsis risk alerts."""
    alerts = supabase_service.get_alerts(limit=min(limit, 100))
    return {"count": len(alerts), "alerts": alerts}
