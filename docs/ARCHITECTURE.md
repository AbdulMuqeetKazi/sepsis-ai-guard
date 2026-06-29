# SepsisAI Guard — Architecture

## High-level architecture

SepsisAI Guard is a **backend-only** system with two major subsystems:

1. **ML training pipeline** — offline scripts that preprocess data, train models, and export artifacts.
2. **FastAPI inference API** — online service that loads the trained model, runs an agentic assessment pipeline, and optionally persists results to Supabase.

A future frontend (not in repo) is expected to call the REST API. CORS is pre-configured for `localhost:3000` and `localhost:5173`.

```
┌─────────────┐     HTTP/JSON      ┌──────────────────┐     SQL/REST     ┌───────────┐
│  Frontend   │ ─────────────────► │  FastAPI Backend │ ───────────────► │ Supabase  │
│  (planned)  │ ◄───────────────── │  (app/)          │ ◄─────────────── │ PostgreSQL│
└─────────────┘                    └────────┬─────────┘                  └───────────┘
                                            │
                                            │ joblib load
                                            ▼
                                   ┌──────────────────┐
                                   │ sepsis_model.pkl │
                                   │ (XGBoost pipeline)│
                                   └──────────────────┘
```

## Components

### 1. API layer (`app/api/`)

Thin route handlers that validate input via Pydantic schemas and delegate to services or the orchestrator.

| Endpoint | Handler | Description |
|----------|---------|-------------|
| `GET /health` | `health.py` | API + model health |
| `POST /predict` | `predict.py` | Full sepsis assessment |
| `GET /alerts` | `alerts.py` | Recent alerts |
| `GET /dashboard` | `dashboard.py` | Aggregate stats |
| `POST /feedback` | `feedback.py` | Clinician feedback |
| `GET/POST /patients` | `patients.py` | In-memory patient registry |

### 2. Agentic AI layer (`app/agents/`)

Each `/predict` request flows through `AgentOrchestrator`:

```
Request → create/get patient (Supabase)
       → save vitals (Supabase)
       → MonitoringAgent
       → PredictionAgent (ML)
       → ReasoningAgent (rules + recommendations)
       → AlertAgent
       → save prediction, agent_logs, alert (Supabase)
       → Response
```

Agents are **rule-based and deterministic** — no external LLM or paid API calls.

### 3. Service layer (`app/services/`)

| Service | Concern |
|---------|---------|
| `PredictionService` | Model loading, feature alignment, inference |
| `RiskService` | Probability → Low/Medium/High/Critical + safe text |
| `ExplanationService` | Clinical threshold rules (HR, temp, BP, lactate, etc.) |
| `SupabaseService` | Database CRUD with in-memory fallback |

### 4. ML subsystem (`ml/`)

Offline pipeline, independent of the running API:

```
Raw datasets (3 sources)
    → preprocess_data.py (harmonize features, combine, dedupe)
    → combined_sepsis_dataset.csv
    → train_model.py (LR, RF, XGBoost comparison)
    → sepsis_model.pkl + metadata + reports
```

**Model selection criteria (healthcare-oriented):** Recall → F1 → ROC-AUC.

**Features:** 26 common clinical fields (age, gender, vitals, labs, scores).

**Preprocessor:** `ColumnTransformer` with median imputation + scaling (numeric) and one-hot encoding (categorical).

## Data flow — `POST /predict`

1. **Client** sends JSON with optional `patient_id` (e.g. `"P001"`) and clinical fields.
2. **Pydantic** validates via `PredictionRequest` / `PatientInput`.
3. **Orchestrator** converts input to feature dict (excludes `patient_id` from ML features).
4. **Supabase** (if configured):
   - `patients` — `patient_id` → `patient_code`; returns UUID
   - `patient_vitals` — snapshot of submitted vitals/labs
5. **MonitoringAgent** — checks vitals against thresholds; returns flags.
6. **PredictionAgent** — `model.predict_proba()` → sepsis probability.
7. **ReasoningAgent** — builds explanation list + recommendation text.
8. **AlertAgent** — escalates High/Critical risk.
9. **Supabase** (if patient UUID available):
   - `predictions` — probability, risk, explanation, recommendation
   - `agent_logs` — one row per agent (4 rows)
   - `alerts` — only for High/Critical risk
10. **Response** — `PredictionResponse` with probability, risk level, explanations, agent summary, and record IDs.

If Supabase fails at any step, the API logs a warning and still returns the prediction.

## Backend / frontend interaction

| Aspect | Current state |
|--------|---------------|
| Frontend | Not implemented |
| API format | JSON over HTTP |
| CORS | Configurable via `CORS_ORIGINS` |
| Auth | None (not implemented) |
| Primary contract | `POST /predict` |

Expected frontend integration: submit patient vitals, display risk level, explanations, and alert status using returned `patient_uuid` / `prediction_id` for follow-up actions.

## Database (Supabase)

PostgreSQL via Supabase REST API. Tables in use:

| Table | Written by | Purpose |
|-------|------------|---------|
| `patients` | `/predict` | `patient_code` + demographics |
| `patient_vitals` | `/predict` | Vitals/labs snapshot |
| `predictions` | `/predict` | ML output + explanations |
| `agent_logs` | `/predict` | Per-agent audit trail |
| `alerts` | `/predict` | High/Critical escalations |
| `feedback` | `/feedback` | Clinician feedback |
| `model_versions` | — | Not yet integrated |

Credentials: `SUPABASE_URL` + `SUPABASE_KEY` in `backend/.env`.

## ML components

| Artifact | Location |
|----------|----------|
| Trained model | `backend/ml/models/sepsis_model.pkl` |
| Feature list | `backend/ml/models/feature_columns.pkl` |
| Metadata | `backend/ml/models/model_metadata.json` |
| Training reports | `backend/ml/reports/` |

**Inference path:** `PredictionService` loads the pickle at API startup (`lifespan` in `main.py`). The pipeline applies the same preprocessing used during training before XGBoost classification.

**Risk tiers:**

| Probability | Level |
|-------------|-------|
| 0.00 – 0.30 | Low Risk |
| 0.31 – 0.60 | Medium Risk |
| 0.61 – 0.80 | High Risk |
| 0.81 – 1.00 | Critical Risk |

## Deployment

- **Local:** `uvicorn app.main:app --reload` from `backend/`
- **Render:** `Procfile` + `render.yaml`; start command uses `$PORT`
- **Secrets:** Set via Render dashboard or `.env` locally

## Architecture diagram

Source: [`diagrams/architecture.dot`](diagrams/architecture.dot)

Render to PNG (requires Graphviz desktop app installed):

```bash
dot -Tpng docs/diagrams/architecture.dot -o docs/diagrams/architecture.png
```
