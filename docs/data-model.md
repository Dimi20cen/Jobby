# Data Model

Read when:
- you are adding or changing application fields
- you are planning schema evolution or future tables
- you need to understand what data belongs on the `Application` record today

Related docs:
- [Architecture](./architecture.md)
- [Backend API](./backend-api.md)
- [Extension](./extension.md)

## Primary Entity
The primary entity is `Application`.

This is the central product record and should remain the anchor for future features like:
- browser extension capture
- email association
- profile-fit scoring
- reminders and follow-ups

## `Application` Fields

### Identity and timestamps
- `id`: UUID primary key
- `created_at`: record creation timestamp
- `updated_at`: last update timestamp

### Core tracking fields
- `company_name`
- `job_title`
- `location`
- `status`
- `applied_date`
- `job_url`

### User-provided content
- `job_description`
- `cv_used`
- `notes`

### AI-generated content
- `cover_letter`
- `interview_questions`

### AI metadata
- `used_model`
- `relevance_score`
- `jd_coverage`
- `risk_flags`

## Status Model
Current supported statuses:
- `draft`
- `applied`
- `interview`
- `offer`
- `rejected`
- `archived`

Business rule:
- an application marked as `applied` must have an `applied_date`

## Why the Model Is Flat Right Now
The current MVP uses a single-table design to keep local development fast and keep the workflow easy to reason about.

This is good enough for:
- a single-user local-first product
- dashboard rendering
- AI generation attached to applications

It will eventually need to evolve if the app adds:
- auth and user ownership
- versioned CV artifacts
- email threads
- activity/event timelines
- browser extension capture payloads

## Likely Future Tables
These are not implemented yet, but they are the most natural next entities:

### `users`
Needed for real authentication and ownership.

### `application_events`
Would track state changes like:
- created
- applied
- interview scheduled
- rejected
- offer received

### `documents`
Would separate stored CVs, cover letters, and generated variants from the application row.

### `email_threads`
Would support Gmail linking and message previews per application.

### `job_sources`
Would support extension ingestion and normalized source metadata like:
- site name
- external job id
- scraped URL

## Migration Strategy
The app currently uses a startup migration helper in `backend/app/db/migrations.py`.

This is intentionally lightweight and useful for local iteration, but it is not a substitute for a real migration framework. If the project moves toward shared environments or production deployment, it should adopt a formal migration tool such as Alembic.
