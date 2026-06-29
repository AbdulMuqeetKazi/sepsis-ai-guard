# SepsisAI Guard — AI Context

> Quick reference for AI assistants and developers working on this codebase.

## Project overview

**SepsisAI Guard** is a final-year academic project that predicts sepsis risk from clinical vitals and laboratory values using machine learning, wrapped in a FastAPI backend with an agentic AI orchestration layer. Predictions can be persisted to Supabase for auditing, alerts, and future clinician feedback.

There is **no frontend** in the repository yet. The workspace root contains only the `backend/` package.

## Technologies detected

| Layer | Stack |
|-------|-------|
| Language | Python 3.11 |
| API | FastAPI, Uvicorn, Pydantic v2, pydantic-settings |
| ML | scikit-learn, XGBoost, pandas, numpy, joblib |
| Persistence | Supabase (optional; in-memory fallback) |
| Deployment | Render (`Procfile`, `render.yaml`) |
| Diagrams | Graphviz Python package (`graphviz`) |

## Folder structure summary

```text
sepsis-ai-guard/
├── docs/                         # Project documentation (this folder)
│   ├── AI_CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── CHANGELOG.md
│   ├── TODO.md
│   └── diagrams/
│       └── architecture.dot
└── backend/
    ├── app/                      # FastAPI application
    │   ├── main.py               # Entry point, CORS, lifespan
    │   ├── api/                  # REST route handlers
    │   ├── agents/               # Agentic AI layer
    │   ├── core/config.py        # Settings from .env
    │   ├── schemas/              # Pydantic request/response models
    │   ├── services/             # Business logic
    │   └── utils/                # Logging, helpers
    ├── ml/                       # Offline training pipeline
    │   ├── preprocess_data.py
    │   ├── train_model.py
    │   ├── evaluate_model.py
    │   ├── predict_test.py
    │   ├── config.py
    │   ├── data/raw|processed/
    │   ├── models/               # sepsis_model.pkl, metadata
    │   └── reports/              # metrics, confusion matrix
    ├── tests/                    # Empty (no tests yet)
    ├── requirements.txt
    ├── README.md
    ├── .env.example
    ├── Procfile
    └── render.yaml
```

## Main modules

### API (`backend/app/`)

| Module | Role |
|--------|------|
| `main.py` | Creates FastAPI app, CORS, loads ML model on startup |
| `api/predict.py` | `POST /predict` — main sepsis assessment endpoint |
| `api/health.py` | `GET /health` — API and model status |
| `api/alerts.py` | `GET /alerts` — recent clinical alerts |
| `api/dashboard.py` | `GET /dashboard` — summary statistics |
| `api/patients.py` | In-memory patient CRUD (placeholder) |
| `api/feedback.py` | Clinician feedback submission |

### Agents (`backend/app/agents/`)

| Agent | Responsibility |
|-------|----------------|
| `MonitoringAgent` | Flags abnormal vitals against clinical thresholds |
| `PredictionAgent` | Runs XGBoost inference via `PredictionService` |
| `ReasoningAgent` | Rule-based explanations + risk-tier recommendations |
| `AlertAgent` | Decides if a clinical alert is required |
| `FeedbackAgent` | Placeholder for future feedback loop |
| `AgentOrchestrator` | Coordinates agents and Supabase persistence |

### Services (`backend/app/services/`)

| Service | Role |
|---------|------|
| `prediction_service.py` | Loads `sepsis_model.pkl`, runs `predict_proba` |
| `risk_service.py` | Maps probability → risk level + safe recommendations |
| `explanation_service.py` | Rule-based clinical explanations |
| `supabase_service.py` | Patients, vitals, predictions, alerts, agent_logs |

### ML pipeline (`backend/ml/`)

| Script | Role |
|--------|------|
| `preprocess_data.py` | Harmonizes 3 raw datasets → `combined_sepsis_dataset.csv` |
| `train_model.py` | Trains LR, RF, XGBoost; saves best model (recall-first) |
| `evaluate_model.py` | Reloads model and prints test metrics |
| `predict_test.py` | CLI demo inference with sample patient |

## Important files

| File | Purpose |
|------|---------|
| `backend/ml/models/sepsis_model.pkl` | Trained sklearn Pipeline (preprocessor + XGBoost) |
| `backend/ml/models/feature_columns.pkl` | Feature column order for inference |
| `backend/ml/models/model_metadata.json` | Model name, version, metrics |
| `backend/app/core/config.py` | Paths, CORS, Supabase env vars, thresholds |
| `backend/.env` | Local secrets (not committed) |
| `backend/requirements.txt` | Python dependencies |

## Current implementation status

### Completed

- ML training pipeline on ~1.48M combined rows (3 datasets)
- Best model: **XGBoost** (selected by recall → F1 → ROC-AUC)
- FastAPI REST API with Swagger at `/docs`
- Agentic orchestration on every `/predict` call
- Supabase persistence: `patients`, `patient_vitals`, `predictions`, `agent_logs`, `alerts`
- Render deployment configuration
- Graceful degradation when Supabase is unavailable

### Partial / placeholder

- `/patients` API uses in-memory storage only
- `FeedbackAgent` acknowledges feedback but does not retrain the model
- `model_versions` Supabase table exists but is not written by the API
- `backend/tests/` folder is empty

### Not started

- Frontend application
- Automated test suite

## Known TODOs (from code)

- Integrate clinician feedback into model retraining (`FeedbackAgent`, `feedback.py`)
- Replace in-memory `/patients` endpoints with Supabase-backed storage
- Populate `model_versions` table from training pipeline

## Environment variables

See `backend/.env.example`:

- `SUPABASE_URL`, `SUPABASE_KEY` — optional persistence
- `CORS_ORIGINS` — frontend URLs for CORS
- `ALERT_PROBABILITY_THRESHOLD`, `PREDICTION_THRESHOLD` — ML thresholds

## How to run

```bash
cd backend
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs
