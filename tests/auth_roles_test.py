#!/usr/bin/env python3
"""Live API test: role-based access with a real STUDENT and a real ADMIN account (Python 3 standard library only).

    ADMIN_EMAIL=admin@hackmate.test ADMIN_PASSWORD='...' python3 tests/auth_roles_test.py http://localhost:8000/backend/api
    # optional: STUDENT_EMAIL / STUDENT_PASSWORD to use an existing student. Without them a throw-away student is registered.

Credentials are read from environment variables only and are never printed or stored. Needs schema.sql + seed.sql loaded, and
the admin's password set (dev only: `php database/set_demo_passwords.php 'YourPassw0rd'`). It changes no data except creating
one throw-away student when STUDENT_* is not given. Exit code is non-zero if any check fails."""
import sys, os, json, uuid, urllib.request, urllib.error, urllib.parse, http.cookiejar

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000/backend/api').rstrip('/')
passed = failed = 0

ADMIN_GETS = ['/admin/overview.php', '/admin/activity.php', '/admin/users.php', '/admin/projects.php', '/admin/hackathons.php', '/admin/reports.php', '/admin/skills.php']
ADMIN_POSTS = [('/admin/action.php', {'entity': 'skill', 'action': 'create', 'name': 'zz-role-test'}),
               ('/admin/action.php', {'entity': 'user', 'id': 2, 'action': 'suspend'}),
               ('/hackathons/create.php', {'name': 'zz', 'organizer': 'zz', 'start_date': '2030-01-02', 'end_date': '2030-01-03', 'registration_deadline': '2030-01-01'}),
               ('/hackathons/update.php', {'id': 1, 'name': 'zz renamed'}),
               ('/hackathons/delete.php', {'id': 1})]


def check(label, cond, detail=''):
    global passed, failed
    if cond: passed += 1; print(f'  ok    {label}')
    else: failed += 1; print(f'  FAIL  {label}  {detail}')


class Client:
    def __init__(self):
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf = None

    def call(self, method, path, body=None, query=None):
        url = BASE + path + ('?' + urllib.parse.urlencode(query) if query else '')
        headers, data = {'Accept': 'application/json'}, None
        if method != 'GET':
            if not self.csrf:
                self.csrf = self.call('GET', '/auth/csrf.php')[1]['data']['token']
            headers['X-CSRF-Token'] = self.csrf; headers['Content-Type'] = 'application/json'; data = json.dumps(body or {}).encode()
        try:
            r = self.opener.open(urllib.request.Request(url, data=data, headers=headers, method=method), timeout=20); status, raw = r.status, r.read()
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read()
        try: return status, json.loads(raw)
        except ValueError: return status, {'_raw': raw[:200].decode('utf-8', 'replace')}

    def get(self, path, **q): return self.call('GET', path, query=q or None)
    def post(self, path, body=None): return self.call('POST', path, body)


def code(j): return (j.get('error') or {}).get('code')
def role_of_session(c):
    s, j = c.get('/auth/session.php'); return s, (j.get('data') or {}).get('role'), (j.get('meta') or {}).get('role')


def blocked(c, who, expect_status, expect_code):
    """Every admin endpoint must answer with the expected status/code and must not return any data."""
    for path in ADMIN_GETS:
        s, j = c.get(path); check(f'{who}: GET {path} -> {expect_status} {expect_code}', s == expect_status and code(j) == expect_code and not j.get('data'), f'got {s} {code(j)}')
    for path, body in ADMIN_POSTS:
        s, j = c.post(path, body); check(f'{who}: POST {path} -> {expect_status} {expect_code}', s == expect_status and code(j) == expect_code, f'got {s} {code(j)}')


ae, ap = os.environ.get('ADMIN_EMAIL'), os.environ.get('ADMIN_PASSWORD')
if not (ae and ap):
    sys.exit('Set ADMIN_EMAIL and ADMIN_PASSWORD (environment variables) to run this test.')
se, sp = os.environ.get('STUDENT_EMAIL'), os.environ.get('STUDENT_PASSWORD')

print('\n[anonymous visitor]')
anon = Client()
s, role, mrole = role_of_session(anon); check('session.php: not logged in -> role is null', s == 200 and role is None and mrole is None)
blocked(anon, 'anonymous', 401, 'unauthenticated')

print('\n[student]')
stu = Client()
if not (se and sp):
    se, sp = f'roletest_{uuid.uuid4().hex[:8]}@hackmate.test', 'Passw0rd-' + uuid.uuid4().hex[:8]
    campus = Client().get('/campuses/list.php')[1]['data'][0]['id']
    s, j = stu.post('/auth/register.php', {'name': 'Role Test', 'email': se, 'password': sp, 'confirm_password': sp, 'campus_id': campus,
                                           'branch': 'CSE', 'year': 2, 'role': 'admin', 'is_admin': True})   # role injection attempt
    check('sign-up works and ignores a client-sent role', s == 201 and j['data']['user']['role'] == 'student', f'got {s} {j.get("data")}')
    stu = Client()
s, j = stu.post('/auth/login.php', {'email': se, 'password': sp, 'role': 'admin'})                          # role injection attempt on login
check('student login -> 200 with role student (client-sent role ignored)', s == 200 and j['data']['user']['role'] == 'student', f'got {s} {str(j)[:120]}')
s, role, mrole = role_of_session(stu); check('session.php reports role = student (server session)', s == 200 and role == 'student' and mrole == 'student')
blocked(stu, 'student', 403, 'forbidden')
s, j = stu.get('/dashboard/get.php'); check('student still reaches normal student endpoints (dashboard)', s == 200)
s, j = stu.get('/hackathons/list.php'); check('student still reaches hackathons list', s == 200)
s, j = stu.get('/admin/users.php'); check('student never receives email addresses from the admin API', 'email' not in json.dumps(j))
s, j = stu.post('/auth/logout.php'); check('student logout -> 200', s == 200)
s, j = stu.get('/admin/users.php'); check('after logout the old student session is just anonymous (401)', s == 401)

print('\n[admin]')
adm = Client()
s, j = adm.post('/auth/login.php', {'email': ae, 'password': ap})
check('admin login -> 200 with role admin', s == 200 and j['data']['user']['role'] == 'admin', f'got {s} {code(j)}')
s, role, mrole = role_of_session(adm); check('session.php reports role = admin (server session)', s == 200 and role == 'admin' and mrole == 'admin')
for path in ADMIN_GETS:
    s, j = adm.get(path); check(f'admin: GET {path} -> 200', s == 200 and j.get('ok') is True, f'got {s} {code(j)}')
s, j = adm.get('/admin/users.php'); check('admin users list has no password data', 'password' not in json.dumps(j))
s, j = adm.post('/admin/action.php', {'entity': 'user', 'id': (adm.get('/auth/session.php')[1]['data'] or {}).get('id'), 'action': 'suspend'})
check('admin cannot suspend their own account (existing safety rule kept)', s == 409, f'got {s} {code(j)}')
s, j = adm.post('/auth/logout.php'); check('admin logout -> 200', s == 200)
s, j = adm.get('/admin/overview.php'); check('after logout the old admin session is anonymous (401)', s == 401)

print(f'\n{passed} passed, {failed} failed')
sys.exit(1 if failed else 0)
