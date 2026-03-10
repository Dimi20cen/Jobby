# Extension

Read when:
- you are changing popup capture UX or scraping behavior
- you are debugging how the extension creates, updates, or generates applications
- you need to understand how browser capture fits into the rest of Jobby

Related docs:
- [Architecture](./architecture.md)
- [Backend API](./backend-api.md)
- [Frontend](./frontend.md)
- [Local Development](./local-development.md)
- [Data Model](./data-model.md)

## Purpose
The Chrome extension is the capture layer for Jobby.

It lets a user:
- scrape the current job page
- review the captured fields in a popup
- save an applied application into Jobby
- optionally trigger AI generation right after saving

The extension lives in `extension/`.

## Files
- `extension/manifest.json`: Manifest V3 config
- `extension/popup.html`: popup markup
- `extension/popup.css`: shared popup and options styling
- `extension/popup.js`: scrape, save, and generate logic
- `extension/options.html`: settings screen
- `extension/options.js`: storage-backed settings logic

## Architecture
The extension is intentionally no-build and plain JavaScript.

Flow:
1. User opens the popup on a job page.
2. Popup runs `chrome.scripting.executeScript` against the active tab.
3. The injected scraper extracts title, company, location, URL, and description.
4. The popup checks Jobby for an existing application with the same `job_url`.
5. If found, the popup rehydrates from the saved record; otherwise it keeps the scraped values.
6. The user saves the job through `POST /applications` or updates the existing record with `PUT /applications/{id}`; extension saves mark the record as `applied` with today's date.
7. Optional: the popup calls `POST /applications/{id}/generate`.

## Stored Settings
The options page uses `chrome.storage.sync` for:
- `backendBaseUrl`
- `dashboardUrl`
- `defaultCvText`

Defaults:
- backend: `http://localhost:8000`
- dashboard: `http://localhost:3000`

## Current Scraping Strategy
The scraper uses a layered fallback approach:
- JSON-LD `JobPosting` data when available
- board-specific extractors for LinkedIn and Indeed
- generic selectors for title, company, and location on other sites
- DOM-to-text cleanup for description extraction with noise filtering
- page metadata fallback for the job title

This keeps the extension useful across multiple sites while giving better quality on the boards we care about most.

## Known Limits
- extraction is heuristic, so some boards will need manual cleanup
- LinkedIn location extraction is still inconsistent on some layouts
- no direct deep-link into a newly created application yet
- no background sync or page-change listeners
- no browser-store packaging yet

## Local Install
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the repo's `extension/` directory
5. Open the extension options and confirm the backend/dashboard URLs

## Next Improvements
- improve LinkedIn location extraction on newer layouts
- add job-board-specific extractors for Greenhouse, Lever, Ashby, and Workday
- open the saved application detail page after capture
- support quick status selection such as `draft` vs `applied`
- add small automated tests for popup payload formatting
