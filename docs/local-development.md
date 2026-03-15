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

The unpacked extension now defaults to the private `srv` deployment. For local development, update the extension options back to:
- backend: `http://localhost:8000`
- dashboard: `http://localhost:3000`

For the private `srv` deployment, use:
- backend: `http://100.124.230.107:8001`
- dashboard: `http://100.124.230.107:3000`

## Environment Variables

### Database
- `DATABASE_URL`
- `COMPOSE_DATABASE_URL`
- `POSTGRES_BIND_IP`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`

### Backend server
- `BACKEND_BIND_IP`
- `BACKEND_PORT`

### Frontend server
- `FRONTEND_BIND_IP`
- `FRONTEND_PORT`
- `NEXT_PUBLIC_API_BASE_URL`

### Hermes AI gateway
- `HERMES_BASE_URL`
- `HERMES_SERVICE_TOKEN`
- `HERMES_PROVIDER`
- `HERMES_MODEL`
- `HERMES_TIMEOUT_SECONDS`

### Gmail integration
- `AUTH_BASE_URL`
- `AUTH_SERVICE_TOKEN`
- `FRONTEND_BASE_URL`
- `GMAIL_SYNC_RECENT_THREADS`
- `GMAIL_SYNC_SEARCH_PER_APPLICATION`

## Hermes Configuration
Jobby no longer talks to OpenAI-compatible providers or Codex directly. The backend sends structured generation requests to Hermes, and Hermes owns provider routing.

Typical setup:

```env
HERMES_BASE_URL=http://localhost:8010
HERMES_SERVICE_TOKEN=local-dev-token
HERMES_PROVIDER=
HERMES_MODEL=
HERMES_TIMEOUT_SECONDS=180
```

Notes:
- Hermes should be running before you trigger application generation in Jobby
- provider-specific credentials and Codex configuration now live in the Hermes repo, not Jobby
- Jobby keeps the application-specific prompt while Hermes handles transport, auth, and provider execution
- if you run Jobby locally, ensure Hermes is also started with its `.env` loaded

## Useful Commands

### Backend tests
```bash
make test-backend
```

### Hermes smoke test
```bash
make smoke-hermes
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

## Gmail Setup Notes
- deploy and configure the shared auth service at `https://auth.dimy.dev`
- add `AUTH_BASE_URL` and `AUTH_SERVICE_TOKEN` to Jobby `.env`
- connect Google through the application detail page, which now starts the flow at the shared auth service
- use `Refresh Threads` on the application page to fetch recent recruiter mail plus targeted company searches for saved applications

## Private `srv` Deploy
- repo path: `/srv/stacks/jobby`
- deploy script: `/srv/stacks/jobby/bin/deploy.sh`
- compose file: `infra/docker-compose.yml`
- runtime data path: `runtime/postgres`
- boot behavior: services use Docker `restart: unless-stopped`, so they should return after reboot once deployed successfully
- recommended private bind values on `srv`:
  - `FRONTEND_BIND_IP=100.124.230.107`
  - `BACKEND_BIND_IP=100.124.230.107`
  - `POSTGRES_BIND_IP=127.0.0.1`

## Common Failure Modes

### Frontend build fails on missing ESLint
Ensure frontend dependencies are installed before building:

```bash
cd frontend
npm install
```

### Hermes calls fail
Check:
- `HERMES_BASE_URL` points at a running Hermes instance
- `HERMES_SERVICE_TOKEN` matches the Hermes service token
- Hermes itself is configured with a working provider

### Generation endpoint returns validation errors
The application must already contain:
- a sufficiently long `job_description`
- a sufficiently long `cv_used`

### Gmail connect or sync fails
Check:
- `AUTH_BASE_URL` points to the running shared auth service
- `AUTH_SERVICE_TOKEN` matches the token configured on the shared auth service
- `FRONTEND_BASE_URL` points to your running Next.js app
