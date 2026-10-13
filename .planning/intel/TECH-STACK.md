# Technology Stack

**Analysis Date:** 2026-10-13

## Backend Stack

### Core Framework
- **FastAPI** (>=0.110.0) - Modern async Python web framework
- **Uvicorn[standard]** (>=0.27.0) - ASGI server with standard dependencies
- **Python** - [Version unspecified in requirements; inferred 3.10+ from type hints]

### Machine Learning Libraries
- **XGBoost** (>=2.0.0) - Primary model algorithm (gradient boosting)
- **scikit-learn** (==1.4.0) - ML pipeline, preprocessing, metrics
- **pandas** (>=2.0.0) - Data manipulation
- **numpy** (>=1.24.0) - Numerical operations
- **joblib** (>=1.3.0) - Model serialization

### Data Validation & Configuration
- **Pydantic** (>=2.0.0) - Request/response schemas, data validation
- **pydantic-settings** (>=2.0.0) - Environment-based configuration
- **python-dotenv** (>=1.0.0) - .env file loading

### Optional Integrations
- **supabase** (>=2.0.0) - PostgreSQL database persistence (optional, graceful degradation)
- **google-genai** (>=1.0.0) - Gemini clinical assistant (optional, fallback to rule-based)

### Supporting Tools
- **matplotlib** (>=3.7.0) - Confusion matrix visualization
- **openpyxl** (>=3.1.0) - Excel file support for datasets
- **graphviz** (>=0.20.0) - Architecture diagram generation

### Model Artifacts
- `backend/ml/models/sepsis_model.pkl` - Trained XGBoost pipeline (with preprocessing)
- `backend/ml/models/feature_columns.pkl` - 26-feature ordered list
- `backend/ml/models/model_metadata.json` - Model version, training date, metrics
- `backend/ml/models/model_metrics.json` - Frontend-compatible metrics format

## Frontend Stack

### Core Framework
- **React** (18.3.1) - UI library
- **TypeScript** (^5.7.3) - Type-safe JavaScript
- **Vite** (6.3.5) - Build tool and dev server
- **React Router DOM** (^7.13.0) - Client-side routing

### UI Libraries
- **Radix UI** (1.x) - Headless accessible components
  - accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, progress, scroll-area, select, separator, slot, tabs, tooltip
- **Tailwind CSS** (4.1.12) - Utility-first styling
- **@tailwindcss/vite** (4.1.12) - Vite plugin
- **Lucide React** (0.487.0) - Icon library
- **class-variance-authority** (0.7.1) - Component variant utilities
- **clsx** (2.1.1) + **tailwind-merge** (3.2.0) - Conditional class merging

### Data & Visualization
- **Recharts** (2.15.2) - Chart library for model performance metrics

### HTTP & Authentication
- **Axios** (^1.7.9) - HTTP client with interceptors
- **Firebase** (^11.2.0) - Authentication (Google OAuth)

### Build Configuration
- **ESNext** module system
- **ES2020** target
- **Path alias:** `@/*` → `src/*`
- **Port:** 5173 (dev server default)

## Environment Configuration

### Backend (.env)
```bash
# Optional — API works without these
SUPABASE_URL=<url>
SUPABASE_KEY=<anon-key>
GEMINI_API_KEY=<key>
ENABLE_GEMINI_AGENT=false

# Thresholds
ALERT_PROBABILITY_THRESHOLD=0.61
PREDICTION_THRESHOLD=0.5

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
```

**Source:** `backend/app/core/config.py`

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_FIREBASE_API_KEY=<key>
VITE_FIREBASE_AUTH_DOMAIN=<domain>
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<app-id>
```

**Source:** `frontend/src/config/firebase.ts`, `frontend/src/config/api.ts`

## CORS Configuration

**Allowed Origins:** `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`

**Credentials:** Enabled

**Methods:** All (`["*"]`)

**Headers:** All (`["*"]`)

**Source:** `backend/app/main.py` lines 52-58

## Package Managers

### Backend
- **pip** - Python package installer
- **Lockfile:** Not present (requirements.txt only)

### Frontend
- **npm** or **yarn** or **pnpm** - [Not specified; package.json present without lockfile in context]
- **Lockfile:** [Status unknown]

## Development Commands

### Backend
```bash
# Install
pip install -r backend/requirements.txt

# Train model
python -m ml.train_model

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Preview
npm run preview
```

**Source:** `frontend/package.json` scripts section

## Platform Requirements

### Backend Development
- Python 3.10+ (inferred from type hints like `dict[str, Any]`)
- UNIX or Windows (PowerShell detected in environment)
- 2GB+ RAM (XGBoost model loading)

### Frontend Development
- Node.js (version unspecified; Vite 6.x typically requires Node 18+)

### Production
- Backend: ASGI-compatible server (Uvicorn, Gunicorn + Uvicorn workers)
- Frontend: Static hosting (Vercel, Netlify, S3 + CloudFront)
- Database: Supabase (PostgreSQL) - optional

## Model Training Pipeline

### Input Datasets
- `backend/ml/data/raw/sepsis_prediction_dataset1.csv`
- `backend/ml/data/raw/Dataset.csv`

### Processing
- Unified 26-feature schema across datasets
- Missing value imputation (median for numeric, most_frequent for categorical)
- StandardScaler normalization
- OneHotEncoder for categorical features
- ColumnTransformer pipeline

### Model Selection
- Candidates: Logistic Regression, Random Forest, XGBoost
- Selection criteria: **Recall > F1 > ROC-AUC** (prioritizes sepsis detection)
- Best model: XGBoost (200 estimators, max_depth=6, learning_rate=0.1)

### Artifacts
- Model: `sepsis_model.pkl` (full sklearn Pipeline with preprocessing)
- Features: `feature_columns.pkl` (26-item list)
- Metadata: `model_metadata.json` (training date, metrics, version)
- Reports: `confusion_matrix.png`, `feature_importance.csv`, `metrics.json`

**Source:** `backend/ml/train_model.py`, `backend/ml/config.py`

## Feature Set (26 Clinical Parameters)

1. age
2. gender
3. heart_rate
4. respiratory_rate
5. temperature
6. systolic_bp
7. diastolic_bp
8. map (mean arterial pressure)
9. spo2
10. wbc_count
11. platelet_count
12. hemoglobin
13. lactate
14. creatinine
15. bilirubin
16. blood_urea_nitrogen
17. glucose
18. ph_level
19. pao2
20. paco2
21. sofa_score
22. qsofa_score
23. gcs_score
24. urine_output
25. shock_index
26. icu_los

**Source:** `backend/ml/config.py` COMMON_FEATURES, `backend/app/services/prediction_service.py` DEFAULT_FEATURES

---

*Stack analysis: 2026-10-13*
