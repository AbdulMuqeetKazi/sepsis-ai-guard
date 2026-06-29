# SepsisAI Guard — Backend

**Sepsis Prediction Using Machine Learning with Agentic AI**

FastAPI backend that serves a trained sepsis ML model with a multi-agent orchestration layer for monitoring, prediction, reasoning, and alerting.

## Project structure

```text
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── api/                 # REST endpoints
│   ├── agents/              # Agentic AI layer
│   ├── core/                # Configuration
│   ├── schemas/             # Pydantic models
│   ├── services/            # Business logic
│   └── utils/               # Helpers & logging
├── ml/                      # ML training pipeline
├── Procfile                 # Render process file
├── render.yaml              # Render deployment config
└── requirements.txt
```

## Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv
```

**Windows (PowerShell):**
```bash
venv\Scripts\activate
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment (optional)

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Edit `.env` to set CORS origins. The API runs without Supabase, but persistence is enabled when credentials are set.

## Supabase setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Open **Project Settings → API**.
3. Copy the **Project URL** and **service_role** or **anon** key (use `service_role` for backend-only writes, or `anon` with RLS policies).

### 2. Configure environment variables

Add to `backend/.env` (never commit this file):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-or-anon-key
```

Restart the API after changing `.env`.

### 3. Database tables

The backend expects these tables (you indicated they are already created):

| Table | Purpose |
|-------|---------|
| `patients` | `patient_code` (e.g. `P001`), `age`, `gender` |
| `patient_vitals` | Vitals/labs linked by `patient_id` (UUID) |
| `predictions` | ML output linked by `patient_id` and `vitals_id` |
| `alerts` | High/Critical risk alerts |
| `agent_logs` | Per-agent audit trail (`agent_name`, `agent_output` JSON) |
| `feedback` | Clinician feedback |
| `model_versions` | Model registry (optional, not written by `/predict` yet) |

**`patients`** — minimum columns:
- `id` (uuid, PK, default `gen_random_uuid()`)
- `patient_code` (text, unique)
- `age`, `gender` (nullable)
- `created_at` (timestamptz, default `now()`)

**`patient_vitals`** — `patient_id` (uuid FK) plus optional vital columns matching the API (`heart_rate`, `temperature`, `lactate`, etc.).

**`predictions`** — `patient_id`, `vitals_id`, `sepsis_probability`, `risk_level`, `prediction`, `model_version`, `explanation` (jsonb), `recommendation`.

**`alerts`** — `patient_id`, `prediction_id`, `alert_type`, `severity`, `message`, `status`.

**`agent_logs`** — `prediction_id`, `agent_name`, `agent_action` (optional), `agent_output` (jsonb).

### 4. `/predict` persistence flow

Each `POST /predict` request:

1. **Create or get patient** — API `patient_id` (e.g. `"P001"`) → `patients.patient_code`; returns UUID as `patient_uuid`.
2. **Save vitals** → `patient_vitals` row (`vitals_id`).
3. **Run ML + agents** (unchanged).
4. **Save prediction** → `predictions` row (`prediction_id`).
5. **Save agent logs** — one row per agent in `agent_logs`.
6. **Save alert** — only for **High Risk** or **Critical Risk** (`alert_id`).

If Supabase is down or misconfigured, the API still returns predictions; ID fields will be `null`.

### 5. Verify in Supabase

After calling `/predict` with `"patient_id": "P001"`, check the **Table Editor** for new rows in `patients`, `patient_vitals`, `predictions`, `agent_logs`, and `alerts` (for high-risk cases).

## Train the ML model

Place raw datasets in `ml/data/raw/`, then run:

```bash
cd backend
python -m ml.preprocess_data
python -m ml.train_model
python -m ml.evaluate_model
python -m ml.predict_test
```

Trained artifacts are saved to `ml/models/`:
- `sepsis_model.pkl`
- `feature_columns.pkl`
- `model_metadata.json`

## Start the API locally

```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
uvicorn app.main:app --reload
```

- API root: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

## API endpoints

| Method | Endpoint       | Description                    |
|--------|----------------|--------------------------------|
| GET    | `/health`      | API and model health status    |
| POST   | `/predict`     | Sepsis risk prediction         |
| GET    | `/patients`    | List registered patients       |
| POST   | `/patients`    | Register a patient             |
| GET    | `/alerts`      | Recent clinical alerts         |
| POST   | `/feedback`    | Submit clinician feedback      |
| GET    | `/dashboard`   | Summary statistics             |
| POST   | `/agent/explain` | ML-based clinical explanation (Gemini or fallback) |
| POST   | `/agent/summary` | Short clinical summary (Gemini or fallback) |
| POST   | `/agent/chat`  | Scoped chat about prediction results |
| POST   | `/agent/voice-query` | Spoken-friendly short chat reply |

## Gemini clinical assistant

The Gemini integration provides **decision-support text only** — explanations, summaries, chat, and voice-style replies. It does **not** run ML inference, change sepsis probability, or replace the XGBoost model on `/predict`.

### 1. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Create an API key for your project.

### 2. Configure environment variables

Add to `backend/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
ENABLE_GEMINI_AGENT=true
GEMINI_MODEL=gemini-2.5-flash
```

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (never commit to git) |
| `ENABLE_GEMINI_AGENT` | Set to `true` to enable Gemini; `false` uses rule-based fallback |
| `GEMINI_MODEL` | Model name (default: `gemini-2.5-flash`) |

Restart the API after changing `.env`. On Render, add the same variables in the service dashboard.

### 3. Safety behavior

- Gemini receives **only** the data you send in each request (patient code, risk level, probability, vitals, abnormal features).
- Supabase credentials and full database records are **never** sent to Gemini.
- If Gemini is disabled, the API key is missing, or the API call fails, endpoints return `"source": "fallback"` with rule-based text — the API does not crash.
- Prompts enforce clinical guardrails: no diagnosis, no prescriptions, no dosage, no treatment orders, and mandatory clinician review.

### 4. Test locally

Start the API, then open **http://127.0.0.1:8000/docs** and try the **Clinical Agent** endpoints.

**Explain** — `POST /agent/explain`:

```json
{
  "patient_id": "P001",
  "risk_level": "Critical Risk",
  "sepsis_probability": 0.82,
  "vitals": {
    "heart_rate": 118,
    "temperature": 38.6,
    "systolic_bp": 92,
    "spo2": 91,
    "lactate": 3.8
  },
  "abnormal_features": [
    "High heart rate",
    "High temperature",
    "Low oxygen saturation",
    "High lactate"
  ]
}
```

Expected response shape:

```json
{
  "success": true,
  "source": "gemini",
  "explanation": "..."
}
```

With `ENABLE_GEMINI_AGENT=false`, `"source"` will be `"fallback"`.

**Chat** — `POST /agent/chat`:

```json
{
  "message": "Why is this patient critical risk?",
  "patient_id": "P001",
  "prediction_context": {
    "risk_level": "Critical Risk",
    "sepsis_probability": 0.82,
    "abnormal_features": [
      "High heart rate",
      "High lactate",
      "Low oxygen saturation"
    ]
  }
}
```

**Voice query** — `POST /agent/voice-query` uses the same request body; responses are shorter and spoken-friendly.

Out-of-scope questions (e.g. unrelated medical or general topics) return:

```text
I can only help with sepsis prediction results, patient risk explanation, clinical summaries, alerts, and monitoring support.
```

### 5. Verify fallback mode

To confirm the API works without Gemini:

1. Set `ENABLE_GEMINI_AGENT=false` (or leave `GEMINI_API_KEY` empty).
2. Call any `/agent/*` endpoint.
3. Confirm `"source": "fallback"` and a rule-based response — `/predict` and `/health` should still work normally.

## Deploy on Render

1. Push the repo to GitHub (include `ml/models/*.pkl` or train during build).
2. Create a **Web Service** on [Render](https://render.com).
3. Set **Root Directory** to `backend`.
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables from `.env.example` in the Render dashboard.
7. Alternatively, use the included `render.yaml` for Blueprint deployment.

> **Note:** Ensure `sepsis_model.pkl` is available on the server. Large model files may need Git LFS or a build-step download.

## Agentic AI layer

Each `/predict` request runs through:

1. **MonitoringAgent** — flags abnormal vitals
2. **PredictionAgent** — runs XGBoost ML inference
3. **ReasoningAgent** — rule-based explanations + recommendations
4. **AlertAgent** — escalates High/Critical risk cases

Gemini endpoints (`/agent/*`) are separate from this pipeline and are used only for natural-language explanations and chat.

## License

Final-year academic project — SepsisAI Guard.
