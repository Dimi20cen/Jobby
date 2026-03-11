# Frontend

Read when:
- you are changing dashboard, application detail, or frontend API wiring
- you need to know which routes and components own which parts of the UI
- you are deciding whether a behavior belongs in the web app or the extension

Related docs:
- [Architecture](./architecture.md)
- [Backend API](./backend-api.md)
- [Extension](./extension.md)
- [Local Development](./local-development.md)

## Overview
The frontend is a Next.js App Router project in `frontend/`.

Its job is to present the application-management workflow clearly and keep backend interaction isolated to a small API client layer.

## Route Structure

### `/`
Dashboard home page.

Responsibilities:
- fetch application summaries
- fetch activity graph data
- support status filtering inside the applications panel
- show application table
- show extension CTA card

Main file:
- `frontend/app/page.tsx`

### `/applications/new`
Manual creation flow for a new application record.

Main file:
- `frontend/app/applications/new/page.tsx`

### `/applications/[id]`
Application detail page for editing and AI generation.

Main file:
- `frontend/app/applications/[id]/page.tsx`

## Components

### `ApplicationTable`
Displays the dashboard table and handles delete actions.

### `ActivityGrid`
Displays the contribution-style graph based on `GET /applications/activity`.

### `ExtensionCard`
Dashboard card that points users to the unpacked Chrome extension and its setup flow.

### `ApplicationEditor`
The core form experience for:
- creating records
- editing records
- deleting records
- triggering AI generation
- viewing AI outputs and evaluation metadata

## API Layer
The browser-facing API client lives in `frontend/lib/api.ts`.

Current functions:
- `getApplications`
- `getActivity`
- `getApplication`
- `createApplication`
- `updateApplication`
- `deleteApplication`
- `generateApplication`

This file is the right place to keep fetch contracts consistent and avoid sprinkling raw HTTP calls across components.

## Styling
Global styling lives in `frontend/app/globals.css`.

Core palette:
- `#355872`
- `#7AAACE`
- `#9CD5FF`
- `#F7F8F0`

Current visual direction:
- restrained blue palette built around the Jobby brand colors
- single-font UI typography with a minimal application-shell feel
- soft panel surfaces, light borders, and understated controls
- dashboard table filtering integrated directly into the status column header

This is intentional. The app should feel like a product, not a generic form generator.

## Frontend Constraints
- current pages are mostly client-side for implementation speed
- there is no dedicated state library yet
- forms are managed with local component state
- deletes use `window.confirm`

These are acceptable for the current MVP, but likely upgrade targets later if the UX becomes more complex.

## Good Next Frontend Follow-ups
- add toast notifications instead of inline-only errors
- move repeated form logic into smaller field groups
- add saved filter/sort state in the URL
- improve table responsiveness for small screens
- add copy/export affordances for generated text
