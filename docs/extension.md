# Extension

## Purpose
The Chrome extension is the capture layer for Jobby.

It lets a user:
- scrape the current job page
- review the captured fields in a popup
- save a draft application into Jobby
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
4. The popup form is prefilled with those values plus the stored default CV.
5. The user saves a draft through `POST /applications`.
6. Optional: the popup calls `POST /applications/{id}/generate`.

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
- common job-board selectors for title, company, and location
- longest matching description block from known content containers
- page title fallback for the job title

This keeps the extension useful across multiple sites without needing per-site code for every board.

## Known Limits
- extraction is heuristic, so some boards will need manual cleanup
- no deduplication yet when the same listing is captured twice
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
- add job-board-specific extractors for LinkedIn, Greenhouse, Lever, Ashby, and Workday
- detect duplicates by `job_url`
- open the saved application detail page after capture
- support quick status selection such as `draft` vs `applied`
- add small automated tests for popup payload formatting
