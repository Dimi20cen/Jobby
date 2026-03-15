# Jobby

Jobby is a local-first job application manager for people actively applying to roles.

It helps you keep every application in one place, track where you are in the pipeline, store the CV and job ad used for each application, and generate AI-assisted cover letters and interview questions inside the same workflow.

## Why It Exists
Job hunting usually gets split across too many places:
- spreadsheets for tracking
- job boards for the original listing
- notes apps for follow-ups
- chat tools for rewriting application materials

Jobby pulls that workflow into one product-shaped app.

## What It Does
- create and manage application records
- track status across a simple pipeline
- store job description, CV used, notes, and job URL
- view applications in a dashboard with status filtering
- see a daily activity graph for momentum
- generate cover letters, tailored bullets, and interview questions for a saved application
- connect one Gmail account locally, refresh recruiter threads, and link them to an application
- capture jobs from the Chrome extension and reopen/update the saved application from the popup

## Current Status
This project is in active development.

The current MVP includes:
- dashboard home page
- application detail editor
- AI generation inside an application record
- Chrome extension MVP for job-board capture
- local-first Docker setup
- Hermes-backed AI generation for local use and future multi-app reuse

Jobby now delegates AI generation to the Hermes gateway, which can route requests to OpenAI-compatible providers or Codex-backed execution behind one stable internal API.

Planned next:
- Gmail integration for application-related emails
- better retrieval and application intelligence

## Quick Start
```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env up --build
```

Then open:
- `http://localhost:3000`

## Private `srv` Deploy

For a private deployment on `srv` similar to HQ:

1. Clone the repo to `/srv/stacks/jobby`
2. Copy `.env.example` to `.env`
3. Set private runtime values, for example:
   - `FRONTEND_BIND_IP=100.124.230.107`
   - `BACKEND_BIND_IP=100.124.230.107`
   - `POSTGRES_BIND_IP=127.0.0.1`
   - `NEXT_PUBLIC_API_BASE_URL=http://100.124.230.107:8001`
   - `FRONTEND_BASE_URL=http://100.124.230.107:3000`
   - `AUTH_BASE_URL=https://auth.dimy.dev`
   - `HERMES_BASE_URL=http://100.124.230.107:8010`
4. Run `/usr/bin/bash /srv/stacks/jobby/bin/deploy.sh`

After the first successful deploy, the `postgres`, `backend`, and `frontend` containers are configured with Docker `restart: unless-stopped`, so they come back automatically after host reboot unless you intentionally stop them.

This keeps Jobby private while still using Janus for the public Google OAuth callback.

## Better Dev Loop
For everyday development, use the hybrid flow:

```bash
make install
make dev
```

That runs Postgres in Docker while the backend and frontend reload locally.

## Screenshots
Screenshots and demo assets can live here as the UI matures.

## For Developers
Developer-facing documentation lives in [docs/](./docs/README.md).

That includes:
- architecture notes
- backend API documentation
- data model documentation
- extension notes
- frontend structure notes
- local development details
- roadmap notes
