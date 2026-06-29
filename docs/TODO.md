# SepsisAI Guard — TODO

Inferred from existing code comments, placeholders, and gaps. No invented features.

## High priority

- [ ] **Frontend application** — README and `render.yaml` reference a future frontend; none exists in the repo yet
- [ ] **Automated tests** — `backend/tests/` folder is empty; no unit or integration tests for API or ML pipeline

## Backend / API

- [ ] **Supabase-backed `/patients` endpoints** — `app/api/patients.py` currently uses in-memory `_patients` dict; docstring marks it as a placeholder
- [ ] **Clinician feedback learning loop** — `FeedbackAgent` and `api/feedback.py` acknowledge feedback but explicitly state retraining is planned for a future release
- [ ] **`model_versions` table integration** — table exists in Supabase but is not written by training pipeline or API

## ML pipeline

- [ ] **Wire feedback into retraining** — feedback is saved to Supabase but not consumed by `ml/train_model.py`
- [ ] **Model registry** — persist training runs to `model_versions` when retraining is implemented

## Operations

- [ ] **Render deployment** — ensure `sepsis_model.pkl` is available on server (Git LFS or build-step artifact); noted in README
- [ ] **Authentication** — no auth on API endpoints currently

## Documentation

- [ ] Render `architecture.dot` to PNG/SVG once Graphviz desktop application is installed locally
