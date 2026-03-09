# Local Development

## Stack
- frontend: Next.js 14 + TypeScript
- backend: FastAPI + SQLAlchemy
- database: Postgres
- local orchestration: Docker Compose

## Start the Full Stack

From repo root:

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env up --build
```

Frontend:
- `http://localhost:3000`

Backend:
- `http://localhost:8000`

## Environment Variables

### Database
- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`

### Backend server
- `BACKEND_PORT`

### Frontend server
- `FRONTEND_PORT`
- `NEXT_PUBLIC_API_BASE_URL`

### LLM provider
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `FALLBACK_MODELS`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_APP_NAME`

## Gemini Configuration
The backend treats Gemini as an OpenAI-compatible provider when configured through a compatible base URL.

Typical setup:

```env
GEMINI_API_KEY=...
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_MODEL=models/gemini-2.5-flash
FALLBACK_MODELS=models/gemini-2.5-flash-lite,models/gemini-2.0-flash-lite
```

## Useful Commands

### Backend tests
```bash
cd backend
pytest -q tests
```

### Frontend build
```bash
cd frontend
npm install
npm run build
```

### Frontend local dev
```bash
cd frontend
npm install
npm run dev
```

### Backend local dev
```bash
cd backend
uv pip install --system .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes About Persistence
- the app creates tables on startup through SQLAlchemy metadata
- local schema patching is done in `backend/app/db/migrations.py`
- for long-term shared environments, move to a formal migration flow

## Common Failure Modes

### Frontend build fails on missing ESLint
Ensure frontend dependencies are installed before building:

```bash
cd frontend
npm install
```

### LLM calls fail
Check:
- the API key variable matches the provider you are using
- `OPENAI_BASE_URL` is correct for the provider
- `OPENAI_MODEL` matches a valid model id

### Generation endpoint returns validation errors
The application must already contain:
- a sufficiently long `job_description`
- a sufficiently long `cv_used`
