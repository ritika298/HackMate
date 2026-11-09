# Deployment (free PHP + MySQL hosting)

HackMate is plain PHP 8 + MySQL/MariaDB + static HTML/CSS/JS. No Node, no build step, no paid services. Works on InfinityFree, 000webhost-style hosts, cPanel shared hosting, or any Apache + PHP box.

> **Status:** these steps are written from the code, not from a real deployment; nothing has been run against PHP/MySQL yet. Do the local run first (README) and fix anything it shows.

## Requirements
PHP 8.0+ with `pdo_mysql`, `mbstring`, `json` (all standard) · MySQL 5.7+/8 or MariaDB 10.4+ · Apache with `.htaccess` (recommended) · HTTPS.

## 1. Create the database
1. In the host's control panel create a MySQL database and user; note host, database name, user, password.
2. Open phpMyAdmin → select the database → **Import** → `database/schema.sql`. If you have an older database, run `database/migrations/001_login_attempts.sql` instead.
3. Optional demo data: import `database/seed.sql` (**never on a real production site**; demo users have no valid password until `set_demo_passwords.php` is run from a command line, which free hosts usually do not allow, so demo accounts are for local use).

## 2. Upload the files
Upload the whole project so the folder layout stays exactly `frontend/`, `backend/`, `database/` (the frontend reaches the API at `../../backend/api` relative to `frontend/pages/`). Typical result: `https://yoursite.example/frontend/index.html`.
- To serve at the domain root, put the contents of `frontend/` in the web root and keep `backend/` next to it; then edit `API_BASE` at the top of `frontend/js/api.js` (and the `HM.root()` line below it) to the correct relative path, or add a redirect from `/` to `/frontend/index.html`.
- `database/`, `docs/`, `tests/` do not need to be uploaded (do not upload them to production).

## 3. Configure credentials
On the server copy `backend/config/config.sample.php` to `backend/config/config.local.php` and fill in the database host/name/user/password. Keep `'debug' => false`. If the site is HTTPS but PHP reports HTTP (some free hosts sit behind a proxy), add `'force_secure_cookies' => true`. `config.local.php` is git-ignored: never commit it.

## 4. Create the first admin
Register normally on the site, then in phpMyAdmin run:
`UPDATE users SET role='admin' WHERE email='you@example.com';`
Admin pages are then at `frontend/pages/admin.html`; the backend enforces the role on every admin endpoint.

## 5. Verify
- Visit `https://your-site/backend/config/config.local.php` and `.../backend/bootstrap.php`: both must be **403/404**, never PHP source. (Apache `.htaccess` files are included. On nginx add `location ~ ^/backend/(config|helpers|middleware)/ { deny all; }`.)
- `https://your-site/backend/api/campuses/list.php` returns JSON with the campuses.
- Sign up, log in, edit your profile, send a request between two accounts.
- From a computer with Python 3 you can run `python3 tests/smoke_test.py https://your-site/backend/api` (it creates a few test users; delete them afterwards).

## Troubleshooting
- "Something went wrong on our side": check the host's PHP error log; temporarily set `'debug' => true` in `config.local.php` (turn it off again).
- Login works but every action says "session expired": cookies blocked or `Secure` flag mismatch; try `force_secure_cookies` or check HTTPS.
- Skills or campuses dropdowns empty: schema loaded but `seed.sql` not; insert campuses and skills (the seed shows the format).
- 500 on every request: wrong credentials or missing `pdo_mysql`.
