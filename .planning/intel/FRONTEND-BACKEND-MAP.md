# Frontend-Backend Integration Map

**Analysis Date:** 2026-10-13

## API Client Configuration

### Base Configuration

**File:** `frontend/src/config/api.ts`

**Base URL:** `import.meta.env.VITE_API_BASE_URL` or `http://127.0.0.1:8000`

**Axios Instance:**
```typescript
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});
```

**Authentication Interceptor:**
- Runs on every request
- Retrieves Firebase `currentUser` from `auth?.currentUser`
- Calls `getIdToken()` to get JWT
- Attaches `Authorization: Bearer <token>` header
- Fails silently if Firebase not configured or user not authenticated
- **Note:** Backend does not verify tokens [UNVERIFIED]

**Source:** Lines 13-24

---

## State Management

### AuthContext

**File:** `frontend/src/context/AuthContext.tsx`

**Responsibilities:**
- Firebase authentication state management
- Google OAuth sign-in
- Sign-out with hard redirect to `/`
- Exposes `user`, `loading`, `loggingOut`, `firebaseConfigured` flags

**Key Methods:**
- `signInWithGoogle()` - Triggers Firebase popup
- `signOut()` - Logs out and redirects to landing page

**Hook:** `useAuthContext()`

**Usage:**
- `LoginPage.tsx` - Google sign-in button
- `ProtectedRoute` component - Route guards
- API interceptor - Token retrieval

### PredictionContext

**File:** `frontend/src/context/PredictionContext.tsx` [Inferred from imports]

**Responsibilities:**
- Stores latest prediction result
- Shares prediction state across pages (NewPredictionPage → PredictionResultPage)
- Provides context for AI Assistant chat

**Usage:**
- `NewPredictionPage.tsx` - Saves prediction result after submission
- `PredictionResultPage.tsx` - Displays stored prediction
- `AIAssistantPage.tsx` - Provides prediction context for agent chat

---

## Page → API Endpoint Mappings

### Landing & Authentication

| Page | File | API Endpoints | Description |
|------|------|---------------|-------------|
| Landing | `LandingPage.tsx` | None | Marketing page, links to login/dashboard |
| Login | `LoginPage.tsx` | None | Firebase Google OAuth only |

### Core Prediction Flow

| Page | File | API Endpoints | Description |
|------|------|---------------|-------------|
| New Prediction | `NewPredictionPage.tsx` | `POST /predict` | 26-parameter form, submits to prediction pipeline |
| Prediction Result | `PredictionResultPage.tsx` | None | Displays prediction from PredictionContext |

**Data Flow:**
1. User fills form in `NewPredictionPage`
2. `predictionService.predict(payload)` → `POST /predict`
3. Backend runs MonitoringAgent → PredictionAgent → ReasoningAgent → AlertAgent
4. Response saved to `PredictionContext`
5. Navigate to `PredictionResultPage`
6. Result rendered from context (probability, risk level, explanation, recommendations)

**Services:** `frontend/src/services/predictionService.ts`

### Dashboard & Monitoring

| Page | File | API Endpoints | Description |
|------|------|---------------|-------------|
| Dashboard | `DashboardPage.tsx` | `GET /dashboard` | App stats, model version, prediction counts |
| Alerts | `AlertsPage.tsx` | `GET /alerts`, `PATCH /alerts/{id}/status` | Alert list with status updates |
| Model Performance | `ModelPerformancePage.tsx` | `GET /model/metrics` | Confusion matrix, feature importance charts |

**Data Flow (Dashboard):**
1. `useEffect` calls `dashboardService.getDashboard()`
2. Backend queries Supabase or returns in-memory counts
3. Display: total patients, predictions, alerts, model version
4. Recharts renders metrics visualization

**Services:** `frontend/src/services/dashboardService.ts`, `frontend/src/services/alertService.ts`, `frontend/src/services/modelService.ts`

### Patient Management

| Page | File | API Endpoints | Description |
|------|------|---------------|-------------|
| Patients | `PatientsPage.tsx` | `GET /patients`, `POST /patients` | Patient list, registration form |
| Patient History | `PatientHistoryPage.tsx` | [UNVERIFIED] | Individual patient prediction history |

**Data Flow (Patients):**
1. `GET /patients` retrieves in-memory patient list
2. Display patient cards with demographics
3. Registration form → `POST /patients` → generates 8-char ID
4. **Note:** Patient data not persisted across backend restarts

**Gap:** Patient history endpoint not found in backend; frontend may expect Supabase direct queries or feature is incomplete.

**Services:** `frontend/src/services/patientService.ts`

### AI Assistant

| Page | File | API Endpoints | Description |
|------|------|---------------|-------------|
| AI Assistant | `AIAssistantPage.tsx` | `POST /agent/chat`, `POST /agent/voice-query`, `POST /agent/explain`, `POST /agent/summary` | Clinical assistant chat interface |

**Data Flow:**
1. User enters message in chat interface
2. Retrieves prediction context from `PredictionContext`
3. `agentService.chat(message, patientId, context)` → `POST /agent/chat`
4. Backend checks scope (sepsis-related only)
5. If Gemini enabled: calls `gemini_service.generate_text()` with prompt
6. If Gemini unavailable: returns rule-based fallback
7. Display reply in chat UI

**Voice Query:**
- Same flow, different endpoint: `POST /agent/voice-query`
- Response limited to 160 tokens for TTS compatibility

**Explain/Summary:**
- Called from prediction result page
- Generates detailed clinical explanation or summary
- Uses prediction vitals and abnormal features as context

**Services:** `frontend/src/services/agentService.ts`

### Feedback

| Page | File | API Endpoints | Description |
|------|------|---------------|-------------|
| Feedback | `FeedbackPage.tsx` | `POST /feedback`, `GET /feedback` | Clinician feedback submission and history |

**Data Flow:**
1. Form: prediction_id, actual_result, is_prediction_correct, doctor_comment
2. `feedbackService.submitFeedback(payload)` → `POST /feedback`
3. Backend saves to Supabase `feedback` table or in-memory
4. Feedback history retrieved via `GET /feedback`

**Services:** `frontend/src/services/feedbackService.ts`

### Settings

| Page | File | API Endpoints | Description |
|------|------|---------------|-------------|
| Settings | `SettingsPage.tsx` | [UNVERIFIED] | User preferences, notifications |

**Status:** [UNVERIFIED] - No backend settings endpoint found; likely frontend-only state.

---

## Service Layer Architecture

### Service Files (`frontend/src/services/`)

All services follow the same pattern:

```typescript
import { apiClient, getApiErrorMessage } from '../config/api';

export async function operation(params): Promise<ResponseType> {
  try {
    const { data } = await apiClient.post<ResponseType>('/endpoint', params);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Operation failed'));
  }
}
```

| Service File | Exports | Backend Routes |
|--------------|---------|----------------|
| `predictionService.ts` | `predict()` | `POST /predict` |
| `dashboardService.ts` | `getDashboard()` | `GET /dashboard` |
| `alertService.ts` | `getAlerts()`, `updateAlertStatus()` | `GET /alerts`, `PATCH /alerts/{id}/status` |
| `feedbackService.ts` | `submitFeedback()`, `getFeedback()` | `POST /feedback`, `GET /feedback` |
| `patientService.ts` | `getPatients()`, `registerPatient()`, `getPatientHistory()` | `GET /patients`, `POST /patients`, [missing] |
| `modelService.ts` | `getModelMetrics()` | `GET /model/metrics` |
| `agentService.ts` | `explain()`, `summary()`, `chat()`, `voiceQuery()` | `POST /agent/*` |
| `healthService.ts` | `checkHealth()` | `GET /health` |

---

## Critical Data Flows

### Prediction Submission Flow

```
User fills form (NewPredictionPage)
  ↓
predictionService.predict(patientData)
  ↓
Axios interceptor attaches Firebase JWT
  ↓
POST /predict → FastAPI predict.py:predict_sepsis()
  ↓
orchestrator.run(request)
  ↓
[MonitoringAgent] → checks vitals against thresholds
  ↓
[PredictionAgent] → loads model, runs predict_proba()
  ↓
[ReasoningAgent] → generates explanation, risk level
  ↓
[AlertAgent] → determines if alert needed (>61% threshold)
  ↓
Supabase persistence (non-blocking):
  - create_or_get_patient()
  - save_patient_vitals()
  - save_prediction()
  - save_agent_log() × 4
  - save_alert() [if High/Critical risk]
  ↓
PredictionResponse returned
  ↓
Frontend saves to PredictionContext
  ↓
Navigate to PredictionResultPage
  ↓
Display: probability, risk badge, explanation list, recommendations
```

**Source Files:**
- Frontend: `NewPredictionPage.tsx`, `predictionService.ts`, `PredictionResultPage.tsx`
- Backend: `predict.py`, `agent_orchestrator.py`, `prediction_service.py`, `supabase_service.py`

### Dashboard Load Flow

```
User navigates to /dashboard
  ↓
DashboardPage useEffect() fires
  ↓
dashboardService.getDashboard()
  ↓
GET /dashboard → dashboard.py:dashboard_summary()
  ↓
supabase_service.get_dashboard_stats()
  ↓
If Supabase configured:
  - SELECT count(*) FROM patients, patient_vitals, predictions, alerts, agent_logs, feedback
Else:
  - Return in-memory len() counts
  ↓
Response includes model metadata from prediction_service.metadata
  ↓
Frontend renders:
  - App version
  - Model name, version, loaded status
  - Total counts: patients, vitals, predictions, alerts, logs, feedback
  - Storage indicator (supabase | memory)
```

**Source Files:**
- Frontend: `DashboardPage.tsx`, `dashboardService.ts`
- Backend: `dashboard.py`, `supabase_service.py`, `prediction_service.py`

### Authentication Flow

```
User clicks "Sign in with Google" (LoginPage)
  ↓
AuthContext.signInWithGoogle()
  ↓
Firebase signInWithPopup(auth, googleProvider)
  ↓
Firebase SDK handles OAuth redirect
  ↓
User returned, onAuthStateChanged() fires
  ↓
AuthContext.user updated
  ↓
Navigate to /dashboard
  ↓
Every subsequent API request:
  - Axios interceptor retrieves user.getIdToken()
  - Attaches Authorization: Bearer <jwt>
  - Backend receives token but does not verify [UNVERIFIED]
```

**Source Files:**
- Frontend: `LoginPage.tsx`, `AuthContext.tsx`, `api.ts` (interceptor)
- Backend: [No Firebase verification found]

---

## Frontend Routing

**Router:** React Router DOM v7.13.0

**Structure:** [Inferred from page files, actual route config not read]

```
/                        → LandingPage
/login                   → LoginPage
/dashboard               → DashboardPage [Protected]
/predict                 → NewPredictionPage [Protected]
/prediction-result       → PredictionResultPage [Protected]
/patients                → PatientsPage [Protected]
/patient-history/:id     → PatientHistoryPage [Protected]
/alerts                  → AlertsPage [Protected]
/ai-assistant            → AIAssistantPage [Protected]
/model-performance       → ModelPerformancePage [Protected]
/feedback                → FeedbackPage [Protected]
/settings                → SettingsPage [Protected]
```

**Route Guards:** `ProtectedRoute` component checks `useAuthContext().user` and redirects to `/login` if null

---

## Environment Variable Dependencies

### Backend `.env` Requirements

**Required for core functionality:**
- None (API works without env vars; uses defaults)

**Optional for Supabase persistence:**
- `SUPABASE_URL`
- `SUPABASE_KEY`

**Optional for Gemini assistant:**
- `GEMINI_API_KEY`
- `ENABLE_GEMINI_AGENT=true`

**Configurable thresholds:**
- `ALERT_PROBABILITY_THRESHOLD=0.61`
- `PREDICTION_THRESHOLD=0.5`

**Source:** `backend/app/core/config.py`

### Frontend `.env` Requirements

**Required for API communication:**
- `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8000`)

**Optional for Firebase auth:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Graceful degradation:** If Firebase not configured, auth features disabled but app renders

**Source:** `frontend/src/config/firebase.ts`

---

## Data Persistence Strategy

### Primary: Supabase (Optional)

**Tables Used:**
- `patients` - Patient demographics, assigned UUID
- `patient_vitals` - Snapshot of 26 clinical parameters
- `predictions` - ML output, risk level, explanation
- `agent_logs` - Individual agent outputs (4 per prediction)
- `alerts` - High/Critical risk notifications
- `feedback` - Clinician validation feedback
- `model_versions` [Referenced but not used in code]

**Behavior:** All operations wrapped in try/except; failures logged but don't break API responses

**Source:** `backend/app/services/supabase_service.py`

### Fallback: In-Memory Dicts/Lists

**Variables:**
- `_patients: dict[str, dict]` (`patients.py` line 11)
- `_memory_patients: dict` (`supabase_service.py` line 20)
- `_memory_vitals: list` (line 21)
- `_memory_predictions: list` (line 22)
- `_memory_alerts: list` (line 23)
- `_memory_agent_logs: list` (line 24)
- `_memory_feedback: list` (line 25)

**Lifecycle:** Module-level variables; reset on backend restart

---

## Frontend Build → Backend API Flow

### Development

**Frontend:** Vite dev server on `localhost:5173`

**Backend:** Uvicorn on `localhost:8000`

**CORS:** Backend allows `http://localhost:5173`

### Production

**Frontend:** Static files built via `npm run build` → `dist/`

**Deployment Options:**
- **Option 1:** Backend serves frontend static files (add StaticFiles mount to FastAPI)
- **Option 2:** Frontend on CDN/Vercel, backend on separate domain (update CORS)

**API Base URL:** Set `VITE_API_BASE_URL` to production backend URL before build

---

## Known Integration Gaps

### 1. Firebase Token Verification

**Issue:** Frontend sends Firebase JWT in `Authorization` header, but backend does not verify it

**Impact:** API is effectively open; anyone with the base URL can call endpoints

**Files:**
- Frontend: `api.ts` lines 13-24 (sends token)
- Backend: No Firebase Admin SDK initialization found

**Recommendation:** Add Firebase Admin SDK verification middleware or remove auth UI

### 2. Patient History Endpoint

**Issue:** `PatientHistoryPage.tsx` exists but corresponding backend endpoint not found

**Impact:** Page may fail to load or frontend may query Supabase directly (bypassing backend)

**Files:**
- Frontend: `PatientHistoryPage.tsx`
- Backend: `patients.py` only has list/register/get-by-id

### 3. In-Memory Patient Storage Duplication

**Issue:** Both `patients.py` (`_patients` dict) and `supabase_service.py` (`_memory_patients` dict) maintain separate in-memory patient stores

**Impact:** Registering a patient via `POST /patients` doesn't propagate to prediction pipeline's Supabase service

**Files:**
- `backend/app/api/patients.py` line 11
- `backend/app/services/supabase_service.py` line 20

### 4. Settings Endpoint

**Issue:** `SettingsPage.tsx` exists but no corresponding backend endpoint

**Impact:** Settings are likely frontend-only (localStorage) or page is incomplete

---

## Type Safety

### Frontend

**TypeScript:** Strict mode enabled (`tsconfig.json` line 14)

**Type Definitions:** `frontend/src/types/api.ts` [Not read but imported across services]

**Pattern:** All API responses typed via generics:
```typescript
const { data } = await apiClient.post<PredictionResponse>('/predict', payload);
```

### Backend

**Pydantic:** All request/response models use Pydantic v2

**Validation:** Automatic via FastAPI; invalid requests return 422 with field-level errors

**Type Hints:** Comprehensive use of Python 3.10+ type hints (`dict[str, Any]`, `str | None`)

---

*Frontend-Backend integration analysis: 2026-10-13*
