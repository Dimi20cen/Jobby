# Roadmap

## Current State
The project is now in an application-manager MVP phase.

Implemented:
- dashboard and activity tracking
- manual application records
- application detail editing
- AI generation within an application
- local-first infrastructure

## Near-Term Next Steps

### Browser extension capture
Goal:
- create application records directly from job boards

Likely work:
- extension manifest and popup
- content script for supported job boards
- API flow to create draft applications from scraped metadata
- local settings for backend URL and reusable CV text

Status:
- basic Chrome extension MVP now exists under `extension/`
- next improvements should focus on better site-specific scraping and a richer handoff into the application detail page

### Gmail integration
Goal:
- associate email threads with applications

Likely work:
- Gmail OAuth flow
- background sync or manual refresh
- thread matching heuristics based on company, title, sender, and content
- dashboard previews for latest related messages

### Better application intelligence
Goal:
- make AI outputs more grounded and useful

Likely work:
- CV parsing into structured sections
- JD parsing and requirement extraction
- evidence mapping between CV claims and JD requirements
- ATS-style analysis and gap highlighting

### Retrieval and memory
Goal:
- reuse prior strong materials instead of generating from scratch every time

Likely work:
- pgvector
- embeddings for prior applications and snippets
- retrieval of relevant past bullets and cover letters

## Structural Improvements

### Auth and user ownership
Needed before the product can become multi-user or hosted.

### Formal migrations
The local migration helper should eventually be replaced by a production-ready migration system.

### Event timeline model
A separate `application_events` table would make the graph and timeline features more accurate than relying only on `created_at` and `applied_date`.

### Export workflows
Useful additions:
- markdown export
- PDF export
- copy bundles for interview prep

## Portfolio Packaging
If the goal is also portfolio value, the most important additions are:
- strong screenshots
- short demo video
- extension story, even before full release
- clear explanation of tradeoffs and future architecture decisions
