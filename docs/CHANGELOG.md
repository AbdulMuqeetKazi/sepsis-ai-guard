# Changelog

All notable documentation and infrastructure changes for SepsisAI Guard.

## [Unreleased]

### Fixed — 2026-10-13

- **Corrected critical documentation errors** — previous docs incorrectly stated frontend didn't exist
  - Updated `AI_CONTEXT.md` to reflect fully implemented React + TypeScript frontend (12 pages, 86+ source files)
  - Updated `ARCHITECTURE.md` to document frontend architecture, API integration, and authentication flow
  - Updated `TODO.md` to remove "Frontend application" from high-priority items
  - Added frontend technology stack (React, Vite, TypeScript, Tailwind, Firebase, Recharts)
  - Added Gemini assistant endpoints documentation
  - Documented authentication flow (Firebase on frontend, no backend JWT verification)
  - Clarified deployment status (backend: Render configured; frontend: not configured)

### Added — 2026-06-28

- Created `docs/` folder at project root with project documentation:
  - `AI_CONTEXT.md` — AI/developer quick reference
  - `ARCHITECTURE.md` — system architecture and data flow
  - `CHANGELOG.md` — this file
  - `TODO.md` — inferred future work from codebase
- Added `docs/diagrams/architecture.dot` — Graphviz architecture diagram (DOT source)
- Added `graphviz` Python package to `backend/requirements.txt` for diagram tooling
