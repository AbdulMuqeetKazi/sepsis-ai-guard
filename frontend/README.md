# SepsisAI Guard — Frontend

React + Vite frontend for the SepsisAI Guard clinical decision-support prototype.

## Setup

```bash
cd frontend
npm install
copy .env.example .env   # Windows
```

Configure:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Run

```bash
npm run dev
```

Open http://127.0.0.1:5173

## Build

```bash
npm run build
```

## Routes

Public: `/`, `/login`

Protected: `/dashboard`, `/predict`, `/predict/result`, `/patients`, `/history`, `/alerts`, `/assistant`, `/feedback`, `/model-performance`, `/settings`

## Notes

- Firebase Google Sign-In protects frontend routes.
- Gemini and Supabase secrets stay on the backend only.
- ML prediction runs through `POST /predict`; Gemini assistant calls use `/agent/*` endpoints.
