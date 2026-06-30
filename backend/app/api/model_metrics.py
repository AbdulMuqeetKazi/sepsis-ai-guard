import json
import os
from fastapi import APIRouter

router = APIRouter(prefix="/model", tags=["Model"])

@router.get("/metrics")
def get_model_metrics():
    """Return model performance metrics."""
    metrics_path = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "models", "model_metrics.json")
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                return json.load(f)
        except Exception as e:
            return {"error": f"Failed to load metrics: {str(e)}", "metrics_source": "Not Available"}
    return {"error": "Metrics file not found", "metrics_source": "Not Available"}
