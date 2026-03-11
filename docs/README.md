# Docs

Developer documentation for Jobby.

Read when:
- you are new to the repo and need a starting point
- you want to find the right doc before changing frontend, backend, extension, or dev workflow
- you need the recommended reading order for onboarding

## Contents
- [Architecture](./architecture.md)
- [Backend API](./backend-api.md)
- [Data Model](./data-model.md)
- [Extension](./extension.md)
- [Frontend](./frontend.md)
- [Local Development](./local-development.md)
- [Roadmap](./roadmap.md)

## Current Product Shape
Jobby is a local-first job application manager. The primary object is an application record, and AI generation is attached to that record instead of being the whole product.

The system currently supports:
- manual creation and editing of application records
- dashboard list and activity graph
- status tracking across a simple pipeline
- AI generation of cover letters, tailored bullets, and interview questions
- Hermes gateway-backed generation, with provider routing handled outside Jobby

## Reading Order
If you are new to the codebase, start with:
1. [Architecture](./architecture.md)
2. [Data Model](./data-model.md)
3. [Backend API](./backend-api.md)
4. [Frontend](./frontend.md)
5. [Local Development](./local-development.md)
6. [Extension](./extension.md) if you are touching browser capture
