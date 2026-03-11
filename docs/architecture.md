# Architecture

Read when:
- you need the big-picture system flow before editing code
- you are deciding whether a change belongs in frontend, backend, database, or extension
- you are onboarding and want the shortest path to understanding the app shape

Related docs:
- [Data Model](./data-model.md)
- [Backend API](./backend-api.md)
- [Frontend](./frontend.md)
- [Extension](./extension.md)
- [Local Development](./local-development.md)

## Overview
Jobby is a monorepo with a small full-stack architecture:

- `frontend/`: Next.js app router UI
- `backend/`: FastAPI application with SQLAlchemy persistence
- `infra/`: Docker Compose for local orchestration

At runtime the flow is:

1. The user opens the Next.js dashboard.
2. The frontend calls the FastAPI backend over HTTP.
3. The backend reads and writes application records in Postgres.
4. When AI generation is requested, the backend calls the Hermes AI gateway over HTTP.
5. Generated assets are stored back on the application record and returned to the frontend.

## System Responsibilities

### Frontend
- renders the dashboard, activity graph, and application detail screens
- handles optimistic UI interactions like save, delete, and generate actions
- keeps API concerns inside `frontend/lib/api.ts`
- keeps page structure in `frontend/app/` and reusable UI in `frontend/components/`

### Backend
- owns the application schema and lifecycle
- validates application creation and update rules
- exposes CRUD endpoints and the AI generation endpoint
- assembles application-specific prompts and calls Hermes for structured generation
- stores generated outputs alongside the application record

### Database
- stores a single `applications` table
- persists both management data and AI-generated artifacts
- is initialized on startup through SQLAlchemy metadata creation
- is patched forward with a lightweight startup migration helper for local evolution

## Key Runtime Paths

### Dashboard Load
The frontend home page requests:
- `GET /applications`
- `GET /applications/activity`

These two endpoints drive the main table and the contribution-style activity grid.

### Manual Application Creation
The flow is:
- user navigates to `/applications/new`
- frontend submits `POST /applications`
- backend creates a `draft` or `applied` record
- frontend redirects to `/applications/{id}`

### AI Generation
The flow is:
- user opens an existing application
- user clicks `Generate AI Assets`
- frontend calls `POST /applications/{id}/generate`
- backend validates that `job_description` and `cv_used` are long enough
- backend calls `generate_application(...)`, which sends a structured request to Hermes
- backend writes generated bullets, cover letter, interview questions, and evaluation fields back to the record

## Design Intent
The app is intentionally application-centric.

That means:
- AI is a feature within an application record, not the entrypoint
- the dashboard is the primary home screen
- product expansion should add more workflow depth around application records rather than adding disconnected generators

## Current Limitations
- no auth or multi-user separation
- browser extension ingestion is limited to manual popup capture and save/generate
- no Gmail or inbox linking yet
- no fit-with-profile scoring yet
- no formal migration system beyond startup patching for local development
