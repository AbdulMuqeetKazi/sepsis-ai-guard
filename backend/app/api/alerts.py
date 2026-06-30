"""Clinical alert endpoints."""

from fastapi import APIRouter

from app.services import supabase_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
def list_alerts(limit: int = 20) -> dict:
    """Return recent sepsis risk alerts."""
    alerts = supabase_service.get_alerts(limit=min(limit, 100))
    return {"count": len(alerts), "alerts": alerts}


from pydantic import BaseModel

class AlertUpdate(BaseModel):
    status: str

@router.patch("/{alert_id}")
def update_alert(alert_id: str, alert_update: AlertUpdate) -> dict:
    """Update alert status."""
    from fastapi import HTTPException
    try:
        result = supabase_service.update_alert_status(alert_id, alert_update.status)
        if not result.get("saved"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to update alert"))
        return {
            "success": True,
            "alert_id": alert_id,
            "status": alert_update.status,
            "message": f"Alert marked as {alert_update.status}"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

