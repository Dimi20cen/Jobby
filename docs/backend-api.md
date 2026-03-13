# Backend API

Read when:
- you are changing request or response shapes
- you are wiring frontend or extension behavior to backend endpoints
- you are debugging CRUD, generation, or activity responses

Related docs:
- [Architecture](./architecture.md)
- [Data Model](./data-model.md)
- [Extension](./extension.md)
- [Frontend](./frontend.md)

## Overview
The backend is a FastAPI app defined in `backend/app/main.py` and `backend/app/api/routes.py`.

The API is centered on the `Application` resource.

## Endpoints

### `GET /health`
Returns a simple health response:

```json
{ "status": "ok" }
```

### `GET /applications`
Returns dashboard-ready application summaries.

Query parameters:
- `status`: optional status filter
- `limit`: defaults to `100`
- `sort`: one of `created_at`, `applied_date`, or `updated_at`

Response shape:

```json
{
  "items": [
    {
      "id": "uuid",
      "company_name": "OpenAI",
      "job_title": "AI Engineer",
      "location": "Remote",
      "status": "applied",
      "applied_date": "2026-03-09",
      "cv_used": "raw cv text",
      "created_at": "2026-03-09T10:00:00Z",
      "updated_at": "2026-03-09T10:00:00Z"
    }
  ]
}
```

### `GET /applications/activity`
Returns day-level counts for the dashboard graph.

Query parameters:
- `days`: defaults to `90`

Response shape:

```json
{
  "items": [
    { "day": "2026-03-01", "count": 0 },
    { "day": "2026-03-02", "count": 2 }
  ]
}
```

The count uses `applied_date` when present, otherwise falls back to `created_at`.

### `POST /applications`
Creates a new application.

Important rule:
- if `status` is `applied`, `applied_date` must be present

Expected request fields:
- `company_name`
- `job_title`
- `location`
- `status`
- `applied_date`
- `job_url`
- `job_description`
- `cv_used`
- `notes`
- `cover_letter`
- `interview_questions`

Returns the full application detail payload.

### `GET /applications/{id}`
Returns the full editable application record.

### `GET /applications/{id}/email-links`
Returns Gmail thread suggestions and confirmed links for an application.

Response shape:

```json
{
  "connection": {
    "connected": true,
    "email_address": "person@example.com",
    "connected_at": "2026-03-13T10:00:00Z",
    "has_pending_auth": false
  },
  "suggested": [
    {
      "thread_id": "189f...",
      "subject": "OpenAI AI Engineer application update",
      "participants_summary": "Recruiting <jobs@openai.com>",
      "snippet": "Thanks for applying...",
      "last_message_at": "2026-03-10T09:00:00Z",
      "message_count": 2,
      "gmail_url": "https://mail.google.com/...",
      "status": "suggested",
      "match_score": 85,
      "match_reasons": ["Mentions OpenAI", "Recent to application timeline"]
    }
  ],
  "linked": [],
  "rejected_thread_ids": []
}
```

### `POST /applications/{id}/email-links/{thread_id}/link`
Marks a Gmail thread as linked to the application.

### `POST /applications/{id}/email-links/{thread_id}/reject`
Marks a Gmail thread suggestion as rejected.

### `DELETE /applications/{id}/email-links/{thread_id}`
Removes an existing Gmail thread link or suggestion.

### `PUT /applications/{id}`
Updates any editable fields on the application.

Important rule:
- updates are partial
- if the resulting status becomes `applied`, the resulting record must have an `applied_date`

### `DELETE /applications/{id}`
Deletes the application record.

Returns `204 No Content`.

### `POST /applications/{id}/generate`
Runs AI generation against an existing application.

Validation:
- `job_description` must be at least 30 characters
- `cv_used` must be at least 30 characters

Generation writes back:
- `cover_letter`
- `interview_questions`
- `used_model`
- `relevance_score`
- `jd_coverage`
- `risk_flags`

Returns the updated full application detail.

## Backend Modules

### `backend/app/api/routes.py`
Contains route handlers and presentation mapping helpers:
- `_to_summary`
- `_to_detail`
- `_get_application_or_404`

### `backend/app/schemas.py`
Defines request and response shapes used by the API.

Notable types:
- `ApplicationStatus`
- `CreateApplicationRequest`
- `UpdateApplicationRequest`
- `ApplicationSummary`
- `ApplicationDetail`

### `backend/app/db/models.py`
Defines the SQLAlchemy `Application` model.

### `backend/app/services/llm.py`
Encapsulates Hermes gateway calls and response normalization for application-specific generation.

### `backend/app/services/gmail.py`
Owns Gmail OAuth, thread sync, heuristic matching, and application-thread link state.

## Gmail Integration Endpoints

### `GET /integrations/gmail/status`
Returns whether a local Gmail account is connected.

### `POST /integrations/gmail/connect/start`
Starts the shared `auth.dimy.dev` Google OAuth flow and returns an `auth_url`.

Request shape:

```json
{
  "return_path": "/applications/123"
}
```

### `POST /integrations/gmail/sync`
Fetches recent Gmail threads plus per-application Gmail search matches using a Google access token obtained from the shared auth service, stores normalized thread metadata, and refreshes per-application suggestions.

## Error Handling
Current error approach:
- `404` when an application is not found
- `400` for validation issues such as missing `applied_date` or insufficient generation inputs
- `502` when the upstream LLM call fails

## Testing
Current backend tests cover:
- health response
- create/list/activity flow
- generation flow against an application with the LLM call mocked
- validation that `applied` status requires an `applied_date`
