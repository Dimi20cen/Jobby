# Local Development

Read when:
- you are setting up the repo on a new machine
- you want the fastest day-to-day dev loop
- you are debugging environment, Docker, or provider configuration issues

Related docs:
- [Docs Index](./README.md)
- [Architecture](./architecture.md)
- [Extension](./extension.md)
- [Backend API](./backend-api.md)

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

## Recommended Dev Loop

For day-to-day development, use a hybrid setup:
- Postgres in Docker
- backend locally with auto-reload
- frontend locally with Next.js dev mode
- Chrome extension loaded unpacked

This is much faster than rebuilding the full Docker stack after each change.

### Fast path

Install dependencies once:

```bash
make install
```

Then run everything with one command:

```bash
make dev
```

That command:
- starts Postgres in Docker
- starts FastAPI locally with `--reload`
- starts Next.js locally with hot reload
- keeps running until you stop it with `Ctrl+C`

So no, you should not need to rerun it after every code change. Backend and frontend changes reload automatically.

### Multi-terminal option
If you prefer separate logs, use:

```bash
make dev-split
```

Then run the three commands it prints.

If you want a Postgres-only Compose file instead of the main stack, use:

```bash
docker compose -f infra/docker-compose.dev.yml --env-file .env up
```

The extension should point to:
- backend: `http://localhost:8000`
- dashboard: `http://localhost:3000`

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
make test-backend
```

### Frontend build
```bash
make build-frontend
```

### Frontend local dev
```bash
make dev-frontend
```

### Backend local dev
```bash
make dev-backend
```

### Helpful shortcuts
```bash
make help
make dev
make dev-split
make up
make down
make logs
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
