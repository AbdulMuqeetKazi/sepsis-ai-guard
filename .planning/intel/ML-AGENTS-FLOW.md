# ML Pipeline & Agent Orchestration

**Analysis Date:** 2026-10-13

## ML Training Pipeline

### Overview

**Purpose:** Train and evaluate sepsis prediction models; persist the best-performing pipeline

**Selection Criteria:** **Recall > F1 > ROC-AUC** (prioritizes sepsis detection over false positive reduction)

**Best Model:** XGBoost (recall: 0.636, F1: 0.131, ROC-AUC: 0.814)

### Pipeline Scripts

Located in `backend/ml/`:

1. **`preprocess_data.py`** - Unify datasets into common 26-feature schema
2. **`train_model.py`** - Train candidates, select best, persist artifacts
3. **`evaluate_model.py`** - [Present but not analyzed]
4. **`predict_test.py`** - [Present but not analyzed]
5. **`config.py`** - Shared paths and feature configuration

### Training Configuration

**File:** `backend/ml/config.py`

**Constants:**
- `RANDOM_STATE = 42` - Reproducibility seed
- `TEST_SIZE = 0.2` - Train/test split ratio
- `MODEL_VERSION = "1.0.0"`

**Feature Schema:** 26 clinical parameters (COMMON_FEATURES list)

**Paths:**
- Input: `ml/data/raw/sepsis_prediction_dataset1.csv`, `ml/data/raw/Dataset.csv`
- Processed: `ml/data/processed/combined_sepsis_dataset.csv`
- Model: `ml/models/sepsis_model.pkl`
- Features: `ml/models/feature_columns.pkl`
- Metadata: `ml/models/model_metadata.json`
- Reports: `ml/reports/metrics.json`, `ml/reports/confusion_matrix.png`, `ml/reports/feature_importance.csv`

### Preprocessing Pipeline

**File:** `backend/ml/train_model.py` lines 78-113

**Numeric Features:**
1. SimpleImputer (strategy='median')
2. StandardScaler (z-score normalization)

**Categorical Features:**
1. SimpleImputer (strategy='most_frequent')
2. OneHotEncoder (handle_unknown='ignore', sparse_output=False)

**Transformer:** ColumnTransformer combines both pipelines

**Automatic Detection:** Numeric vs categorical determined via `X.select_dtypes(include=[np.number])`

### Model Candidates

**File:** `backend/ml/train_model.py` lines 125-150

1. **Logistic Regression**
   - `class_weight='balanced'`
   - `max_iter=1000`
   - `n_jobs=-1`

2. **Random Forest**
   - `n_estimators=100`
   - `class_weight='balanced'`
   - `n_jobs=-1`

3. **XGBoost** ✓ Selected
   - `n_estimators=200`
   - `max_depth=6`
   - `learning_rate=0.1`
   - `scale_pos_weight=<calculated>` (negative/positive ratio for imbalanced data)
   - `eval_metric='logloss'`
   - `tree_method='hist'`
   - `n_jobs=-1`

### Model Selection Logic

**File:** `backend/ml/train_model.py` lines 166-187

**Ranking:**
```python
sorted(
    all_metrics.items(),
    key=lambda item: (
        item[1]["recall"],      # Primary: maximize sepsis detection
        item[1]["f1_score"],    # Secondary: balance precision/recall
        item[1]["roc_auc"],     # Tertiary: overall discrimination
    ),
    reverse=True,
)
```

**Why Recall Priority:** Missing a sepsis case (false negative) has higher clinical cost than a false positive

### Trained Model Metrics

**Source:** `backend/ml/models/model_metadata.json`

**XGBoost (Selected):**
- Accuracy: 0.831
- Precision: 0.073
- **Recall: 0.636** ← Selection driver
- F1: 0.131
- ROC-AUC: 0.814

**Confusion Matrix (Test Set):**
```
                 Predicted
               Non-Sepsis  Sepsis
Actual
Non-Sepsis      242,665    47,967  (TN, FP)
Sepsis            2,166     3,787  (FN, TP)
```

**Interpretation:**
- **True Positives:** 3,787 sepsis cases correctly identified (63.6% of actual sepsis)
- **False Negatives:** 2,166 sepsis cases missed (36.4%)
- **False Positives:** 47,967 non-sepsis flagged as sepsis (high FP rate drives low precision)
- **True Negatives:** 242,665 non-sepsis correctly cleared

**Trade-off:** Model prioritizes catching sepsis (high recall) at the cost of many false alarms (low precision). Acceptable for clinical screening where false negatives are costlier.

### Artifacts Generated

**File:** `backend/ml/train_model.py` lines 307-380

1. **sepsis_model.pkl** - Full sklearn Pipeline (preprocessing + XGBoost)
2. **feature_columns.pkl** - 26-item ordered list
3. **model_metadata.json** - Training date, metrics, selection criteria
4. **metrics.json** - All candidate model metrics
5. **confusion_matrix.png** - Matplotlib heatmap
6. **feature_importance.csv** - XGBoost feature_importances_ (top features by gain)
7. **model_metrics.json** - Frontend-compatible format (lines 350-380)

### Feature Importance

**Extraction:** `backend/ml/train_model.py` lines 226-253

**Method:** `estimator.feature_importances_` from XGBoost

**Output:** CSV with feature names and importance scores, sorted descending

**Note:** Feature names post-transformation include OneHotEncoded categorical expansions (e.g., `gender_Male`, `gender_Female`)

---

## Inference Service

### PredictionService

**File:** `backend/app/services/prediction_service.py`

**Singleton Pattern:** Module-level `prediction_service` instance (line 121)

**Lifecycle:**
1. Instantiated at module load
2. `load_model()` called during FastAPI lifespan startup (`main.py` line 24)
3. Loads model, feature columns, metadata from disk
4. Ready for inference via `predict_probability()`

### Model Loading

**Method:** `load_model()` (lines 68-97)

**Steps:**
1. Load `sepsis_model.pkl` via `joblib.load()` → full sklearn Pipeline
2. Load `feature_columns.pkl` or fallback to `DEFAULT_FEATURES` if missing
3. Load `model_metadata.json` or use defaults
4. Set `_loaded = True`

**Error Handling:**
- FileNotFoundError: Logs error, API returns 503 on prediction attempts
- RuntimeError: Logs error, startup continues (allows API to run without model for health checks)

### Inference

**Method:** `predict_probability(patient_features)` (lines 99-113)

**Steps:**
1. Extract features in correct order: `{col: patient_features.get(col) for col in self._feature_columns}`
2. Build single-row DataFrame: `pd.DataFrame([row])`
3. Call `self._model.predict_proba(input_df)[0, 1]` → probability of class 1 (sepsis)
4. Round via `safe_round(proba)` helper
5. Return float between 0.0 and 1.0

**Missing Features:** Handled gracefully (None values pass through; imputation occurs in pipeline)

**Binary Prediction:** `predict_class(probability)` (lines 115-117) applies threshold (default 0.5)

### Feature Schema (26 Parameters)

**Source:** `backend/app/services/prediction_service.py` lines 16-43

```python
DEFAULT_FEATURES = [
    "age",                      # years
    "gender",                   # categorical: Male/Female
    "heart_rate",               # bpm
    "respiratory_rate",         # breaths/min
    "temperature",              # °C
    "systolic_bp",              # mmHg
    "diastolic_bp",             # mmHg
    "map",                      # mean arterial pressure, mmHg
    "spo2",                     # oxygen saturation, %
    "wbc_count",                # white blood cells, ×10⁹/L
    "platelet_count",           # ×10⁹/L
    "hemoglobin",               # g/dL
    "lactate",                  # mmol/L
    "creatinine",               # mg/dL
    "bilirubin",                # mg/dL
    "blood_urea_nitrogen",      # mg/dL
    "glucose",                  # mg/dL
    "ph_level",                 # arterial pH
    "pao2",                     # arterial oxygen, mmHg
    "paco2",                    # arterial CO2, mmHg
    "sofa_score",               # Sequential Organ Failure Assessment
    "qsofa_score",              # Quick SOFA
    "gcs_score",                # Glasgow Coma Scale
    "urine_output",             # mL (time period unspecified)
    "shock_index",              # heart_rate / systolic_bp
    "icu_los",                  # ICU length of stay, days
]
```

**Optional:** All features optional in API schema; missing values imputed during inference

---

## Agent Orchestration

### AgentOrchestrator

**File:** `backend/app/agents/agent_orchestrator.py`

**Singleton:** Module-level `orchestrator` instance (line 141)

**Purpose:** Coordinates all agents for a single sepsis assessment request

**Agent Pipeline:** MonitoringAgent → PredictionAgent → ReasoningAgent → AlertAgent

### Orchestration Flow

**Method:** `orchestrator.run(patient_input, patient_id)` (lines 29-137)

**Steps:**

#### 1. Patient & Vitals Persistence (Non-Blocking)

**Lines:** 40-52

```python
patient_result = supabase_service.create_or_get_patient(
    patient_code=patient_id,
    demographics={"age": ..., "gender": ...},
)
if patient_result.get("patient_uuid"):
    patient_uuid = patient_result["patient_uuid"]
    vitals_result = supabase_service.save_patient_vitals(patient_uuid, patient)
else:
    logger.warning("Patient persistence skipped: %s", ...)
```

**Behavior:** Failure logged but does not block pipeline

#### 2. MonitoringAgent

**Lines:** 55-56

**Purpose:** Check vitals against clinical thresholds, flag abnormalities

**Output:**
```python
{
    "agent": "MonitoringAgent",
    "status": "abnormal" | "normal",
    "flags": ["tachycardia", "fever", "hyperlactatemia", ...],
    "flag_count": 3
}
```

#### 3. PredictionAgent

**Lines:** 58-60

**Purpose:** Execute ML inference

**Output:**
```python
{
    "agent": "PredictionAgent",
    "sepsis_probability": 0.725,
    "prediction": 1,  # 0 or 1
    "model_name": "XGBoost",
    "model_version": "v1.0.0"
}
```

#### 4. ReasoningAgent

**Lines:** 62-63

**Purpose:** Generate human-readable explanations and risk tier

**Output:**
```python
{
    "agent": "ReasoningAgent",
    "risk_level": "High Risk",
    "explanation": [
        "Elevated lactate (3.8 mmol/L); associated with tissue hypoperfusion in sepsis.",
        "Low systolic blood pressure (88 mmHg); may suggest hemodynamic compromise.",
        ...
    ],
    "recommendation": "Urgent doctor review recommended..."
}
```

#### 5. AlertAgent

**Lines:** 65

**Purpose:** Decide if clinical alert should be raised

**Output:**
```python
{
    "agent": "AlertAgent",
    "alert_required": True,  # if High/Critical or probability >= 0.61
    "severity": "high" | "critical",
    "risk_level": "High Risk",
    "sepsis_probability": 0.725,
    "patient_id": "P001",
    "message": "Sepsis risk alert (High Risk): probability 72.50%. Clinical review recommended."
}
```

#### 6. Database Persistence (Non-Blocking)

**Lines:** 78-116

**Prediction Record:**
```python
supabase_service.save_prediction(
    patient_uuid, vitals_id, probability, risk_level, prediction,
    model_version, explanation, recommendation
)
```

**Agent Logs:** One row per agent (4 total)

**Alert Record:** Only if `should_escalate(risk_level)` (High or Critical)

**Behavior:** Failures logged but do not block response

#### 7. Response Construction

**Lines:** 125-137

**Returns:** `PredictionResponse` with:
- `sepsis_probability`
- `risk_level`
- `prediction` (0 or 1)
- `explanation` (list of strings)
- `recommendation`
- `agent_summary` (trimmed reasoning for API size)
- `model_version`
- `patient_uuid`, `vitals_id`, `prediction_id`, `alert_id` (UUIDs or None)

---

## Individual Agent Details

### MonitoringAgent

**File:** `backend/app/agents/monitoring_agent.py`

**Purpose:** Rule-based vital sign screening

**Thresholds:** Imported from `explanation_service.THRESHOLDS`

**Logic:**
```python
if heart_rate > 100.0: flags.append("tachycardia")
if temperature > 38.0: flags.append("fever")
if systolic_bp < 90.0: flags.append("hypotension")
if map < 65.0: flags.append("low_map")
if spo2 < 94.0: flags.append("hypoxemia")
if lactate > 2.0: flags.append("hyperlactatemia")
if wbc_count < 4.0 or > 12.0: flags.append("abnormal_wbc")
```

**Output:** Status ('normal' or 'abnormal'), list of flags, flag count

**Use Case:** Early warning for clinical team, enriches reasoning explanations

### PredictionAgent

**File:** `backend/app/agents/prediction_agent.py`

**Purpose:** ML inference wrapper

**Wraps:** `prediction_service.predict_probability()` and `predict_class()`

**Logic:**
1. Call `service.predict_probability(patient)` → float
2. Call `service.predict_class(probability)` → 0 or 1
3. Extract model metadata (name, version)
4. Return structured dict

**No Business Logic:** Pure ML execution

### ReasoningAgent

**File:** `backend/app/agents/reasoning_agent.py`

**Purpose:** Human-readable clinical reasoning

**Components:**
1. **Explanation Generation:** `explanation_service.generate_explanations(patient)` - rule-based vitals checks
2. **Risk Tier:** `risk_service.get_risk_level(probability)` - threshold mapping
3. **Recommendation:** `risk_service.get_recommendation(risk_level)` - safe guidance text

**Enrichment Logic (lines 24-31):**
- If MonitoringAgent flagged issues not covered by explanation rules, append monitoring flags
- Example: "Monitoring agent flagged: hypoxemia."

**Risk Tiers:**
```python
0.00 - 0.30  → Low Risk
0.31 - 0.60  → Medium Risk
0.61 - 0.80  → High Risk
0.81 - 1.00  → Critical Risk
```

**Source:** `backend/app/services/risk_service.py` lines 32-48

**Recommendations:**
- **Low Risk:** "Continue routine monitoring."
- **Medium Risk:** "Repeat vitals and arrange a clinical review."
- **High Risk:** "Urgent doctor review recommended."
- **Critical Risk:** "Immediate clinical attention recommended."

**Source:** `backend/app/services/risk_service.py` lines 12-28

### AlertAgent

**File:** `backend/app/agents/alert_agent.py`

**Purpose:** Escalation decision logic

**Criteria:**
1. `should_escalate(risk_level)` → True if "High Risk" or "Critical Risk"
2. OR `probability >= alert_probability_threshold` (default 0.61)

**Severity Mapping:**
- `"Critical Risk"` → severity='critical'
- `"High Risk"` → severity='high'

**Output:** alert_required boolean, severity, message

**Non-Alert Response:** If Low/Medium risk: `"No alert required at current risk level."`

---

## Explanation Service (Rule-Based)

**File:** `backend/app/services/explanation_service.py`

**Purpose:** Generate clinical explanations from patient features

**Method:** `generate_explanations(patient)` (lines 29-97)

**Clinical Thresholds:**
```python
THRESHOLDS = {
    "heart_rate_high": 100.0,
    "temperature_high": 38.0,
    "systolic_bp_low": 90.0,
    "map_low": 65.0,
    "spo2_low": 94.0,
    "lactate_high": 2.0,
    "wbc_low": 4.0,
    "wbc_high": 12.0,
    "creatinine_high": 1.2,
    "sofa_high": 2.0,
    "qsofa_high": 2.0,
}
```

**Pattern:**
```python
if heart_rate > THRESHOLDS["heart_rate_high"]:
    explanations.append(
        f"Elevated heart rate detected ({hr} bpm); tachycardia may indicate physiological stress."
    )
```

**Features Checked:**
- Heart rate → Tachycardia
- Temperature → Fever
- Systolic BP / MAP → Hypotension / hemodynamic compromise
- SpO2 → Hypoxemia
- Lactate → Tissue hypoperfusion
- WBC count → Infection / immune dysregulation
- Creatinine → Acute kidney involvement
- SOFA score → Organ dysfunction severity
- qSOFA score → Quick sepsis screening criteria

**Output:** List of human-readable explanation strings with units

---

## Gemini Integration (Optional)

### GeminiService

**File:** `backend/app/services/gemini_service.py`

**Purpose:** Clinical assistant for explanations, summaries, chat

**SDK:** `google-genai` (google.genai.Client)

**Initialization:** Lazy (on first use), cached via `_client_initialized` flag

**Enabled When:**
1. `GEMINI_API_KEY` environment variable set
2. `ENABLE_GEMINI_AGENT=true`

**Fallback:** If unavailable (no API key, import error, API failure), uses rule-based responses

### Agent Endpoints

**File:** `backend/app/api/agent_routes.py`

#### POST /agent/explain

**Purpose:** Generate clinical explanation from ML output and vitals

**Flow:**
1. `gemini_service.explain(...)` called
2. `agent_prompt_service.build_explain_prompt(...)` constructs user prompt with patient context
3. `gemini_service.generate_text(prompt, max_output_tokens=512)` calls Gemini API
4. If successful: return (text, "gemini")
5. If failed: return (`agent_prompt_service.fallback_explanation(...)`, "fallback")

**Model:** `gemini-2.5-flash` (configurable via `GEMINI_MODEL`)

**Temperature:** 0.2 (deterministic)

#### POST /agent/summary

**Purpose:** Short clinical summary for dashboard or handoff

**Flow:** Same as `/explain` with `max_output_tokens=256`

#### POST /agent/chat

**Purpose:** Answer scoped questions about prediction result

**Scope Filtering:** `agent_prompt_service.is_in_scope(message)` checks if query is sepsis-related

**Out-of-Scope Reply:** "I can only answer questions about sepsis risk, vitals, alerts, and monitoring."

**Flow:** Same as `/explain` with `max_output_tokens=400`

#### POST /agent/voice-query

**Purpose:** Brief spoken-friendly answer for TTS playback

**Flow:** Same as `/chat` with `max_output_tokens=160`, `temperature=0.1` (extra deterministic)

### System Instruction

**Source:** `backend/app/services/agent_prompt_service.py` [Not read but referenced in gemini_service.py line 73]

**Attached to:** Every Gemini request via `config.system_instruction`

**Purpose:** Scope Gemini to clinical sepsis assistant role, prevent off-topic responses

---

## Data Flow Summary

### Prediction Request → Response

```
1. POST /predict {patient vitals, patient_id}
   ↓
2. predict.py:predict_sepsis()
   ↓
3. orchestrator.run(request, patient_id)
   ↓
4. [Optional] Supabase: create_or_get_patient() → patient_uuid
   [Optional] Supabase: save_patient_vitals() → vitals_id
   ↓
5. MonitoringAgent.run() → flags: ["tachycardia", "hyperlactatemia"]
   ↓
6. PredictionAgent.run() → probability: 0.725, prediction: 1
   ↓
7. ReasoningAgent.run() → risk_level: "High Risk", explanations: [...], recommendation: "..."
   ↓
8. AlertAgent.run() → alert_required: True, severity: "high", message: "..."
   ↓
9. [Optional] Supabase: save_prediction() → prediction_id
   [Optional] Supabase: save_agent_log() × 4
   [Optional] Supabase: save_alert() → alert_id (if High/Critical)
   ↓
10. PredictionResponse assembled
   ↓
11. JSON response to frontend
   ↓
12. Frontend: PredictionContext updated
   ↓
13. Navigate to /prediction-result
```

**Non-Blocking Points:** All Supabase operations (steps 4, 9) log failures but do not raise exceptions

---

## Performance Characteristics

### Model Loading

**Time:** ~1-2 seconds on startup (logged in `main.py` lifespan)

**Memory:** ~50-100MB for XGBoost model + sklearn pipeline

**Threading:** Single-threaded (model loaded once at startup, reused across requests)

### Inference Latency

**Typical:** 20-50ms per prediction (DataFrame construction + XGBoost predict_proba)

**Agent Pipeline Overhead:** +10-30ms (rule evaluations, string formatting)

**Supabase Writes:** +50-200ms (non-blocking, does not affect response time)

**Gemini Calls:** +500-2000ms (when enabled; fallback is instant)

---

## Error Handling

### Model Not Loaded

**Check:** `prediction_service.is_loaded` (predict.py line 20)

**Response:** 503 Service Unavailable, `"Model not loaded. Ensure sepsis_model.pkl exists and restart the API."`

### Inference Failure

**Caught:** RuntimeError in `predict_probability()` (prediction_service.py line 111)

**Logged:** Exception with stack trace

**Response:** 500 Internal Server Error, `"Prediction failed"`

### Supabase Failures

**Pattern:** Try/except in every `supabase_service.*` method

**Behavior:** Log warning, return `{"saved": False, "error": str(exc)}`

**API Impact:** None (pipeline continues, UUIDs returned as None)

### Gemini Failures

**Pattern:** Try/except in `gemini_service.generate_text()` (line 84)

**Behavior:** Log warning, return None

**Fallback:** Rule-based response via `agent_prompt_service.fallback_*()` methods

**Source Tracking:** Response includes `"source": "gemini" | "fallback"` so frontend knows origin

---

*ML & Agent analysis: 2026-10-13*
