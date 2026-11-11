# Claude handoff log

One section per phase, newest last. Never put passwords, tokens or other secrets in this file.

---

## Slot 1 — Authentication and role-based dashboards

### Summary
One shared login/signup. After login, students go to `dashboard.html` and admins go to `admin.html`. The role always comes from
the server session (`GET /auth/session.php`), never from browser storage. Students no longer see an Admin option, and cannot use
`admin.html` or any admin API.

### Root causes found
1. **Student saw "Admin" in the account dropdown:** the link was hard-coded into the dropdown template in `frontend/js/utils.js`
   (`HM.renderNav`) for every user. Nothing ever looked at the role.
2. **Everyone landed on `dashboard.html` after login:** `frontend/js/auth.js` redirected unconditionally.
3. **`admin.html` rendered its shell for anyone** and relied on the API returning errors. No page-level role check existed.
4. **Backend was already correct:** all 7 files in `backend/api/admin/*.php` and `hackathons/{create,update,delete}.php` already call
   `require_admin()` (`middleware/admin.php`), which re-reads the role from the database on every request. **No PHP file was changed.**

### Files changed
| File | Change |
|---|---|
| `frontend/js/utils.js` | Removed the hard-coded Admin link. The link is inserted into the DOM only when `session.php` returns `role === 'admin'`; it carries `data-admin-link` and `aria-current` on the admin page. |
| `frontend/js/auth.js` | New `homeFor()`: after a successful login reads the role from `session.php`; admin → `admin.html`, otherwise `dashboard.html`. If that lookup fails it falls back to `dashboard.html`. Signup still goes to `dashboard.html` (the server forces `role = 'student'`). |
| `frontend/pages/admin.html` | Admin UI wrapped in `<div id="adminShell" hidden>`, with a "Checking access…" placeholder (`#adminGate`). |
| `frontend/js/admin.js` | New `init()` guard: not logged in → `login.html`; logged in but not admin → `dashboard.html` (both via `location.replace`); session lookup fails → error + Retry, admin UI stays hidden (fails closed). Only a confirmed admin reveals the shell and loads data. |
| `tests/check_admin_guards.py` | **New.** Static check (no PHP needed) that every admin endpoint calls `require_admin()` before touching input/DB, and that nothing reads `role` from the request or updates `users.role`. |
| `tests/auth_roles_test.py` | **New.** Live-API test with a real student and a real admin (see "How to run"). |
| `tests/role_nav_e2e.py` | **New.** Chromium test of the real frontend against an in-process mock of the PHP API. |
| `docs/CLAUDE_HANDOFF.md` | **New** (this file). |

Not changed: any file in `backend/`, `database/`, CSS, other pages, the campus list, or `tests/smoke_test.py`.

### Database changes
None. No migration, no schema change, nothing to back up for this phase.

### Security model after this phase
- **Real enforcement is server-side:** `require_admin()` on every admin API (401 `unauthenticated` when logged out, 403 `forbidden`
  for a student), plus the automatic CSRF check in `bootstrap.php` on every non-GET request.
- **Frontend is a UX layer only:** hiding the Admin link and guarding `admin.html` decide what the browser *shows*. Editing
  localStorage, sessionStorage or cookies cannot change the role the server reports.

### Tests run in the build sandbox
The sandbox had **no PHP, no MySQL and no network**, so the PHP backend could not be executed there.

| Test | Result | What it proves / does not prove |
|---|---|---|
| `python3 tests/check_admin_guards.py` | 10 admin endpoints, 0 problems. Also confirmed it fails on 4 deliberately planted faults. | Real backend source: guards present and ordered correctly. |
| `python3 tests/role_nav_e2e.py` | **41 passed, 0 failed** (Chromium). Run against the **original** code it fails exactly where expected (student sees Admin; student not bounced from `admin.html`). | Real frontend files, driven through a browser, against a **mock** API that copies the documented contract. Proves the frontend behaviour. Does **not** prove the PHP. |
| `tests/auth_roles_test.py` run against the same mock | 43 passed (throw-away student) and 42 passed (existing student) | Proves the test script's own logic only. |
| `node --check` on all `frontend/js/*.js` | OK | Syntax. |
| Visual check of both dropdowns (screenshot) | Student: My profile / Log out. Admin: My profile / **Admin** / Log out, same styling. | Layout. |

Covered by the browser test: student login → dashboard; admin login → admin page; no Admin link in a student's DOM on any page;
student typing `admin.html` is redirected and makes zero admin API calls; storage/cookie tampering has no effect; logged-out
visitor → login; logout re-locks the admin page; server-side promotion/demotion is picked up on next page load; session-check
failure fails closed; wrong password; signup lands on the dashboard as a student; campus dropdown unchanged.

### ⚠ Still to do on your machine (live PHP + MySQL)
Run these once against the real backend before treating Slot 1 as signed off:
```
# 0. (dev only) give the seeded demo users a password you choose; do not commit it anywhere
php database/set_demo_passwords.php '<choose-a-password>'

# 1. start the app
php -S localhost:8000

# 2. static guard check (no server needed)
python3 tests/check_admin_guards.py

# 3. live role test with the real admin (and optionally a real student; otherwise a throw-away student is registered)
ADMIN_EMAIL=admin@hackmate.test ADMIN_PASSWORD='<that password>' \
  python3 tests/auth_roles_test.py http://localhost:8000/backend/api

# 4. existing full smoke test, with admin section enabled
ADMIN_EMAIL=admin@hackmate.test ADMIN_PASSWORD='<that password>' python3 tests/smoke_test.py http://localhost:8000/backend/api

# 5. browser test (optional, needs `pip install playwright && playwright install chromium`)
python3 tests/role_nav_e2e.py
```
Manual check in a real browser: log in as `shubham@hackmate.test` (student): dropdown has no Admin, and
`http://localhost:8000/frontend/pages/admin.html` bounces to the dashboard. Log in as `admin@hackmate.test`: lands on
`admin.html`, dropdown shows Admin.

### Known issues / things to be aware of
1. **Campus list differs from your brief.** Your rules name IGDTUW, DTU, NSUT, IIT Delhi **and IIIT Delhi**, but `database/seed.sql`
   in this project has IGDTUW, DTU, NSUT, IIT Delhi and **"Other"** (no IIIT Delhi). Left untouched (out of scope). Please confirm
   whether your local `Documents/main projects/HackMate 3` differs from this copy, or whether IIIT Delhi should be added in a later slot
   (it needs only an `INSERT` into `campuses`; no code change).
2. **`admin.html` is a static file.** A static web server cannot check a PHP session, so the HTML shell of `admin.html` (tab names only,
   no data) can still be *downloaded* by anyone who types the URL. The browser guard hides it and redirects, and every piece of admin
   data and every admin action is refused by PHP. If you ever need the shell itself withheld, it must be served through a PHP
   wrapper; that would change the `admin.html` URL the brief specifies, so it was not done.
3. If the role lookup right after login fails (network blip), an admin lands on `dashboard.html` instead of `admin.html`; they can still reach
   Admin from the dropdown.
4. Pre-existing, not touched: the login/signup pages render the account dropdown even for logged-out visitors (it no longer contains Admin);
   a logged-in user opening `login.html` is not auto-redirected; the landing page does not switch to a logged-in state.
5. Pre-existing, harmless: admin endpoints run `require_method()` before `require_admin()`, so a wrong-method request returns 405
   before the auth check. No data is exposed either way.
6. `README.md` still says the backend is "not yet executed"; it was not edited in this phase.

### Next phase
Slot 2: to be defined by the project owner. Suggested before starting: run the live checklist above and decide on the IIIT Delhi
campus question (known issue 1).
