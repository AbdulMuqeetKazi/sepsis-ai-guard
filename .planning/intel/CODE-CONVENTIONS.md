# Code Quality & Conventions

**Analysis Date:** 2026-10-13

## Backend Conventions (Python)

### Language & Style

**Python Version:** 3.10+ (inferred from modern type hints: `dict[str, Any]`, `str | None`)

**Type Hints:** Comprehensive usage throughout codebase
- Union types: `str | None` (PEP 604 syntax, Python 3.10+)
- Generic collections: `dict[str, Any]`, `list[str]`
- Return annotations on all functions
- Pydantic models for structured data

**Import Style:**
```python
from __future__ import annotations  # Enable forward references (common in services)

# Standard library
import json
import logging
from typing import Any

# Third-party
import pandas as pd
from fastapi import APIRouter, HTTPException

# Local app
from app.core.config import get_settings
from app.services.prediction_service import prediction_service
```

**Order:** Standard library → Third-party → Local (sorted alphabetically within groups)

### Naming Conventions

**Files:** snake_case
- `prediction_service.py`
- `agent_orchestrator.py`
- `model_metadata.json`

**Modules:** snake_case
- `app.services.prediction_service`
- `app.agents.monitoring_agent`

**Classes:** PascalCase
- `PredictionService`
- `AgentOrchestrator`
- `MonitoringAgent`

**Functions/Methods:** snake_case
- `predict_probability()`
- `create_or_get_patient()`
- `get_risk_level()`

**Variables:** snake_case
- `patient_uuid`
- `sepsis_probability`
- `feature_columns`

**Constants:** UPPER_SNAKE_CASE
- `DEFAULT_FEATURES`
- `THRESHOLDS`
- `RANDOM_STATE`
- `MODEL_VERSION`

**Private/Internal:** Leading underscore
- `_patients` (module-level dict)
- `_get_client()` (internal method)
- `_memory_alerts` (fallback storage)

### Function Design

**Parameter Style:**
- Type hints on all parameters
- Default values for optional parameters
- `| None` for nullable types
- `*` for keyword-only arguments when clarity needed

**Example:**
```python
def explain(
    self,
    *,
    patient_id: str | None,
    risk_level: str,
    sepsis_probability: float,
    vitals: dict[str, Any],
    abnormal_features: list[str],
) -> tuple[str, str]:
    ...
```

**Return Types:** Always annotated
- Explicit types: `dict[str, Any]`, `list[str]`, `tuple[str, str]`
- Pydantic models: `PredictionResponse`, `PatientRecord`
- None for procedures: `-> None`

**Docstrings:**
- Module-level: Triple-quoted summary at top of file
- Function-level: Used for public API endpoints and complex logic
- Format: Plain text, not Google/NumPy/Sphinx style
- Example:
  ```python
  """
  Supabase persistence layer for SepsisAI Guard.
  
  Loads credentials from settings. When Supabase is unavailable or not configured,
  all operations fail gracefully and the API continues to work.
  """
  ```

### Error Handling

**Pattern:** Try/except with logging + graceful degradation

**Supabase Operations:**
```python
try:
    result = client.table("patients").insert(data).execute()
    return {"saved": True, "id": result.data[0]["id"]}
except Exception as exc:
    logger.warning("Operation failed: %s", exc)
    return {"saved": False, "error": str(exc)}
```

**API Endpoints:**
```python
try:
    result = orchestrator.run(request)
    return result
except RuntimeError as exc:
    logger.exception("Prediction runtime error")
    raise HTTPException(status_code=500, detail=str(exc)) from exc
```

**Key Principle:** Non-critical failures (Supabase, Gemini) logged but don't break request flow

### Logging

**Framework:** Python `logging` module

**Configuration:** `backend/app/utils/logger.py`

**Logger Name:** `"sepsisai"`

**Format:**
```python
"%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
```

**Level:** INFO (production), DEBUG (when `debug=True` in config)

**Usage Pattern:**
```python
from app.utils.logger import logger

logger.info("Model ready — %s v%s", model_name, version)
logger.warning("Supabase not configured — persistence disabled")
logger.error("Model not found: %s", exc)
logger.exception("Unexpected prediction error")  # Includes stack trace
logger.debug("MonitoringAgent: %s", monitoring)
```

**When to Log:**
- Startup events (model loading, service initialization)
- API endpoint entry (INFO with key parameters)
- Failures (WARNING for non-critical, ERROR for critical)
- Debugging (DEBUG for agent outputs, internal state)

### Pydantic Schemas

**Location:** `backend/app/schemas/`

**Pattern:**
```python
from pydantic import BaseModel, Field

class PredictionRequest(PatientInput):
    """Patient vitals/labs used to generate a sepsis risk assessment."""
    
    patient_id: str | None = Field(
        default=None,
        description="Optional patient identifier for logging and alerts",
    )
```

**Conventions:**
- Inherit from `BaseModel`
- Use `Field()` for descriptions, validation, examples
- Docstring describes the schema's purpose
- Use `model_config` for examples, extra handling

**Validation:** Automatic via FastAPI; 422 responses for invalid requests

### Service Layer Architecture

**Pattern:** Class-based services with module-level singletons

**Example:**
```python
class PredictionService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._model: Any = None
        self._loaded = False
    
    def load_model(self) -> None:
        ...
    
    def predict_probability(self, features: dict) -> float:
        ...

# Module-level singleton
prediction_service = PredictionService()
```

**Why:** Single instance shared across requests, initialized at startup

**Files:**
- `prediction_service.py`
- `supabase_service.py`
- `gemini_service.py`
- `risk_service.py` (stateless utility functions)
- `explanation_service.py` (stateless utility functions)

### Agent Pattern

**File Structure:** One class per agent in `backend/app/agents/`

**Pattern:**
```python
class MonitoringAgent:
    """Checks incoming vitals against clinical reference thresholds."""
    
    name = "MonitoringAgent"
    
    def run(self, patient: dict[str, Any]) -> dict[str, Any]:
        # Agent logic
        return {
            "agent": self.name,
            "status": "...",
            # Agent-specific outputs
        }
```

**Conventions:**
- Class attribute `name` for logging/output identification
- Single `run()` method with standardized signature
- Returns dict with `"agent": self.name` key
- Stateless execution (no instance state carried between runs)

**Orchestration:** `AgentOrchestrator` instantiates all agents and calls `run()` in sequence

### Configuration

**File:** `backend/app/core/config.py`

**Pattern:** Pydantic Settings with environment variable loading

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    app_name: str = "SepsisAI Guard API"
    debug: bool = False
    supabase_url: str | None = None
    
    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Conventions:**
- Use `@lru_cache` for singleton settings instance
- Computed properties for derived flags (e.g., `supabase_configured`)
- Optional integrations default to `None`
- Paths computed from `Path(__file__).resolve()`

---

## Frontend Conventions (TypeScript/React)

### Language & Style

**TypeScript:** Strict mode enabled (`tsconfig.json` line 14)

**Compiler Options:**
- Target: ES2020
- Module: ESNext
- JSX: react-jsx (new JSX transform)
- Strict: true
- Path alias: `@/*` → `src/*`

### Naming Conventions

**Files:** PascalCase for components, camelCase for utilities
- `NewPredictionPage.tsx`
- `DashboardPage.tsx`
- `predictionService.ts`
- `vitalsUtils.ts`

**Components:** PascalCase
- `NewPredictionPage`
- `PageHeader`
- `ErrorBanner`

**Functions:** camelCase
- `getDashboard()`
- `predict()`
- `useAuthContext()`

**Variables:** camelCase
- `apiClient`
- `sepsisProability`
- `patientId`

**Constants:** UPPER_SNAKE_CASE
- `API_BASE_URL`
- `EMPTY_PATIENT_FORM`
- `REFERENCE_GROUPS`

**Types/Interfaces:** PascalCase
- `PredictionRequest`
- `PredictionResponse`
- `AuthContextValue`

### React Patterns

**Functional Components:** Exclusively (no class components observed)

**Hooks Usage:**
```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';

export function NewPredictionPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { savePrediction } = usePredictionSession();
  
  useEffect(() => {
    // Side effect
  }, [dependency]);
  
  const handleSubmit = useCallback(async () => {
    // Memoized callback
  }, [deps]);
  
  return <div>...</div>;
}
```

**Custom Hooks:** Prefix with `use`
- `useAuthContext()`
- `usePredictionSession()`

**Context Pattern:**
```typescript
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const value = useMemo(() => ({ user, ... }), [user, ...]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
```

**File:** `frontend/src/context/AuthContext.tsx`

### Import Organization

**Pattern:**
```typescript
// External libraries
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Info } from 'lucide-react';

// Internal components
import { Card, ErrorBanner } from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';

// Context/Services
import { usePredictionSession } from '../context/PredictionContext';
import * as predictionService from '../services/predictionService';

// Types/Utils
import type { PatientInput } from '../types/api';
import { parseNumericField } from '../utils/vitalsUtils';
```

**Order:** External → Internal components → Context/Services → Types/Utils

**Type Imports:** Use `import type` for type-only imports

### Service Layer Pattern

**Location:** `frontend/src/services/`

**Pattern:**
```typescript
import { apiClient, getApiErrorMessage } from '../config/api';
import type { RequestType, ResponseType } from '../types/api';

export async function operation(params: RequestType): Promise<ResponseType> {
  try {
    const { data } = await apiClient.post<ResponseType>('/endpoint', params);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Operation failed'));
  }
}
```

**Conventions:**
- Named exports (not default)
- Async/await (no raw promises)
- Typed Axios responses: `apiClient.post<ResponseType>`
- Consistent error handling via `getApiErrorMessage()`

### Type Definitions

**Location:** `frontend/src/types/api.ts` [Inferred from imports]

**Pattern:**
```typescript
export interface PredictionRequest {
  patient_id?: string;
  age?: number;
  gender?: string;
  // ... 26 clinical parameters
}

export interface PredictionResponse {
  sepsis_probability: number;
  risk_level: string;
  prediction: number;
  explanation: string[];
  // ...
}
```

**Convention:** Match backend snake_case field names exactly (no camelCase conversion)

### Error Handling

**Pattern:** Try/catch in services, display in components

**Service:**
```typescript
export async function predict(payload: PredictionRequest): Promise<PredictionResponse> {
  try {
    const { data } = await apiClient.post<PredictionResponse>('/predict', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Prediction request failed'));
  }
}
```

**Component:**
```typescript
const [error, setError] = useState<string | null>(null);

try {
  setError(null);
  const result = await predictionService.predict(formData);
  // Handle success
} catch (err) {
  setError(err instanceof Error ? err.message : 'An error occurred');
}

{error && <ErrorBanner message={error} />}
```

### Styling

**Framework:** Tailwind CSS 4.1.12

**Utility Classes:** Inline on JSX elements
```typescript
<div className="flex items-center gap-2 rounded-lg bg-blue-50 p-4">
  <Info className="h-5 w-5 text-blue-600" />
  <p className="text-sm text-blue-900">Clinical reference values</p>
</div>
```

**Conditional Classes:** Use `clsx` + `tailwind-merge`
```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

<button className={cn('btn', isActive && 'btn-active', className)}>
```

**Component Variants:** Use `class-variance-authority` (cva)

**No CSS Files:** All styling via Tailwind utilities (no separate .css modules)

### Linting & Formatting

**ESLint:** Not configured (`.eslintrc.*` not found)

**Prettier:** Not configured (`.prettierrc` not found)

**TypeScript Compiler:** Acts as primary linter via strict mode

**Code Style:** Consistent manually or via editor auto-format

---

## Testing

### Backend

**Status:** No tests found

**Expected Location:** `backend/tests/` or `backend/app/tests/`

**Test Files Searched:** `test_*.py`, `*_test.py` patterns — none found

**Recommendation:** Add pytest suite with unit tests for services and integration tests for API endpoints

### Frontend

**Status:** No tests found

**Expected Location:** `frontend/src/**/*.test.tsx` or `frontend/src/__tests__/`

**Test Files Searched:** `*.test.*` patterns — none found

**Framework:** None configured (no `jest.config.*`, `vitest.config.*` found)

**Recommendation:** Add Vitest (Vite-native) or Jest + React Testing Library

---

## Code Comments

### Backend

**Inline Comments:** Minimal; code is self-documenting via clear naming

**Module Docstrings:** Present at top of most files
```python
"""
Application configuration loaded from environment variables.
"""
```

**Function Docstrings:** Used for complex logic, public APIs, and unclear behavior
```python
def build_preprocessor(X: pd.DataFrame) -> tuple[ColumnTransformer, list[str], list[str]]:
    """Build ColumnTransformer for numeric and categorical features."""
```

**When to Comment:** 
- File purpose (module docstring)
- Complex algorithms (training logic, metric selection)
- Non-obvious business rules (risk tier thresholds)

### Frontend

**Inline Comments:** Section separators and clarifications

**Example from `NewPredictionPage.tsx`:**
```typescript
// ---------------------------------------------------------------------------
// Clinical Reference Values — sourced exclusively from "Feature normal value.txt"
// ---------------------------------------------------------------------------
const REFERENCE_GROUPS = [...]
```

**JSDoc:** Not widely used

**When to Comment:**
- Data source attribution
- Complex utility functions
- Non-obvious React patterns

---

## Project Structure

### Backend

```
backend/
├── app/
│   ├── api/              # Route handlers (8 modules)
│   ├── agents/           # Agent classes (6 agents)
│   ├── core/             # Config, settings
│   ├── schemas/          # Pydantic models (4 schemas)
│   ├── services/         # Business logic (6 services)
│   ├── utils/            # Helpers, logging
│   └── main.py           # FastAPI app factory
└── ml/
    ├── data/             # Raw + processed datasets
    ├── models/           # Trained artifacts
    ├── reports/          # Metrics, plots
    └── *.py              # Training scripts (5 scripts)
```

### Frontend

```
frontend/
└── src/
    ├── components/
    │   ├── common/       # Reusable UI primitives
    │   └── layout/       # Page structure
    ├── config/           # API + Firebase config
    ├── context/          # React Context providers
    ├── pages/            # Route components (12 pages)
    ├── services/         # API client wrappers (8 services)
    ├── types/            # TypeScript interfaces
    └── utils/            # Helper functions
```

---

## Git Conventions

**Ignored Files:** `.gitignore` covers:
- `__pycache__/`, `*.pyc` (Python bytecode)
- `backend/.env`, `frontend/.env` (secrets)
- `backend/venv/` (virtual environment)
- `frontend/node_modules/`, `frontend/dist/` (dependencies, build output)
- `*.log` (log files)
- `.vscode/`, `.idea/` (editor configs)

**Committed:**
- Source code (`backend/app/`, `frontend/src/`)
- ML artifacts (`backend/ml/models/*.pkl`, `*.json`)
- Configuration templates (not `.env` files)

---

## Code Quality Gaps

### Backend

1. **No Test Coverage** - Zero unit or integration tests
2. **No Type Checker** - Not running `mypy` or `pyright` in CI
3. **No Linter** - No `flake8`, `ruff`, or `pylint` enforcement
4. **No Formatter** - No `black` or `ruff format` automation
5. **Inconsistent Docstrings** - Some modules have comprehensive docs, others minimal

### Frontend

1. **No Test Coverage** - Zero component or integration tests
2. **No ESLint** - No linting rules enforced
3. **No Prettier** - No automatic formatting
4. **No Type-Checking in Build** - `npm run build` includes `tsc --noEmit` but may not fail CI
5. **No Husky/Pre-commit Hooks** - No automated checks before commit

### Recommendations

**Backend:**
- Add `pytest` + `pytest-cov` for unit tests (target 70%+ coverage)
- Add `mypy` for static type checking
- Add `ruff` for linting + formatting (replaces flake8 + black)
- Add pre-commit hooks for `ruff format`, `mypy`, `pytest`

**Frontend:**
- Add Vitest + React Testing Library
- Add ESLint + `@typescript-eslint` plugin
- Add Prettier
- Add `lint-staged` + Husky for pre-commit checks
- Enforce type-checking in CI: `tsc --noEmit` must pass

---

*Convention analysis: 2026-10-13*
