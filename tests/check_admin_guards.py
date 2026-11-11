#!/usr/bin/env python3
"""Static guard check for the PHP API (Python 3 standard library only, no PHP or database needed).

    python3 tests/check_admin_guards.py

Fails (exit code 1) if:
  1. a file in backend/api/admin/ does not call require_admin(), or calls it AFTER reading input / touching the database;
  2. any endpoint whose header comment says "ADMIN only" (e.g. hackathons/create.php) does not call require_admin();
  3. hm_save_hackathon() (admin-only write helper) is called from a file that has no require_admin();
  4. an endpoint reads a "role" value from the request, or SQL assigns users.role anywhere except the fixed 'student' sign-up insert.

This is a safety net for future edits: add an admin endpoint and forget the middleware, and this test fails.
It does not replace tests/auth_roles_test.py, which exercises the live API."""
import re
import sys
from pathlib import Path

API = Path(__file__).resolve().parent.parent / 'backend' / 'api'
failures, checked = [], 0


def code_only(src: str) -> str:
    """PHP source without /* */ and full-line // comments, so words in comments are not mistaken for code."""
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', src)


def fail(msg):
    failures.append(msg)
    print(f'  FAIL  {msg}')


def ok(msg):
    print(f'  ok    {msg}')


for f in sorted(API.rglob('*.php')):
    rel = f.relative_to(API).as_posix()
    raw = f.read_text(encoding='utf-8')
    code = code_only(raw)
    header = raw[:600]
    guard = code.find('require_admin(')
    is_admin_dir = rel.startswith('admin/')
    says_admin = 'ADMIN only' in header or 'ADMIN-only' in header

    if is_admin_dir or says_admin:
        checked += 1
        if guard == -1:
            fail(f'{rel}: admin endpoint never calls require_admin()')
            continue
        # Nothing that reads input or hits the database may run before the guard.
        before = code[:guard]
        early = [t for t in ('db()', 'hm_input()', '$_GET', '$_POST', 'hm_query_', 'hm_save_hackathon(', 'ok(') if t in before]
        if early:
            fail(f'{rel}: {", ".join(early)} used before require_admin()')
        else:
            ok(f'{rel}: require_admin() runs before any input/database access')

    if 'hm_save_hackathon(' in code and guard == -1 and not rel.startswith('admin/'):
        # the helper itself lives in helpers/data.php; only endpoints are checked here
        fail(f'{rel}: calls hm_save_hackathon() without require_admin()')

    if re.search(r"\$(?:in|_POST|_GET|_REQUEST)\s*\[\s*['\"]role['\"]\s*\]", code):
        fail(f'{rel}: reads "role" from the request')
    for m in re.finditer(r'UPDATE\s+users\s+SET\b[^;]*?\brole\b', code, flags=re.I | re.S):
        fail(f'{rel}: SQL updates users.role')
    for m in re.finditer(r'INSERT\s+INTO\s+users\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)', code, flags=re.I | re.S):
        cols = [c.strip() for c in m.group(1).split(',')]
        vals = [v.strip() for v in m.group(2).split(',')]
        if 'role' in cols and vals[cols.index('role')] != "'student'":
            fail(f'{rel}: users INSERT sets role to something other than the literal \'student\'')

if checked == 0:
    fail('no admin endpoints found: is the path right?')
print(f'\n{checked} admin endpoints checked, {len(failures)} problem(s)')
sys.exit(1 if failures else 0)
