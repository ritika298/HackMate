# Architecture

```
Browser (static HTML/CSS/JS)  ──fetch JSON──▶  PHP API (backend/api/*.php)  ──PDO──▶  MySQL/MariaDB
```

## Principles
1. **One door to the backend.** Only `frontend/js/api.js` calls the network. Pages call `HM.api.*`.
2. **No demo layer any more.** `mock-data.js` was removed when the backend was connected; every `HM.api.*` call hits PHP.
3. **Backend does the real work.** Filtering, authorization, validation and ownership are server-side. Frontend validation is UX only.
4. **No secrets in the browser.** Sessions use PHP cookies; CSRF token fetched from the API.
5. **No build system.** Plain files, relative paths, works from any static folder.

## Frontend layout
| Layer | Files |
|---|---|
| Shared helpers (`window.HM`) | `utils.js` (escape, icons, toast, modal, validation, navbar/footer), `components.js` (card renderers) |
| Data | `api.js` (real), `mock-data.js` (demo, temporary) |
| Page logic | `landing, auth, dashboard, profile, discover, projects, hackathons, requests, team, admin .js` |
| Styles | `main.css` (tokens + components), one CSS per area, `responsive.css` loaded last |

Script order on every page: `utils → api → components → page`.

Page pattern: show skeleton → `await HM.api.x()` → render → on error show `HM.errorState` with retry → empty list shows `HM.empty`.

## Security rules baked into the frontend
- All dynamic text goes through `HM.esc()` or `HM.chips()` (XSS). Never concatenate raw data into `innerHTML`.
- External links use `HM.safeUrl()` (http/https only) and `rel="noopener noreferrer"`.
- The client never sends `user_id` for "me": the backend reads it from the session.
- Hiding the Admin link is cosmetic. Every `/admin/*` endpoint must check `role = 'admin'`.

## Adding a campus
Insert a row into `campuses`. The UI loads campuses from `getCampuses()`; no code changes.

## Backend layout (Account 2)
```
backend/bootstrap.php          loaded first by every endpoint: config, helpers, error handler, session, automatic CSRF check on every non-GET
backend/config/database.php    hm_config() + db() (PDO) + hm_tx(); credentials in config.local.php (untracked) or env vars
backend/helpers/               response.php (envelope) · validation.php (V class) · security.php (session, CSRF, throttling) · data.php (queries + serializers)
backend/middleware/            auth.php (require_login) · admin.php (require_admin)
backend/api/<area>/<name>.php  one small script per endpoint
```
Rules every endpoint follows: PDO prepared statements only; the current user comes from `$_SESSION` (never from the request); `V` validates input and returns HTTP 422 with per-field errors; ownership checks return 403; failures are thrown with `fail()` and turned into the JSON error envelope (SQL errors are logged, never shown).
