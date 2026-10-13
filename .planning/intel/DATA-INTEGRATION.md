# Data Persistence & External Integrations

**Analysis Date:** 2026-10-13

## Data Persistence Architecture

### Dual-Storage Strategy

**Primary:** Supabase (PostgreSQL) - Optional, production-ready persistence

**Fallback:** In-Memory Python dicts/lists - Development/demo mode

**Behavior:** All storage operations wrapped in try/except; failures logged as warnings but don't break API responses

**Philosophy:** API remains functional without any external database

---

## Supabase Integration

### Overview

**Provider:** Supabase (PostgreSQL database with REST API)

**SDK:** `supabase-py` (>=2.0.0)

**Configuration:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

**Client Initialization:** Lazy, cached via `@lru_cache` decorator

**File:** `backend/app/services/supabase_service.py`

### Connection Management

**Function:** `_get_client()` (lines 41-60)

**Pattern:**
```python
@lru_cache
def _get_client():
    settings = get_settings()
    if not settings.supabase_configured:
        logger.debug("Supabase not configured — persistence disabled")
        return None
    
    try:
        from supabase import create_client
        client = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("Supabase client initialized")
        return client
    except ImportError:
        logger.warning("supabase package not installed")
        return None
    except Exception as exc:
        logger.warning("Supabase client initialization failed: %s", exc)
        return None
```

**Caching:** Single client instance reused across all requests

**Failure Handling:** Returns `None` on any failure; all operations check for `None` and fall back to in-memory storage

### Database Schema

**Tables:**

#### 1. `patients`

**Purpose:** Patient demographics and identity

**Columns:**
- `id` (UUID, primary key) - Supabase-generated UUID
- `patient_code` (TEXT, unique) - Application-level identifier (e.g., "P001", "ANON-A1B2C3D4")
- `age` (INTEGER, nullable)
- `gender` (TEXT, nullable)
- `created_at` (TIMESTAMP) - Auto-populated by Supabase

**Backend Function:** `create_or_get_patient()` (lines 77-158)

**Behavior:** Lookup by `patient_code` first; insert if not found

#### 2. `patient_vitals`

**Purpose:** Snapshots of 26 clinical parameters at a point in time

**Columns:**
- `id` (UUID, primary key)
- `patient_id` (UUID, foreign key → `patients.id`)
- `created_at` (TIMESTAMP)
- All 26 feature columns: `age`, `gender`, `heart_rate`, `respiratory_rate`, `temperature`, `systolic_bp`, `diastolic_bp`, `map`, `spo2`, `wbc_count`, `platelet_count`, `hemoglobin`, `lactate`, `creatinine`, `bilirubin`, `blood_urea_nitrogen`, `glucose`, `ph_level`, `pao2`, `paco2`, `sofa_score`, `qsofa_score`, `gcs_score`, `urine_output`, `shock_index`, `icu_los`

**Backend Function:** `save_patient_vitals()` (lines 161-186)

**Payload Construction:** Only includes fields present in input (lines 68-74)

#### 3. `predictions`

**Purpose:** ML prediction results with explanations

**Columns:**
- `id` (UUID, primary key)
- `patient_id` (UUID, foreign key → `patients.id`)
- `vitals_id` (UUID, foreign key → `patient_vitals.id`, nullable)
- `sepsis_probability` (FLOAT)
- `risk_level` (TEXT) - "Low Risk", "Medium Risk", "High Risk", "Critical Risk"
- `prediction` (INTEGER) - 0 or 1
- `model_version` (TEXT)
- `explanation` (JSONB) - Array of explanation strings
- `recommendation` (TEXT)
- `created_at` (TIMESTAMP)

**Backend Function:** `save_prediction()` (lines 189-242)

#### 4. `agent_logs`

**Purpose:** Audit trail of individual agent outputs

**Columns:**
- `id` (UUID, primary key)
- `prediction_id` (UUID, foreign key → `predictions.id`, nullable)
- `agent_name` (TEXT) - "MonitoringAgent", "PredictionAgent", "ReasoningAgent", "AlertAgent"
- `agent_action` (TEXT, nullable) - Extracted from `agent_output.status` or `agent_output.agent`
- `agent_output` (JSONB) - Full agent response dict
- `created_at` (TIMESTAMP)

**Backend Function:** `save_agent_log()` (lines 295-335)

**Usage:** One row per agent per prediction (4 rows per prediction)

#### 5. `alerts`

**Purpose:** High/Critical risk notifications for clinical teams

**Columns:**
- `id` (UUID, primary key)
- `patient_id` (UUID, foreign key → `patients.id`)
- `prediction_id` (UUID, foreign key → `predictions.id`)
- `alert_type` (TEXT) - Always "sepsis" in current implementation
- `severity` (TEXT) - "high" or "critical"
- `message` (TEXT) - "[High Risk | 72.5%] Clinical review recommended."
- `status` (TEXT) - "open", "reviewed", "resolved"
- `created_at` (TIMESTAMP)

**Backend Function:** `save_alert()` (lines 245-292)

**Trigger:** Only created when `risk_level` is "High Risk" or "Critical Risk" OR `probability >= 0.61`

#### 6. `feedback`

**Purpose:** Clinician validation of predictions for model improvement

**Columns:**
- `id` (UUID, primary key)
- `prediction_id` (UUID, foreign key → `predictions.id`, nullable)
- `actual_result` (TEXT, nullable) - "Sepsis confirmed", "Not sepsis", "Inconclusive"
- `is_prediction_correct` (BOOLEAN, nullable)
- `doctor_comment` (TEXT, nullable)
- `created_at` (TIMESTAMP)

**Backend Function:** `save_feedback()` (lines 338-360)

**Retrieval:** `get_feedback()` (lines 363-380) - Returns most recent 20 by default

#### 7. `model_versions`

**Status:** Referenced in documentation but not used in current implementation

**Purpose:** [UNVERIFIED] Track model training iterations, A/B testing

---

## In-Memory Fallback Storage

### Module-Level Storage

**File:** `backend/app/services/supabase_service.py` lines 19-25

```python
_memory_patients: dict[str, dict[str, Any]] = {}
_memory_vitals: list[dict[str, Any]] = []
_memory_predictions: list[dict[str, Any]] = []
_memory_alerts: list[dict[str, Any]] = []
_memory_agent_logs: list[dict[str, Any]] = []
_memory_feedback: list[dict[str, Any]] = []
```

**Lifecycle:** Module-scoped; persists only during backend process lifetime; cleared on restart

**Usage Pattern:**
```python
client = _get_client()
if client is None:
    # In-memory path
    record = {"id": str(uuid.uuid4()), ...}
    _memory_predictions.append(record)
    return {"saved": True, "id": record["id"], "storage": "memory"}

# Supabase path
result = client.table("predictions").insert(data).execute()
return {"saved": True, "id": result.data[0]["id"], "storage": "supabase"}
```

**Retrieval:**
```python
def get_feedback(limit: int = 20) -> list[dict[str, Any]]:
    client = _get_client()
    if client is None:
        return list(reversed(_memory_feedback[-limit:]))
    
    # Supabase query
```

### Separate In-Memory Patient Store

**File:** `backend/app/api/patients.py` line 11

```python
_patients: dict[str, PatientRecord] = {}
```

**Scope:** Patient registration endpoints only (`POST /patients`, `GET /patients`, `GET /patients/{id}`)

**Issue:** Duplicates patient storage; `supabase_service` has its own `_memory_patients` dict

**Impact:** Patient registered via `POST /patients` won't appear in `supabase_service` lookups during prediction flow

**Recommendation:** Consolidate to single storage layer

---

## Data Flow Patterns

### Prediction Pipeline → Supabase

**Orchestrated by:** `agent_orchestrator.run()` (`backend/app/agents/agent_orchestrator.py`)

**Sequence:**

1. **Patient Lookup/Creation** (lines 40-52)
   ```python
   patient_result = supabase_service.create_or_get_patient(
       patient_code=patient_id,
       demographics={"age": ..., "gender": ...}
   )
   patient_uuid = patient_result.get("patient_uuid")  # May be None
   ```

2. **Vitals Snapshot** (lines 46-47)
   ```python
   if patient_uuid:
       vitals_result = supabase_service.save_patient_vitals(patient_uuid, patient)
       vitals_id = vitals_result.get("vitals_id")
   ```

3. **Agent Pipeline Execution** (lines 55-65)
   - MonitoringAgent → `monitoring`
   - PredictionAgent → `prediction_result`, `probability`
   - ReasoningAgent → `reasoning`, `risk_level`
   - AlertAgent → `alert`

4. **Prediction Record** (lines 79-89)
   ```python
   if patient_uuid:
       pred_result = supabase_service.save_prediction(
           patient_uuid, vitals_id, probability, risk_level,
           prediction, model_version, explanation, recommendation
       )
       prediction_id = pred_result.get("prediction_id")
   ```

5. **Agent Logs** (lines 92-104)
   ```python
   for agent_name, output in agent_outputs:
       supabase_service.save_agent_log(
           patient_uuid, prediction_id, agent_name, output
       )
   ```

6. **Alert (Conditional)** (lines 107-116)
   ```python
   if alert.get("alert_required") and should_escalate(risk_level):
       alert_result = supabase_service.save_alert(
           patient_uuid, prediction_id, risk_level,
           probability, severity, message
       )
       alert_id = alert_result.get("alert_id")
   ```

**Non-Blocking:** All steps wrapped in conditionals; if `patient_uuid` is `None` (Supabase unavailable), steps 4-6 skipped but API response still returned

### Dashboard Statistics

**Endpoint:** `GET /dashboard` → `backend/app/api/dashboard.py`

**Function:** `supabase_service.get_dashboard_stats()` (lines 432-468)

**Supabase Query:**
```python
for table, key in [
    ("patients", "total_patients"),
    ("patient_vitals", "total_vitals"),
    ("predictions", "total_predictions"),
    ("alerts", "total_alerts"),
    ("agent_logs", "total_agent_logs"),
    ("feedback", "total_feedback"),
]:
    result = client.table(table).select("id", count="exact").execute()
    stats[key] = result.count or 0
```

**Fallback:** Returns `len()` of in-memory lists

**Response Includes:** `"storage": "supabase" | "memory"` indicator

### Alert Status Updates

**Endpoint:** `PATCH /alerts/{alert_id}/status`

**Function:** `supabase_service.update_alert_status()` (lines 408-429)

**Supabase Update:**
```python
result = client.table("alerts").update({"status": status}).eq("id", alert_id).execute()
```

**Validation:** Status must be one of `{"open", "reviewed", "resolved"}`

**Fallback:** Finds alert in `_memory_alerts` list and updates in-place

---

## Firebase Integration

### Purpose

**Authentication Only** - User identity via Google OAuth

**SDK:** Firebase JS SDK v11.2.0

**Configuration File:** `frontend/src/config/firebase.ts`

### Configuration

**Environment Variables:**
```bash
VITE_FIREBASE_API_KEY=<key>
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<app-id>
```

**Initialization:**
```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ... other config
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && 
  firebaseConfig.projectId && firebaseConfig.appId
);

let firebaseApp: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  firebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  authInstance = getAuth(firebaseApp);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
```

**Graceful Degradation:** If env vars missing, `isFirebaseConfigured = false`, auth features disabled

### Authentication Flow

**Sign In:** `AuthContext.signInWithGoogle()` (frontend/src/context/AuthContext.tsx lines 48-53)

```typescript
const signInWithGoogle = useCallback(async () => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured. Add your Firebase keys to .env');
  }
  await signInWithPopup(auth, googleProvider);
}, []);
```

**Auth State Management:**
```typescript
useEffect(() => {
  if (!isFirebaseConfigured || !auth) {
    setLoading(false);
    return;
  }
  
  const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setLoading(false);
  });
  
  return unsubscribe;
}, []);
```

**Token Attachment:** Axios interceptor (frontend/src/config/api.ts lines 13-24)

```typescript
apiClient.interceptors.request.use(async (config) => {
  try {
    const user = auth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Optional token attachment — backend may remain open for demo
  }
  return config;
});
```

**Sign Out:** Hard redirect to `/` (clears React Router state)

### Backend Token Verification

**Status:** [UNVERIFIED] No Firebase Admin SDK found in backend code

**Expected Location:** Middleware or dependency injection in `backend/app/`

**Searched For:** `firebase-admin`, `FirebaseAuth`, `verify_id_token` — not found

**Impact:** Backend receives JWT in `Authorization` header but does not validate it; API is effectively open

**Recommendation:** Add Firebase Admin SDK verification or remove auth UI if API intended to be public

---

## External API Integrations

### Gemini API (Google Generative AI)

**Purpose:** Clinical assistant for explanations, summaries, and chat

**SDK:** `google-genai` (>=1.0.0)

**Configuration:**
```bash
GEMINI_API_KEY=<your-api-key>
ENABLE_GEMINI_AGENT=true
GEMINI_MODEL=gemini-2.5-flash
```

**Service File:** `backend/app/services/gemini_service.py`

**Client Initialization:**
```python
from google import genai

self._client = genai.Client(api_key=settings.gemini_api_key)
```

**API Call Pattern:**
```python
response = client.models.generate_content(
    model=settings.gemini_model,
    contents=user_prompt,
    config=types.GenerateContentConfig(
        system_instruction=agent_prompt_service.SYSTEM_INSTRUCTION,
        temperature=0.2,
        max_output_tokens=512,
    ),
)
text = getattr(response, "text", None)
```

**Graceful Degradation:**
1. If `ENABLE_GEMINI_AGENT=false` or `GEMINI_API_KEY` missing → all requests use fallback
2. If `google-genai` package not installed → log warning, use fallback
3. If API call fails (network, quota, error) → log warning, use fallback

**Fallback Responses:** Rule-based templates from `agent_prompt_service` (e.g., `fallback_explanation()`, `fallback_summary()`)

**Endpoints Using Gemini:**
- `POST /agent/explain` - Clinical explanation generation
- `POST /agent/summary` - Dashboard summary
- `POST /agent/chat` - Interactive Q&A
- `POST /agent/voice-query` - Brief voice responses

**Source Tracking:** All responses include `"source": "gemini" | "fallback"` field

---

## Data Validation & Sanitization

### Backend (Pydantic)

**Request Validation:** Automatic via FastAPI + Pydantic schemas

**Pattern:**
```python
class PatientInput(BaseModel):
    age: float | None = None
    gender: str | None = None
    heart_rate: float | None = None
    # ... 23 more fields, all optional
```

**Behavior:**
- Type coercion attempted (e.g., `"42"` → `42.0`)
- Invalid types → 422 Unprocessable Entity with field-level errors
- Extra fields ignored (due to `extra="ignore"` in Settings model config)
- Missing optional fields → `None`

**Database Payload Construction:**
```python
def _vitals_payload(patient_id: str, vitals: dict[str, Any]) -> dict[str, Any]:
    row: dict[str, Any] = {"patient_id": patient_id}
    for field in FEATURE_FIELDS:
        if field in vitals and vitals[field] is not None:
            row[field] = vitals[field]
    return row
```

**Pattern:** Only include fields present in input; skip `None` values

### Frontend (TypeScript)

**Type Checking:** Compile-time via TypeScript strict mode

**Runtime Validation:** Minimal; relies on TypeScript types + backend validation

**Form Input Parsing:** `parseNumericField()` helper (frontend/src/utils/vitalsUtils.ts, inferred from import)

**Pattern:**
```typescript
const formData: PatientInput = {
  age: parseNumericField(form.age),
  heart_rate: parseNumericField(form.heart_rate),
  // ...
};
```

**Purpose:** Convert string inputs to numbers, handle empty strings

---

## Error Propagation

### Supabase Operation Failures

**Pattern:** Return structured error dict, log warning, continue execution

```python
def _failure(operation: str, exc: Exception, **extra: Any) -> dict[str, Any]:
    logger.warning("Supabase %s failed: %s", operation, exc)
    return {"saved": False, "id": None, "storage": "none", "error": str(exc), **extra}
```

**Caller Handling:**
```python
patient_result = supabase_service.create_or_get_patient(...)
if patient_result.get("patient_uuid"):
    # Continue with UUID
else:
    logger.warning("Patient persistence skipped: %s", patient_result.get("error"))
    # Continue without UUID
```

**API Response:** Still returns 200 OK with `patient_uuid=None`

### Gemini API Failures

**Pattern:** Return `None`, log warning, use fallback

```python
def generate_text(self, user_prompt: str, ...) -> str | None:
    try:
        response = client.models.generate_content(...)
        return response.text
    except Exception as exc:
        logger.warning("Gemini generate_content failed: %s", exc)
        return None

def explain(...) -> tuple[str, str]:
    text = self.generate_text(prompt)
    if text:
        return text, "gemini"
    return agent_prompt_service.fallback_explanation(...), "fallback"
```

**API Response:** Still returns 200 OK with fallback content and `"source": "fallback"`

### Critical Failures (Prediction Pipeline)

**ML Model Not Loaded:**
```python
if not prediction_service.is_loaded:
    raise HTTPException(
        status_code=503,
        detail="Model not loaded. Ensure sepsis_model.pkl exists and restart the API."
    )
```

**Inference Runtime Error:**
```python
try:
    result = orchestrator.run(request)
    return result
except RuntimeError as exc:
    logger.exception("Prediction runtime error")
    raise HTTPException(status_code=500, detail=str(exc)) from exc
```

**Behavior:** 503/500 errors bubble to frontend; user sees error message

---

## Data Privacy & Security

### PII Handling

**Patient Identifiers:**
- `patient_id` (API) / `patient_code` (Supabase): Optional, user-provided, not validated
- If omitted: Generated as `ANON-{8_random_hex}`

**Demographics:** Age and gender stored for risk calculation; no names, addresses, or contact info collected

**Vitals/Labs:** Clinical parameters only; no free-text fields that could contain PII

**Doctor Comments:** Free-text field in feedback table; could contain PII; no sanitization in place

### Secrets Management

**Environment Variables:** All secrets in `.env` files (gitignored)

**Logged Secrets:** No API keys or tokens logged (only presence/absence)

**Frontend Exposure:** Firebase config (public keys) and API base URL exposed in client bundle; backend secrets never sent to frontend

### CORS Policy

**Configured Origins:** `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`

**Production:** Must update `CORS_ORIGINS` env var before deployment

**Credentials:** Enabled (allows cookies, auth headers)

---

## Performance Considerations

### Database Query Patterns

**Indexes:** [UNVERIFIED] No index configuration found in code; relies on Supabase defaults

**Expected Indexes:**
- `patients.patient_code` (unique) - Lookup during prediction
- `predictions.patient_id` - Patient history queries
- `alerts.created_at` - Recent alerts retrieval
- `feedback.created_at` - Recent feedback retrieval

**N+1 Queries:** Not observed; agent logs use single loop with 4 separate inserts (acceptable for audit logging)

**Dashboard Stats:** 6 separate `COUNT(*)` queries; could be optimized to single query with subqueries

### Connection Pooling

**Supabase Client:** Single cached instance via `@lru_cache`

**Pattern:** Singleton reused across all requests; no connection pool management needed (handled by Supabase SDK)

### Async Opportunities

**Current:** All API routes are synchronous (`def`, not `async def`)

**Potential:** Convert Supabase/Gemini calls to async for better concurrency under load

**Trade-off:** Added complexity vs. current simplicity; acceptable for MVP scale

---

## Data Lifecycle

### Retention

**Policy:** Not defined in code; all records persist indefinitely

**Expected Behavior:**
- Supabase: Retained until manually deleted or Supabase project removed
- In-Memory: Cleared on backend restart

**Recommendation:** Define retention policy for predictions, vitals, agent_logs (e.g., 90 days)

### Backup

**Supabase:** Automatic backups per Supabase plan (daily for paid tiers)

**In-Memory:** Not backed up; development/demo data only

**ML Artifacts:** `backend/ml/models/` should be backed up after training; not dynamically generated

---

*Data & integration analysis: 2026-10-13*
