# HackMate — Campus Hackathon & Project Team Finder

Find teammates, discover projects and build your next hackathon team with students from your campus.

**Stack:** HTML5 · CSS3 · vanilla JavaScript (frontend) · PHP 8+ and MySQL/MariaDB (backend written, awaiting first live run). No build step, no Node, no paid services. Deployable on free PHP/MySQL hosting.

## Status
| Part | State |
|---|---|
| Database schema + seed | Done (`database/`) |
| Frontend (11 pages) | Done, runs on demo data |
| PHP backend | Written (`backend/`), **not yet executed**: see `docs/HANDOFF_ACCOUNT_2.md` |
| Integration check, polish, deployment | Account 3 |

## Try the frontend now
The demo data layer is gone: the frontend now needs the PHP backend. Easiest local run (PHP 8+ and MySQL/MariaDB installed), from the project root:

```
cp backend/config/config.sample.php backend/config/config.local.php   # then put your DB credentials in it
php -S localhost:8000                                                  # pages: http://localhost:8000/frontend/index.html
```

## Set up the database
```
mysql -u USER -p DBNAME < database/schema.sql
mysql -u USER -p DBNAME < database/seed.sql   # demo data only
php database/set_demo_passwords.php 'YourPassw0rd'   # dev only: lets you log in as the demo users
```

Test the API: `python3 tests/smoke_test.py http://localhost:8000/backend/api`

## Docs
- `docs/HANDOFF_ACCOUNT_2.md` — **start here** (backend, endpoints, security, what is untested)
- `docs/HANDOFF_ACCOUNT_1.md` — original frontend/database handoff
- `docs/ARCHITECTURE.md` — structure and conventions
- `docs/DATABASE.md` — tables and relationships
