# SepsisAI Guard — AI Context

> Quick reference for AI assistants and developers working on this codebase.

## Project overview

**SepsisAI Guard** is a final-year academic project that predicts sepsis risk from clinical vitals and laboratory values using machine learning, wrapped in a FastAPI backend with an agentic AI orchestration layer. A React + TypeScript frontend provides a complete clinical dashboard with authentication, prediction forms, and AI assistant chat. Predictions can be persisted to Supabase for auditing, alerts, and future clinician feedback.

## Technologies detected

| Layer | Stack |
|-------|-------|
| **Backend** | |
| Language | Python 3.11 |
| API | FastAPI, Uvicorn, Pydantic v2, pydantic-settings |
| ML | scikit-learn, XGBoost, pandas, numpy, joblib |
| AI Assistant | Google Gemini (google-genai; optional) |
| Persistence | Supabase (optional; in-memory fallback) |
| Deployment | Render (`Procfile`, `render.yaml`) |
| **Frontend** | |
| Language | TypeScript 5.7.3 |
| Framework | React 18.3.1, React Router DOM 7.13.0 |
| Build Tool | Vite 6.3.5 |
| Styling | Tailwind CSS 4.1.12, Radix UI components |
| Charts | Recharts 2.15.2 |
| HTTP Client | Axios 1.7.9 |
| Authentication | Firebase 11.2.0 (Google OAuth) |
| **Other** | |
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
├── frontend/                     # React + TypeScript SPA
│   ├── src/
│   │   ├── main.tsx             # React entry point
│   │   ├── app/App.tsx          # Root component with routing
│   │   ├── pages/               # 12 page components (Dashboard, Predict, Alerts, etc.)
│   │   ├── components/          # Layout, auth, UI primitives
│   │   ├── services/            # API client services (8 modules)
│   │   ├── context/             # Auth & prediction state
│   │   ├── config/              # API + Firebase configuration
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # Formatters, helpers
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── .env.example
│   └── dist/                    # Build output
└── backend/
    ├── app/                      # FastAPI application
    │   ├── main.py               # Entry point, CORS, lifespan
    │   ├── api/                  # REST route handlers (8 routers)
    │   ├── agents/               # Agentic AI layer (6 agents)
    │   ├── core/config.py        # Settings from .env
    │   ├── schemas/              # Pydantic request/response models
    │   ├── services/             # Business logic (prediction, Gemini, Supabase)
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
| `api/agent_routes.py` | Gemini assistant endpoints (`/agent/explain`, `/agent/summary`, `/agent/chat`, `/agent/voice-query`) |
| `api/model_metrics.py` | Model performance metrics |

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
| `gemini_service.py` | Optional Gemini API wrapper (explanations, summaries, chat) |
| `agent_prompt_service.py` | Gemini prompts + fallback text generation |

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

**Backend:**
- ML training pipeline on ~1.48M combined rows (3 datasets)
- Best model: **XGBoost** (selected by recall → F1 → ROC-AUC)
- FastAPI REST API with Swagger at `/docs`
- Agentic orchestration on every `/predict` call
- Supabase persistence: `patients`, `patient_vitals`, `predictions`, `agent_logs`, `alerts`
- Gemini AI assistant integration (optional; graceful fallback)
- Render deployment configuration
- Graceful degradation when Supabase is unavailable

**Frontend:**
- React + TypeScript single-page application
- 12 pages: Dashboard, New Prediction, Prediction Result, Patients, Patient History, Alerts, AI Assistant, Feedback, Model Performance, Settings, Landing, Login
- Firebase Google OAuth authentication (optional; graceful degradation)
- Complete API integration via 8 service modules
- Multi-section prediction form with clinical reference panel
- Real-time dashboard with KPIs, charts, and alerts
- Gemini AI assistant chat interface
- Responsive design with Tailwind CSS + Radix UI

### Partial / placeholder

- `/patients` API uses in-memory storage only (inconsistent with `/predict` Supabase persistence)
- `FeedbackAgent` acknowledges feedback but does not retrain the model
- `model_versions` Supabase table exists but is not written by the API
- Backend has no Firebase JWT verification (frontend sends token but backend doesn't verify)
- `backend/tests/` folder is empty
- No frontend tests

### Not started

- Automated test suite (backend and frontend)
- Frontend deployment configuration
- Backend authentication middleware

## Known TODOs (from code)

**High priority:**
- Add automated test suite (backend and frontend)
- Implement backend authentication middleware (Firebase JWT verification)
- Replace in-memory `/patients` endpoints with Supabase-backed storage

**Medium priority:**
- Configure frontend deployment (Vercel, Netlify, or Render static site)
- Integrate clinician feedback into model retraining (`FeedbackAgent`, `feedback.py`)
- Populate `model_versions` table from training pipeline

## Environment variables

**Backend** (`backend/.env.example`):
- `SUPABASE_URL`, `SUPABASE_KEY` — optional persistence
- `CORS_ORIGINS` — frontend URLs for CORS (defaults include `localhost:5173`)
- `ALERT_PROBABILITY_THRESHOLD`, `PREDICTION_THRESHOLD` — ML thresholds
- `GEMINI_API_KEY`, `ENABLE_GEMINI_AGENT`, `GEMINI_MODEL` — optional AI assistant

**Frontend** (`frontend/.env.example`):
- `VITE_API_BASE_URL` — backend API URL (defaults to `http://127.0.0.1:8000`)
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc. — optional authentication

## How to run

**Backend:**
```bash
cd backend
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173
