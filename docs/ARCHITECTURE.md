# SepsisAI Guard — Architecture

## High-level architecture

SepsisAI Guard is a full-stack clinical decision support system with three major subsystems:

1. **Frontend application** — React + TypeScript SPA with authentication, prediction forms, dashboard, and AI assistant chat.
2. **Backend API** — FastAPI service that loads the trained model, runs an agentic assessment pipeline, and optionally persists results to Supabase.
3. **ML training pipeline** — offline scripts that preprocess data, train models, and export artifacts.

CORS is pre-configured for `localhost:5173` (Vite default) and `localhost:3000`.

```
┌─────────────┐     HTTP/JSON      ┌──────────────────┐     SQL/REST     ┌───────────┐
│  React      │ ─────────────────► │  FastAPI Backend │ ───────────────► │ Supabase  │
│  Frontend   │ ◄───────────────── │  (app/)          │ ◄─────────────── │ PostgreSQL│
│  (Vite)     │                    │                  │                  │           │
└─────────────┘                    │  ┌────────────┐  │                  └───────────┘
      │                            │  │ Gemini API │  │
      │  Firebase Auth             │  │ (optional) │  │
      └───────────────────────────►│  └────────────┘  │
                                   └────────┬─────────┘
                                            │ joblib load
                                            ▼
                                   ┌──────────────────┐
                                   │ sepsis_model.pkl │
                                   │ (XGBoost pipeline)│
                                   └──────────────────┘
```

## Components

### 1. Frontend (`frontend/src/`)

React + TypeScript single-page application built with Vite.

**Pages (12 total):**
- `LandingPage.tsx` — Public landing page
- `LoginPage.tsx` — Firebase Google OAuth login
- `DashboardPage.tsx` — KPIs, charts, alerts, system status
- `NewPredictionPage.tsx` — Multi-section clinical data form with reference panel
- `PredictionResultPage.tsx` — Risk display with Gemini-enriched explanations
- `PatientsPage.tsx` — Patient registry
- `PatientHistoryPage.tsx` — Patient history viewer
- `AlertsPage.tsx` — Clinical alerts console
- `AIAssistantPage.tsx` — Gemini chat interface
- `FeedbackPage.tsx` — Clinician feedback form
- `ModelPerformancePage.tsx` — Model metrics display
- `SettingsPage.tsx` — User settings

**API Services (8 modules in `services/`):**
- `predictionService.ts` → `POST /predict`
- `patientService.ts` → `GET/POST /patients`, `GET /patients/{id}`
- `alertService.ts` → `GET /alerts`
- `dashboardService.ts` → `GET /dashboard`
- `healthService.ts` → `GET /health`
- `feedbackService.ts` → `POST /feedback`, `GET /feedback`
- `agentService.ts` → `POST /agent/explain`, `/agent/summary`, `/agent/chat`, `/agent/voice-query`
- `modelService.ts` → `GET /model/metrics`

**Authentication:**
- Firebase Google OAuth via `AuthContext.tsx`
- Protected routes via `ProtectedRoute.tsx`
- JWT token attached to API requests (backend verification not implemented)

**State Management:**
- `AuthContext` — Firebase user state
- `PredictionContext` — Prediction session data (form, result, Gemini enrichments)

### 2. Backend API layer (`app/api/`)

Thin route handlers that validate input via Pydantic schemas and delegate to services or the orchestrator.

| Endpoint | Handler | Description |
|----------|---------|-------------|
| `GET /health` | `health.py` | API + model health |
| `POST /predict` | `predict.py` | Full sepsis assessment |
| `GET /alerts` | `alerts.py` | Recent alerts |
| `GET /dashboard` | `dashboard.py` | Aggregate stats |
| `POST /feedback` | `feedback.py` | Clinician feedback |
| `GET/POST /patients` | `patients.py` | In-memory patient registry |
| `POST /agent/explain` | `agent_routes.py` | Gemini clinical explanation |
| `POST /agent/summary` | `agent_routes.py` | Gemini clinical summary |
| `POST /agent/chat` | `agent_routes.py` | Gemini scoped chat |
| `POST /agent/voice-query` | `agent_routes.py` | Gemini voice-friendly reply |
| `GET /model/metrics` | `model_metrics.py` | Model performance metrics |

### 3. Agentic AI layer (`app/agents/`)

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

Agents are **rule-based and deterministic** — no external LLM or paid API calls in the main prediction pipeline.

**Gemini assistant** (separate from main pipeline):
- Optional post-prediction enrichment via `/agent/*` endpoints
- Provides natural-language explanations, summaries, and chat
- Graceful fallback to rule-based text when disabled or unavailable
- Does not modify sepsis probability or risk level

### 4. Service layer (`app/services/`)

| Service | Concern |
|---------|---------|
| `PredictionService` | Model loading, feature alignment, inference |
| `RiskService` | Probability → Low/Medium/High/Critical + safe text |
| `ExplanationService` | Clinical threshold rules (HR, temp, BP, lactate, etc.) |
| `SupabaseService` | Database CRUD with in-memory fallback |
| `GeminiService` | Optional Gemini API wrapper (explanations, summaries, chat) |
| `AgentPromptService` | Gemini prompts + fallback text generation |

### 5. ML subsystem (`ml/`)

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

## Frontend / backend interaction

| Aspect | Current state |
|--------|---------------|
| Frontend | Fully implemented (React + TypeScript) |
| API format | JSON over HTTP |
| CORS | Configured via `CORS_ORIGINS` (defaults: `localhost:5173`, `localhost:3000`) |
| Auth | Firebase on frontend (JWT sent); backend has no verification middleware |
| Primary endpoints | `POST /predict`, `GET /dashboard`, `POST /agent/*` |
| API client | Axios with base URL from `VITE_API_BASE_URL` |

**Prediction flow:**
1. Frontend: User fills form → `NewPredictionPage.tsx`
2. Frontend: `predictionService.predict(payload)` → `POST /predict`
3. Backend: Orchestrator runs agents → returns `PredictionResponse`
4. Frontend: Parallel calls to `POST /agent/explain` and `POST /agent/summary` (optional Gemini enrichment)
5. Frontend: Store result in `PredictionContext`
6. Frontend: Navigate to `/predict/result` → `PredictionResultPage.tsx` displays risk, explanations, recommendations

**Dashboard flow:**
1. Frontend: `DashboardPage.tsx` loads on mount
2. Frontend: Parallel calls to `GET /dashboard`, `GET /health`, `GET /patients`, `GET /alerts`
3. Backend: Returns aggregated stats from Supabase or in-memory data
4. Frontend: Renders KPIs, charts, recent patients, recent alerts, system status

**Authentication flow:**
1. Frontend: User clicks "Sign in with Google" → `LoginPage.tsx`
2. Frontend: Firebase `signInWithPopup(auth, googleProvider)`
3. Frontend: `onAuthStateChanged` → updates `AuthContext`
4. Frontend: `ProtectedRoute` checks user state → allows/denies route access
5. Frontend: API interceptor attaches `Authorization: Bearer {firebase_id_token}` to requests
6. Backend: **No JWT verification** — tokens are sent but not validated (security gap)

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

**Backend:**
- **Local:** `uvicorn app.main:app --reload` from `backend/`
- **Render:** `Procfile` + `render.yaml`; start command uses `$PORT`
- **Secrets:** Set via Render dashboard or `.env` locally
- **Note:** Ensure `sepsis_model.pkl` is available (Git LFS or build-step download)

**Frontend:**
- **Local:** `npm run dev` from `frontend/` (runs on `http://localhost:5173`)
- **Build:** `npm run build` → `dist/` folder
- **Deployment:** Not configured (needs Vercel, Netlify, or Render static site setup)
- **Environment:** Set `VITE_API_BASE_URL` to production backend URL

## Architecture diagram

Source: [`diagrams/architecture.dot`](diagrams/architecture.dot)

Render to PNG (requires Graphviz desktop app installed):

```bash
dot -Tpng docs/diagrams/architecture.dot -o docs/diagrams/architecture.png
```
