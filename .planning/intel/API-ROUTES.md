# API Routes & Contracts

**Analysis Date:** 2026-10-13

## Base Configuration

**Base URL:** `http://127.0.0.1:8000` (configurable via `VITE_API_BASE_URL`)

**Content-Type:** `application/json`

**Timeout:** 30000ms (30 seconds)

**Authentication:** Bearer token (Firebase JWT) attached via Axios interceptor

**Source:** `frontend/src/config/api.ts`

## Route Modules

Backend routes are organized in `backend/app/api/`:

1. `health.py` - Health checks
2. `predict.py` - Sepsis prediction
3. `patients.py` - Patient management (in-memory)
4. `alerts.py` - Alert retrieval and status updates
5. `feedback.py` - Clinician feedback submission
6. `dashboard.py` - Dashboard statistics
7. `agent_routes.py` - Gemini clinical assistant
8. `model_metrics.py` - Model performance data

**Registered in:** `backend/app/main.py` lines 61-68

---

## Health Endpoints

### `GET /health`

**Purpose:** API health check and model status

**Backend:** `backend/app/api/health.py`

**Frontend Service:** `frontend/src/services/healthService.ts`

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "1.0.0",
  "timestamp": "2026-10-13T16:54:29.295Z"
}
```

**Frontend Usage:**
- `HealthCheckPage.tsx` - Health status display

---

## Prediction Endpoints

### `POST /predict`

**Purpose:** Run agentic sepsis prediction pipeline on patient vitals/labs

**Backend:** `backend/app/api/predict.py` (lines 13-40)

**Frontend Service:** `frontend/src/services/predictionService.ts`

**Request Schema:** `PredictionRequest` (extends `PatientInput`)

```typescript
{
  patient_id?: string;
  age?: number;
  gender?: string;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  map?: number;
  spo2?: number;
  wbc_count?: number;
  platelet_count?: number;
  hemoglobin?: number;
  lactate?: number;
  creatinine?: number;
  bilirubin?: number;
  blood_urea_nitrogen?: number;
  glucose?: number;
  ph_level?: number;
  pao2?: number;
  paco2?: number;
  sofa_score?: number;
  qsofa_score?: number;
  gcs_score?: number;
  urine_output?: number;
  shock_index?: number;
  icu_los?: number;
}
```

**Backend Schema:** `backend/app/schemas/prediction_schema.py` lines 10-16

**Response Schema:** `PredictionResponse`

```typescript
{
  sepsis_probability: number;        // 0.0 - 1.0
  risk_level: string;                // "Low Risk" | "Moderate Risk" | "High Risk" | "Critical Risk"
  prediction: number;                // 0 = non-sepsis, 1 = sepsis
  explanation: string[];
  recommendation: string;
  agent_summary: {
    monitoring: {...},
    prediction: {...},
    reasoning: {
      agent: string;
      risk_level: string;
      explanation_count: number;
    },
    alert: {...}
  };
  model_version: string;
  patient_uuid?: string | null;      // Supabase UUID
  vitals_id?: string | null;
  prediction_id?: string | null;
  alert_id?: string | null;          // Present only for High/Critical risk
}
```

**Backend Schema:** `backend/app/schemas/prediction_schema.py` lines 19-41

**Orchestration:** `backend/app/agents/agent_orchestrator.py` - Runs MonitoringAgent → PredictionAgent → ReasoningAgent → AlertAgent pipeline

**Frontend Usage:**
- `NewPredictionPage.tsx` - Form submission
- `PredictionResultPage.tsx` - Result display
- `PredictionContext.tsx` - State management

**Error Codes:**
- `503` - Model not loaded
- `500` - Prediction runtime error

---

## Patient Endpoints

### `GET /patients`

**Purpose:** List registered patients (in-memory storage)

**Backend:** `backend/app/api/patients.py` line 14

**Frontend Service:** `frontend/src/services/patientService.ts`

**Response:**
```json
{
  "count": 3,
  "patients": [
    {
      "patient_id": "A1B2C3D4",
      "age": 72,
      "gender": "Male",
      ...
    }
  ]
}
```

**Storage:** In-memory dict `_patients` (line 11) - **not persisted across restarts**

### `POST /patients`

**Purpose:** Register a new patient profile

**Backend:** `backend/app/api/patients.py` line 23

**Request:** `PatientInput` schema (26 optional clinical parameters)

**Response:** `PatientRecord` with generated `patient_id` (8-char UUID prefix)

### `GET /patients/{patient_id}`

**Purpose:** Retrieve a patient by ID

**Backend:** `backend/app/api/patients.py` line 32

**Response:** `PatientRecord` or 404

**Frontend Usage:**
- `PatientsPage.tsx` - Patient list
- `PatientHistoryPage.tsx` - Individual patient view

**[UNVERIFIED]:** Patient history endpoint not found; frontend may use Supabase directly or feature is incomplete.

---

## Alert Endpoints

### `GET /alerts`

**Purpose:** Fetch recent alerts

**Backend:** `backend/app/api/alerts.py`

**Frontend Service:** `frontend/src/services/alertService.ts`

**Query Parameters:**
- `limit?: number` (default: 20)

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "prediction_id": "uuid",
      "alert_type": "sepsis",
      "severity": "high" | "critical",
      "message": "[High Risk | 72.5%] Immediate evaluation required",
      "status": "open" | "reviewed" | "resolved",
      "created_at": "ISO-8601"
    }
  ]
}
```

**Data Source:** Supabase `alerts` table or in-memory fallback

### `PATCH /alerts/{alert_id}/status`

**Purpose:** Update alert status

**Backend:** `backend/app/api/alerts.py`

**Request:**
```json
{
  "status": "open" | "reviewed" | "resolved"
}
```

**Response:**
```json
{
  "saved": true,
  "alert_id": "uuid",
  "status": "resolved",
  "storage": "supabase" | "memory"
}
```

**Frontend Usage:**
- `AlertsPage.tsx` - Alert list with status updates

---

## Feedback Endpoints

### `POST /feedback`

**Purpose:** Submit clinician feedback on a prediction

**Backend:** `backend/app/api/feedback.py`

**Frontend Service:** `frontend/src/services/feedbackService.ts`

**Request Schema:**
```typescript
{
  prediction_id?: string;
  actual_result?: string;           // "Sepsis confirmed" | "Not sepsis" | "Inconclusive"
  is_prediction_correct?: boolean;
  doctor_comment?: string;
}
```

**Backend Schema:** `backend/app/schemas/feedback_schema.py`

**Response:**
```json
{
  "saved": true,
  "feedback_id": "uuid",
  "storage": "supabase" | "memory"
}
```

### `GET /feedback`

**Purpose:** Retrieve recent feedback entries

**Query Parameters:**
- `limit?: number` (default: 20)

**Response:**
```json
{
  "feedback": [
    {
      "id": "uuid",
      "prediction_id": "uuid",
      "actual_result": "Sepsis confirmed",
      "is_prediction_correct": true,
      "doctor_comment": "Timely intervention",
      "created_at": "ISO-8601"
    }
  ]
}
```

**Frontend Usage:**
- `FeedbackPage.tsx` - Feedback submission and history

---

## Dashboard Endpoints

### `GET /dashboard`

**Purpose:** High-level API and prediction statistics

**Backend:** `backend/app/api/dashboard.py`

**Frontend Service:** `frontend/src/services/dashboardService.ts`

**Response:**
```json
{
  "app": "SepsisAI Guard API",
  "version": "1.0.0",
  "model": {
    "loaded": true,
    "name": "XGBoost",
    "version": "1.0.0"
  },
  "stats": {
    "total_patients": 42,
    "total_vitals": 128,
    "total_predictions": 95,
    "total_alerts": 12,
    "total_agent_logs": 380,
    "total_feedback": 8,
    "storage": "supabase" | "memory"
  },
  "supabase_configured": true
}
```

**Frontend Usage:**
- `DashboardPage.tsx` - Dashboard statistics display

---

## Agent Endpoints (Clinical Assistant)

**Prefix:** `/agent`

**Backend:** `backend/app/api/agent_routes.py`

**Service Layer:** `backend/app/services/gemini_service.py`

**Behavior:** Uses Gemini API when enabled; falls back to rule-based responses when unavailable

### `POST /agent/explain`

**Purpose:** Generate clinical explanation from ML output and vitals

**Frontend Service:** `frontend/src/services/agentService.ts` `explain()`

**Request Schema:** `AgentContextRequest`

```typescript
{
  patient_id?: string;
  risk_level: string;
  sepsis_probability: number;
  vitals: Record<string, any>;
  abnormal_features: string[];
}
```

**Response:**
```json
{
  "success": true,
  "source": "gemini" | "fallback",
  "explanation": "The patient presents with elevated lactate (3.8 mmol/L)..."
}
```

### `POST /agent/summary`

**Purpose:** Generate short clinical summary for dashboard or handoff

**Request:** `AgentContextRequest` (same as `/explain`)

**Response:**
```json
{
  "success": true,
  "source": "gemini" | "fallback",
  "summary": "72yo male, High Risk (72.5%), tachycardic, hypotensive..."
}
```

### `POST /agent/chat`

**Purpose:** Answer scoped questions about a prediction result

**Frontend Service:** `frontend/src/services/agentService.ts` `chat()`

**Request:**
```typescript
{
  message: string;
  patient_id?: string;
  prediction_context: {
    risk_level: string;
    sepsis_probability: number;
    abnormal_features: string[];
  }
}
```

**Response:**
```json
{
  "success": true,
  "source": "gemini" | "fallback",
  "reply": "The elevated lactate level indicates potential tissue hypoperfusion..."
}
```

**Scope:** Sepsis risk, vitals, alerts, monitoring, and project help only. Out-of-scope queries receive a polite redirect.

### `POST /agent/voice-query`

**Purpose:** Spoken-friendly short answer (same scope as `/chat`)

**Request:** Same as `/agent/chat`

**Response:** Same structure, but reply is brief (max 160 tokens) for TTS playback

**Frontend Usage:**
- `AIAssistantPage.tsx` - Chat interface with voice query support

---

## Model Metrics Endpoints

### `GET /model/metrics`

**Purpose:** Retrieve model performance metrics for visualization

**Backend:** `backend/app/api/model_metrics.py`

**Frontend Service:** `frontend/src/services/modelService.ts`

**Response:**
```json
{
  "model_name": "XGBoost",
  "model_version": "1.0.0",
  "accuracy": 0.9245,
  "precision": 0.8876,
  "recall": 0.9512,
  "f1_score": 0.9183,
  "roc_auc": 0.9678,
  "confusion_matrix": {
    "true_positive": 234,
    "true_negative": 189,
    "false_positive": 12,
    "false_negative": 8
  },
  "feature_importance": [
    { "feature": "lactate", "importance": 0.142 },
    { "feature": "sofa_score", "importance": 0.118 }
  ],
  "training_date": "2026-10-01",
  "metrics_source": "actual_training_evaluation"
}
```

**Data Source:** `backend/ml/models/model_metrics.json` (generated by `train_model.py`)

**Frontend Usage:**
- `ModelPerformancePage.tsx` - Model metrics visualization with Recharts

---

## Root Endpoint

### `GET /`

**Purpose:** API overview with links to key endpoints

**Backend:** `backend/app/main.py` lines 70-78

**Response:**
```json
{
  "message": "SepsisAI Guard API",
  "docs": "/docs",
  "health": "/health",
  "predict": "POST /predict",
  "agent": "POST /agent/explain | /agent/summary | /agent/chat | /agent/voice-query"
}
```

---

## Authentication Flow

### Frontend → Backend

1. **Login:** User authenticates with Firebase (Google OAuth) via `frontend/src/context/AuthContext.tsx`
2. **Token Acquisition:** `getIdToken()` retrieves JWT from Firebase SDK
3. **Request Interception:** Axios interceptor (`frontend/src/config/api.ts` lines 13-24) attaches `Authorization: Bearer <token>` header
4. **Backend Verification:** [UNVERIFIED] - No Firebase Admin SDK verification found in backend code; JWT is sent but not validated
5. **Graceful Degradation:** Token attachment fails silently ("Optional token attachment — backend may remain open for demo")

**Security Gap:** Backend does not appear to verify Firebase tokens. API endpoints are effectively open.

**Source Files:**
- `frontend/src/config/api.ts` (lines 13-24)
- `frontend/src/context/AuthContext.tsx`
- `backend/app/core/config.py` (no Firebase settings)

---

## CORS Configuration

**Middleware:** FastAPI `CORSMiddleware`

**Allowed Origins:**
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:5173`

**Credentials:** Enabled

**Methods:** All (`["*"]`)

**Headers:** All (`["*"]`)

**Source:** `backend/app/main.py` lines 52-58

---

## Error Handling Patterns

### Backend

**HTTPException** used for structured errors:
- `503` - Model not loaded (`predict.py` line 21)
- `404` - Patient not found (`patients.py` line 38)
- `500` - Prediction runtime error (`predict.py` line 37)

**Graceful Degradation:**
- Supabase failures logged as warnings, API continues with in-memory fallback
- Gemini failures logged, API returns rule-based fallback responses

### Frontend

**Error Extraction:** `getApiErrorMessage()` helper (`frontend/src/config/api.ts` lines 26-35) extracts detail from FastAPI validation errors or Axios error messages

**Pattern:**
```typescript
try {
  const { data } = await apiClient.post('/predict', payload);
  return data;
} catch (error) {
  throw new Error(getApiErrorMessage(error, 'Prediction request failed'));
}
```

**Used in:** All service files (`*Service.ts`)

---

## Request/Response Schema Locations

### Backend Schemas (`backend/app/schemas/`)

- `prediction_schema.py` - PredictionRequest, PredictionResponse, AlertResponse
- `patient_schema.py` - PatientInput, PatientRecord
- `agent_schema.py` - AgentContextRequest, AgentChatRequest, AgentExplainResponse, AgentSummaryResponse, AgentChatResponse
- `feedback_schema.py` - FeedbackPayload, FeedbackResponse

### Frontend Types

**Location:** `frontend/src/types/api.ts` [Not read in this analysis - inferred from service imports]

---

*API analysis: 2026-10-13*
