"""
SepsisAI Guard — FastAPI application entry point.

Sepsis Prediction Using Machine Learning with Agentic AI
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import agent_routes, alerts, dashboard, feedback, health, patients, predict, model_metrics
from app.core.config import get_settings
from app.services.prediction_service import prediction_service
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model on startup."""
    settings = get_settings()
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    try:
        prediction_service.load_model()
        logger.info(
            "Model ready — %s v%s",
            prediction_service.metadata.get("model_name"),
            prediction_service.metadata.get("version"),
        )
    except FileNotFoundError as exc:
        logger.error("Model not found: %s", exc)
    except Exception as exc:
        logger.error("Failed to load model: %s", exc)
    yield
    logger.info("Shutting down %s", settings.app_name)


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description=(
            "SepsisAI Guard API — ML-powered sepsis risk prediction "
            "with an agentic AI orchestration layer."
        ),
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(health.router)
    app.include_router(predict.router)
    app.include_router(patients.router)
    app.include_router(alerts.router)
    app.include_router(feedback.router)
    app.include_router(dashboard.router)
    app.include_router(agent_routes.router)
    app.include_router(model_metrics.router)

    @app.get("/", tags=["Root"])
    def root() -> dict:
        return {
            "message": "SepsisAI Guard API",
            "docs": "/docs",
            "health": "/health",
            "predict": "POST /predict",
            "agent": "POST /agent/explain | /agent/summary | /agent/chat | /agent/voice-query",
        }

    return app


app = create_app()
