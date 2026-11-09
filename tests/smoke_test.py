#!/usr/bin/env python3
"""HackMate API smoke test (Python 3 standard library only).

Runs the full brief workflow against a live backend: register A+B, login, profiles, discover, team requests,
accept, projects, join, authorization checks, invalid inputs, logout.

    python3 tests/smoke_test.py http://localhost:8000/backend/api
    ADMIN_EMAIL=admin@hackmate.test ADMIN_PASSWORD=... python3 tests/smoke_test.py <API_BASE>   # also tests admin endpoints

Needs: schema.sql + seed.sql loaded (campuses and skills). Creates users with random emails; safe to re-run.
Exit code is non-zero if any check fails."""
import sys, os, json, uuid, urllib.request, urllib.error, urllib.parse, http.cookiejar

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000/backend/api').rstrip('/')
PW = 'Passw0rd-' + uuid.uuid4().hex[:6]
passed = failed = 0


def check(label, cond, detail=''):
    global passed, failed
    if cond:
        passed += 1
        print(f'  ok    {label}')
    else:
        failed += 1
        print(f'  FAIL  {label}  {detail}')


class Client:
    def __init__(self, name):
        self.name = name
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf = None

    def call(self, method, path, body=None, query=None, send_csrf=True):
        url = BASE + path + ('?' + urllib.parse.urlencode(query) if query else '')
        headers = {'Accept': 'application/json'}
        data = None
        if method != 'GET':
            if send_csrf:
                if not self.csrf:
                    self.csrf = self.call('GET', '/auth/csrf.php')[1]['data']['token']
                headers['X-CSRF-Token'] = self.csrf
            headers['Content-Type'] = 'application/json'
            data = json.dumps(body or {}).encode()
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            resp = self.opener.open(req, timeout=20)
            status, raw = resp.status, resp.read()
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read()
        try:
            return status, json.loads(raw)
        except ValueError:
            return status, {'_raw': raw[:200].decode('utf-8', 'replace')}

    def get(self, path, **q): return self.call('GET', path, query=q or None)
    def post(self, path, body=None, **kw): return self.call('POST', path, body, **kw)


def fields(j): return (j.get('error') or {}).get('fields') or {}
def code(j): return (j.get('error') or {}).get('code')
def has_secret_keys(obj):
    s = json.dumps(obj)
    return any(k in s for k in ('password', 'password_hash'))


a, b, c, anon = Client('A'), Client('B'), Client('C'), Client('anon')
tag = uuid.uuid4().hex[:8]
EA, EB, EC = f'a_{tag}@hackmate.test', f'b_{tag}@hackmate.test', f'c_{tag}@hackmate.test'

print('\n[0] reference data')
s, j = anon.get('/campuses/list.php'); campuses = j.get('data') or []
check('campuses list is public and non-empty (seed loaded?)', s == 200 and len(campuses) > 0, str(j)[:150])
s, j = anon.get('/skills/list.php'); skills = [x['name'] for x in (j.get('data') or [])]
check('skills list is public and non-empty', s == 200 and len(skills) >= 2)
campus_id = campuses[0]['id'] if campuses else 1
sk1, sk2 = (skills + ['Python', 'PHP'])[:2]

print('\n[1-2] register User A and User B, invalid registrations')
def reg(cl, email, name, **over):
    body = dict(name=name, email=email, password=PW, confirm_password=PW, campus_id=campus_id, branch='Computer Science', year=3)
    body.update(over)
    return cl.post('/auth/register.php', body)
s, j = reg(a, EA, 'Alice Test'); check('register A -> 201', s == 201 and j['data']['user']['role'] == 'student', str(j)[:200])
check('register response has no password data', not has_secret_keys(j))
s, j = reg(b, EB, 'Bob Test'); check('register B -> 201', s == 201, str(j)[:200])
s, j = reg(anon, EA, 'Dup'); check('duplicate email -> 422 on email', s == 422 and 'email' in fields(j), str(j)[:200])
s, j = reg(anon, f'x_{tag}@hackmate.test', 'Weak', password='abc', confirm_password='abc'); check('weak password -> 422', s == 422 and 'password' in fields(j))
s, j = reg(anon, f'y_{tag}@hackmate.test', 'Mismatch', confirm_password='different1'); check('password mismatch -> 422', s == 422 and 'confirm_password' in fields(j))
s, j = reg(anon, 'not-an-email', 'Bad Email'); check('invalid email -> 422', s == 422 and 'email' in fields(j))
s, j = reg(anon, f'z_{tag}@hackmate.test', 'Bad Campus', campus_id=999999); check('unknown campus -> 422', s == 422 and 'campus_id' in fields(j))
s, j = reg(anon, f'w_{tag}@hackmate.test', 'X', year=99); check('year out of range -> 422', s == 422 and 'year' in fields(j))
s, j = reg(anon, f'v_{tag}@hackmate.test', 'Role Injection', role='admin')
check('role in request body is ignored (still student)', s == 201 and j['data']['user']['role'] == 'student', str(j)[:150])

print('\n[3] login / session / logout')
s, j = anon.post('/auth/login.php', {'email': EA, 'password': PW}, send_csrf=False); check('POST without CSRF token -> 403 csrf_invalid', s == 403 and code(j) == 'csrf_invalid', str(j)[:150])
s, j = anon.post('/auth/login.php', {'email': EA, 'password': 'WrongPass1'}); check('wrong password -> 401 generic', s == 401 and code(j) == 'invalid_credentials', str(j)[:150])
s, j = anon.post('/auth/login.php', {'email': f'nobody_{tag}@hackmate.test', 'password': 'WrongPass1'}); check('unknown email -> 401 same message', s == 401 and code(j) == 'invalid_credentials')
s, j = anon.get('/auth/session.php'); check('session when logged out -> 200 data null', s == 200 and j['data'] is None and j['meta']['logged_in'] is False)
a.post('/auth/logout.php'); a.csrf = None
s, j = a.post('/auth/login.php', {'email': EA, 'password': PW}); check('login A -> 200', s == 200 and j['data']['user']['name'] == 'Alice Test', str(j)[:200])
s, j = a.get('/auth/session.php'); check('session shows A (user_id, role)', s == 200 and j['meta']['logged_in'] and j['meta']['role'] == 'student' and j['data']['email'] == EA)
check('session response has no hash', not has_secret_keys(j))
uid_a = j['data']['id']
s, j = b.get('/auth/session.php'); uid_b = j['data']['id']

print('\n[4-5] profiles')
s, j = a.post('/users/profile.php', {'bio': 'Backend dev', 'skills': [sk1, sk2], 'preferred_roles': ['Backend Developer'], 'interests': ['AI'],
                                      'github_url': 'https://github.com/alice', 'looking_for_team': True, 'experience_level': 'advanced'})
check('A updates own profile -> 200', s == 200 and sorted(j['data']['skills']) == sorted([sk1, sk2]) and j['data']['github_url'] == 'https://github.com/alice', str(j)[:250])
s, j = a.post('/users/profile.php', {'github_url': 'https://evil.example.com/x'}); check('non-github URL -> 422', s == 422 and 'github_url' in fields(j))
s, j = a.post('/users/profile.php', {'github_url': 'javascript:alert(1)'}); check('javascript: URL -> 422', s == 422)
s, j = a.post('/users/profile.php', {'skills': ['NoSuchSkill_' + tag]}); check('unknown skill -> 422', s == 422 and 'skills' in fields(j))
s, j = a.post('/users/profile.php', {'bio': 'x' * 501}); check('bio too long -> 422', s == 422 and 'bio' in fields(j))
s, j = a.post('/users/profile.php', {'id': uid_b, 'user_id': uid_b, 'name': 'Alice Renamed'})
check('user_id/id in body is ignored: edits only my own profile', s == 200 and j['data']['id'] == uid_a)
s, j = b.get('/users/profile.php', id=uid_b); check('B GET own profile', s == 200 and j['data']['id'] == uid_b)
s, j = b.post('/users/profile.php', {'bio': 'Frontend dev', 'skills': [sk1], 'preferred_roles': ['Frontend Developer']}); check('B updates own profile -> 200', s == 200)
s, j = b.get('/users/profile.php', id=uid_a)
check("B sees A's public profile without email/role/hash", s == 200 and 'email' not in j['data'] and 'role' not in j['data'] and not has_secret_keys(j))
s, j = b.get('/users/profile.php', id=999999); check('missing profile -> 404', s == 404)

print('\n[6] discover')
s, j = b.get('/users/discover.php', skill=sk2); ids = [u['id'] for u in j.get('data', [])]
check('B finds A by skill', s == 200 and uid_a in ids, str(j)[:200])
check('discover excludes the caller', uid_b not in ids)
check('discover leaks no email/role/hash', not any(k in json.dumps(j) for k in ('"email"', '"role"', 'password')))
s, j = b.get('/users/discover.php', q='Alice'); check('search by name', uid_a in [u['id'] for u in j.get('data', [])])
s, j = b.get('/users/discover.php', q="' OR 1=1 --"); check('SQL-injection-looking search is just text (200, no error)', s == 200 and j.get('ok') is True)
s, j = b.get('/users/discover.php', year='abc'); check('bad year filter -> 422', s == 422)
s, j = anon.get('/users/discover.php'); check('discover requires login -> 401', s == 401)

print('\n[7-11] team requests')
s, j = b.post('/requests/send.php', {'type': 'team_up', 'receiver_id': uid_a, 'message': 'Want to team up?'}); check('B -> A team request 201', s == 201, str(j)[:200]); req_id = (j.get('data') or {}).get('id')
s, j = b.post('/requests/send.php', {'type': 'team_up', 'receiver_id': uid_a}); check('duplicate pending request -> 409', s == 409 and code(j) == 'duplicate_request')
s, j = b.post('/requests/send.php', {'type': 'team_up', 'receiver_id': uid_b}); check('request to self -> 422', s == 422)
s, j = b.post('/requests/send.php', {'type': 'team_up', 'receiver_id': 999999}); check('request to unknown user -> 404', s == 404)
s, j = b.post('/requests/send.php', {'type': 'bogus', 'receiver_id': uid_a}); check('invalid type -> 422', s == 422)
s, j = b.post('/requests/send.php', {'type': 'team_up'}); check('missing receiver -> 422', s == 422)
s, j = a.get('/requests/list.php'); inc = j['data']['incoming']
check('A sees it in incoming (pending, user = B)', any(r['id'] == req_id and r['status'] == 'pending' and r['user']['id'] == uid_b for r in inc), str(j)[:250])
s, j = b.get('/requests/list.php'); check('B sees it in sent', any(r['id'] == req_id for r in j['data']['sent']))
s, j = b.post('/requests/respond.php', {'id': req_id, 'action': 'accept'}); check('sender cannot accept own request -> 403', s == 403)
s, j = anon.post('/requests/respond.php', {'id': req_id, 'action': 'accept'}); check('anonymous cannot respond -> 401', s == 401)
s, j = a.post('/requests/respond.php', {'id': req_id, 'action': 'maybe'}); check('invalid action -> 422', s == 422)
s, j = a.post('/requests/respond.php', {'id': req_id, 'action': 'accept'}); check('A accepts -> 200 accepted', s == 200 and j['data']['status'] == 'accepted', str(j)[:200])
s, j = a.post('/requests/respond.php', {'id': req_id, 'action': 'reject'}); check('responding twice -> 409', s == 409)
s, j = b.post('/requests/cancel.php', {'id': req_id}); check('cancelling an accepted request -> 409', s == 409)
s, j = b.get('/requests/list.php'); check('status verified as accepted', any(r['id'] == req_id and r['status'] == 'accepted' for r in j['data']['sent']))
s, j = b.get('/notifications/list.php'); check('B got an "accepted" notification', any('accepted' in n['title'] for n in j.get('data', [])), str(j)[:200])
s, j = a.get('/notifications/list.php'); check('A got a "new request" notification', len(j.get('data', [])) >= 1)
s, j = b.post('/requests/send.php', {'type': 'team_up', 'receiver_id': uid_a, 'message': 'second'}); rid2 = (j.get('data') or {}).get('id')
s, j = b.post('/requests/cancel.php', {'id': rid2}); check('sender cancels pending -> 200', s == 200 and j['data']['status'] == 'cancelled')
s, j = a.post('/requests/cancel.php', {'id': rid2}); check('non-sender cancel -> 403', s in (403, 409))

print('\n[12-14] projects')
pbody = dict(title='Smoke Project ' + tag, description='A project created by the smoke test, long enough.', category='hackathon', campus_id=campus_id, team_size=2, looking_for=['Frontend Developer'], tech=[sk1])
s, j = a.post('/projects/create.php', pbody); check('A creates project -> 201', s == 201 and j['data']['owner']['id'] == uid_a and j['data']['member_count'] == 1, str(j)[:250]); pid = (j.get('data') or {}).get('id')
s, j = a.post('/projects/create.php', dict(pbody, title='x')); check('short title -> 422', s == 422 and 'title' in fields(j))
s, j = a.post('/projects/create.php', dict(pbody, team_size=99)); check('team size 99 -> 422', s == 422 and 'team_size' in fields(j))
s, j = a.post('/projects/create.php', dict(pbody, tech=['NoSuchTech_' + tag])); check('unknown tech -> 422', s == 422)
s, j = a.post('/projects/create.php', dict(pbody, owner_id=uid_b)); check('owner_id in body ignored (owner = session user)', s == 201 and j['data']['owner']['id'] == uid_a)
s, j = b.get('/projects/get.php', id=pid); check('B views project (owner A, 1 member)', s == 200 and j['data']['owner']['id'] == uid_a and len(j['data']['members']) == 1 and not j['data']['is_member'], str(j)[:200])
s, j = anon.get('/projects/list.php'); check('project list is public', s == 200 and any(p['id'] == pid for p in j['data']))
s, j = anon.get('/projects/list.php', q=tag); check('project search finds it', s == 200 and [p['id'] for p in j['data']] == [pid] or any(p['id'] == pid for p in j['data']))
s, j = a.post('/requests/send.php', {'type': 'join_request', 'project_id': pid}); check('owner cannot join own project -> 4xx', s in (409, 422), str(j)[:150])
s, j = b.post('/requests/send.php', {'type': 'join_request', 'project_id': pid, 'message': 'let me in', 'receiver_id': uid_b}); check('B requests to join -> 201 (receiver derived from project)', s == 201, str(j)[:200]); jr = (j.get('data') or {}).get('id')
s, j = b.post('/requests/send.php', {'type': 'join_request', 'project_id': pid}); check('duplicate join request -> 409', s == 409)
s, j = a.get('/requests/list.php'); check('owner A sees join request from B', any(r['id'] == jr and r['type'] == 'join_request' and r['project']['id'] == pid for r in j['data']['incoming']))
s, j = a.post('/requests/respond.php', {'id': jr, 'action': 'accept'}); check('owner accepts -> B becomes member', s == 200, str(j)[:200])
s, j = b.get('/projects/get.php', id=pid); check('B is now a member (2 members)', j['data']['is_member'] and len(j['data']['members']) == 2)
s, j = b.get('/teams/get.php'); check("B's team page lists the project with 2 members", any(t['project']['id'] == pid and len(t['members']) == 2 for t in j['data']['teams']), str(j)[:200])
s, j = b.post('/requests/send.php', {'type': 'join_request', 'project_id': pid}); check('already a member -> 409', s in (409,))
reg(c, EC, 'Carol Test'); s, j = c.post('/requests/send.php', {'type': 'join_request', 'project_id': pid}); check('joining a full team -> 409', s == 409 and code(j) == 'project_full', str(j)[:150])

print('\n[15] authorization')
s, j = b.post('/projects/update.php', {'id': pid, 'title': 'Hijacked title'}); check("B cannot edit A's project -> 403", s == 403)
s, j = b.post('/projects/delete.php', {'id': pid}); check("B cannot delete A's project -> 403", s == 403)
s, j = a.get('/projects/get.php', id=pid); check('project unchanged', j['data']['title'] == pbody['title'])
for path in ('/admin/overview.php', '/admin/users.php', '/admin/reports.php', '/admin/projects.php', '/admin/hackathons.php', '/admin/skills.php'):
    s, j = b.get(path); check(f'student blocked from {path} -> 403', s == 403)
s, j = anon.get('/admin/overview.php'); check('anonymous blocked from admin -> 401', s == 401)
s, j = b.post('/admin/action.php', {'entity': 'user', 'id': uid_a, 'action': 'suspend'}); check('student cannot run admin actions -> 403', s == 403)
s, j = b.post('/hackathons/create.php', {'name': 'Evil Hack'}); check('student cannot create hackathon -> 403', s == 403)
s, j = anon.get('/requests/list.php'); check('anonymous cannot list requests -> 401', s == 401)
s, j = anon.get('/dashboard/get.php'); check('anonymous cannot open dashboard data -> 401', s == 401)
s, j = a.post('/projects/update.php', {'id': pid, 'team_size': 1}); check('team size below 2 -> 422', s == 422)
s, j = a.post('/projects/update.php', {'id': pid, 'title': 'Renamed ' + tag, 'status': 'in_progress'}); check('owner updates project -> 200', s == 200 and j['data']['title'].startswith('Renamed'))

print('\n[extra] dashboard, hackathons, reports')
s, j = a.get('/dashboard/get.php'); check('dashboard loads for A', s == 200 and 'profile_completion' in j['data'] and j['data']['projects_count'] >= 1, str(j)[:200])
check('dashboard has no password data', not has_secret_keys(j))
s, j = b.get('/hackathons/list.php', include_past='1'); hacks = j.get('data') or []
check('hackathon list ok', s == 200)
if hacks:
    hid = hacks[0]['id']
    s, j = b.post('/hackathons/save.php', {'id': hid}); check('save hackathon', s == 200 and j['data']['is_saved'] is True)
    s, j = b.get('/hackathons/list.php', saved='1', include_past='1'); check('saved filter shows it', any(h['id'] == hid and h['is_saved'] for h in j['data']))
    s, j = b.post('/hackathons/save.php', {'id': hid, 'saved': False}); check('remove bookmark', s == 200 and j['data']['is_saved'] is False)
    s, j = b.get('/hackathons/get.php', id=hid); check('hackathon details', s == 200 and j['data']['id'] == hid)
else:
    print('  skip  no hackathons in DB (load seed.sql to test save/unsave)')
s, j = b.post('/hackathons/save.php', {'id': 999999}); check('save missing hackathon -> 404', s == 404)
s, j = b.post('/reports/create.php', {'target_type': 'user', 'target_id': uid_a, 'reason': 'spam', 'details': 'test'}); check('B reports A -> 201', s == 201, str(j)[:150])
s, j = b.post('/reports/create.php', {'target_type': 'user', 'target_id': uid_a, 'reason': 'spam'}); check('duplicate open report -> 409', s == 409)
s, j = b.post('/reports/create.php', {'target_type': 'user', 'target_id': uid_b, 'reason': 'spam'}); check('cannot report yourself -> 422', s == 422)
s, j = b.post('/reports/create.php', {'target_type': 'project', 'target_id': pid, 'reason': 'bogus'}); check('invalid reason -> 422', s == 422)

ae, ap = os.environ.get('ADMIN_EMAIL'), os.environ.get('ADMIN_PASSWORD')
if ae and ap:
    print('\n[admin] (ADMIN_EMAIL set)')
    adm = Client('admin'); s, j = adm.post('/auth/login.php', {'email': ae, 'password': ap}); check('admin login', s == 200 and j['data']['user']['role'] == 'admin', str(j)[:150])
    for path in ('/admin/overview.php', '/admin/users.php', '/admin/projects.php', '/admin/hackathons.php', '/admin/reports.php', '/admin/skills.php'):
        s, j = adm.get(path); check(f'admin can read {path}', s == 200)
    s, j = adm.get('/admin/users.php'); check('admin users list has no password hashes', not has_secret_keys(j))
    s, j = adm.get('/admin/reports.php'); rep = next((r for r in j['data'] if r['status'] == 'open'), None)
    if rep:
        s, j = adm.post('/admin/action.php', {'entity': 'report', 'id': rep['id'], 'action': 'resolve'}); check('admin resolves a report', s == 200)
    s, j = adm.post('/admin/action.php', {'entity': 'user', 'id': uid_a, 'action': 'suspend'}); check('admin suspends A', s == 200)
    s, j = a.get('/auth/session.php'); check('suspended A is logged out immediately', j['data'] is None)
    s, j = a.post('/auth/login.php', {'email': EA, 'password': PW}); check('suspended A cannot log in -> 403', s == 403)
    adm.post('/admin/action.php', {'entity': 'user', 'id': uid_a, 'action': 'activate'})
    s, j = a.post('/auth/login.php', {'email': EA, 'password': PW}); check('reactivated A can log in', s == 200)
else:
    print('\n[admin] skipped (set ADMIN_EMAIL / ADMIN_PASSWORD to test admin endpoints)')

print('\n[leave team]')
s, j = a.post('/projects/leave.php', {'id': pid}); check('owner cannot leave own project -> 409', s == 409 and code(j) == 'owner_cannot_leave')
s, j = anon.post('/projects/leave.php', {'id': pid}); check('anonymous cannot leave -> 401', s == 401)
s, j = b.post('/projects/leave.php', {'id': pid}); check('member B leaves -> 200', s == 200, str(j)[:150])
s, j = b.post('/projects/leave.php', {'id': pid}); check('leaving twice -> 409', s == 409)
s, j = a.get('/projects/get.php', id=pid); check('team back to 1 member', len(j['data']['members']) == 1)

print('\n[16] project delete + logout')
s, j = a.post('/projects/delete.php', {'id': pid}); check('owner deletes project -> 200', s == 200)
s, j = a.get('/projects/get.php', id=pid); check('deleted project -> 404', s == 404)
s, j = a.post('/auth/logout.php'); check('logout -> 200', s == 200)
s, j = a.get('/auth/session.php'); check('after logout session is empty', j['data'] is None and j['meta']['logged_in'] is False)
s, j = a.get('/users/discover.php'); check('after logout protected endpoint -> 401', s == 401)
a.csrf = None
s, j = a.post('/projects/create.php', pbody); check('after logout writes are rejected (401)', s == 401)

print(f'\n{passed} passed, {failed} failed')
sys.exit(1 if failed else 0)
