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
