#!/usr/bin/env python3
"""Browser test for role-based login redirects, the account dropdown and the admin page guard.

    pip install playwright && playwright install chromium
    python3 tests/role_nav_e2e.py

It serves the REAL frontend/ files and talks to a small in-process MOCK of the PHP API (MockApi below). The mock copies the
documented contract: JSON envelope, HMSESSID session cookie, X-CSRF-Token on writes, 401 'unauthenticated' when logged out,
403 'forbidden' for a student on /admin/*. It exists so the FRONTEND can be tested without PHP/MySQL. It does NOT test the PHP
code: for that run tests/check_admin_guards.py (static) and tests/auth_roles_test.py (live API). Passwords below are throw-away
values generated for this run only.
Exit code is non-zero if any check fails."""
import json, re, secrets, sys, threading, uuid
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
CAMPUSES = [(1, 'IGDTUW'), (2, 'DTU'), (3, 'NSUT'), (4, 'IIT Delhi'), (5, 'Other')]   # same rows as database/seed.sql
ADMIN_PATHS = {'/admin/overview.php', '/admin/users.php', '/admin/projects.php', '/admin/hackathons.php', '/admin/reports.php', '/admin/skills.php',
               '/admin/action.php', '/hackathons/create.php', '/hackathons/update.php', '/hackathons/delete.php'}


class MockApi:
    """State shared by all requests. Mirrors backend/api behaviour closely enough for the frontend."""

    def __init__(self, student_pw, admin_pw):
        self.users = {
            1: dict(id=1, name='Admin HackMate', email='admin@hackmate.test', pw=admin_pw, role='admin', campus='DTU', campus_id=2, status='active'),
            2: dict(id=2, name='Shubham Verma', email='shubham@hackmate.test', pw=student_pw, role='student', campus='DTU', campus_id=2, status='active'),
        }
        self.sessions = {}      # sid -> {'uid': int|None, 'csrf': str}
        self.log = []           # (method, path, status) of every API call, for assertions
        self.lock = threading.Lock()

    def public(self, u):
        return {k: u[k] for k in ('id', 'name', 'email', 'role', 'campus', 'campus_id')}

    def handle(self, method, path, query, body, sid):
        """Returns (status, payload, new_sid_or_None, destroy_cookie)."""
        with self.lock:
            new_sid = None
            sess = self.sessions.get(sid)
            if sess is None:                       # PHP starts a session for every visitor
                new_sid = secrets.token_hex(16)
                sess = self.sessions[new_sid] = {'uid': None, 'csrf': secrets.token_hex(32)}
                sid = new_sid
            me = self.users.get(sess['uid']) if sess['uid'] else None
            if me and me['status'] != 'active':
                sess['uid'] = None; me = None

            def ok(data=None, msg='OK', status=201 if path in ('/auth/register.php',) else 200, meta=None):
                return status, {'success': True, 'ok': True, 'message': msg, 'data': data, 'meta': meta or {}}

            def err(status, code, msg, fields=None):
                return status, {'success': False, 'ok': False, 'message': msg, 'error': {'code': code, 'message': msg, 'fields': fields or {}}}

            if method != 'GET' and not (sess['csrf'] and secrets.compare_digest(sess['csrf'], self._csrf_header)):
                res = err(403, 'csrf_invalid', 'Your session expired. Please try again.')
            elif path == '/auth/csrf.php':
                res = ok({'token': sess['csrf']})
            elif path == '/auth/session.php':
                res = ok(self.public(me) if me else None, 'Logged in.' if me else 'Not logged in.',
                         meta={'logged_in': bool(me), 'user_id': me and me['id'], 'role': me and me['role']})
            elif path == '/auth/login.php':
                u = next((x for x in self.users.values() if x['email'] == (body.get('email') or '').lower()), None)
                if not u or u['pw'] != body.get('password'):
                    res = err(401, 'invalid_credentials', 'Incorrect email or password.')
                else:
                    new_sid = secrets.token_hex(16)    # session_regenerate_id(true): new id, same csrf token
                    self.sessions[new_sid] = {'uid': u['id'], 'csrf': sess['csrf']}; self.sessions.pop(sid, None)
                    res = ok({'user': {'id': u['id'], 'name': u['name'], 'role': u['role']}}, 'Logged in successfully.')
            elif path == '/auth/register.php':
                email = (body.get('email') or '').lower()
                if me:
                    res = err(409, 'already_authenticated', 'You are already logged in.')
                elif any(x['email'] == email for x in self.users.values()):
                    res = err(422, 'validation_error', 'Please fix the highlighted fields.', {'email': 'This email is already registered.'})
                else:
                    uid = max(self.users) + 1                       # role is NEVER read from the request: always 'student'
                    camp = dict(CAMPUSES).get(int(body.get('campus_id') or 0), 'Other')
                    self.users[uid] = dict(id=uid, name=body['name'], email=email, pw=body['password'], role='student', campus=camp, campus_id=int(body['campus_id']), status='active')
                    new_sid = secrets.token_hex(16); self.sessions[new_sid] = {'uid': uid, 'csrf': sess['csrf']}; self.sessions.pop(sid, None)
                    res = ok({'user': {'id': uid, 'name': body['name'], 'role': 'student'}}, 'Account created successfully.', 201)
            elif path == '/auth/logout.php':
                self.sessions.pop(sid, None); res = ok({}, 'Logged out.'); self.log.append((method, path, 200))
                return res[0], res[1], None, True
            elif path == '/campuses/list.php':
                res = ok([{'id': i, 'short_name': n} for i, n in CAMPUSES])
            elif path in ADMIN_PATHS:                                # == require_admin()
                if not me:
                    res = err(401, 'unauthenticated', 'Please log in to continue.')
                elif me['role'] != 'admin':
                    res = err(403, 'forbidden', 'You do not have permission to do that.')
                elif path == '/admin/action.php' and body.get('entity') == 'user' and body.get('id') == me['id']:
                    res = err(409, 'forbidden_target', 'You cannot change your own account status.')      # same rule as admin/action.php
                elif path == '/admin/overview.php':
                    res = ok({'users': len(self.users), 'projects': 3, 'hackathons': 4, 'open_reports': 1, 'skills': 29})
                elif path == '/admin/users.php':
                    res = ok([{k: u[k] for k in ('id', 'name', 'email', 'campus', 'role', 'status')} for u in self.users.values()])
                else:
                    res = ok([])
            elif path == '/dashboard/get.php':                       # == require_login()
                if not me:
                    res = err(401, 'unauthenticated', 'Please log in to continue.')
                else:
                    res = ok({'user': self.public(me), 'profile_completion': 40, 'pending_requests': 0, 'projects_count': 0, 'saved_hackathons_count': 0,
                              'team_members_count': 0, 'recommended_users': [], 'my_projects': [], 'upcoming_hackathons': [], 'notifications': []})
            elif path.startswith('/__test/set_role'):                # test hook only: flip a role on the "server"
                uid, role = int(query['uid'][0]), query['role'][0]
                self.users[uid]['role'] = role; res = ok({})
            else:                                                    # any other endpoint: login required, empty list
                res = (err(401, 'unauthenticated', 'Please log in to continue.') if not me and path not in ('/skills/list.php', '/stats/public.php', '/hackathons/list.php', '/projects/list.php') else ok([]))
            self.log.append((method, path, res[0]))
            return res[0], res[1], new_sid, False


def make_server(api):
    class H(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k): super().__init__(*a, directory=str(ROOT), **k)
        def log_message(self, *a): pass
        def _api(self, method):
            u = urlparse(self.path); path = u.path[len('/backend/api'):]
            n = int(self.headers.get('Content-Length') or 0)
            body = json.loads(self.rfile.read(n) or b'{}') if n else {}
            c = SimpleCookie(self.headers.get('Cookie') or ''); sid = c['HMSESSID'].value if 'HMSESSID' in c else None
            api._csrf_header = self.headers.get('X-CSRF-Token') or '\0'
            status, payload, new_sid, destroy = api.handle(method, path, parse_qs(u.query), body, sid)
            raw = json.dumps(payload).encode()
            self.send_response(status); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(raw)))
            self.send_header('Cache-Control', 'no-store')
            if new_sid: self.send_header('Set-Cookie', f'HMSESSID={new_sid}; Path=/; HttpOnly; SameSite=Lax')
            if destroy: self.send_header('Set-Cookie', 'HMSESSID=; Path=/; Max-Age=0')
            self.end_headers(); self.wfile.write(raw)
        def do_GET(self):
            return self._api('GET') if self.path.startswith('/backend/api/') else super().do_GET()
        def do_POST(self):
            return self._api('POST') if self.path.startswith('/backend/api/') else self.send_error(405)
    return ThreadingHTTPServer(('127.0.0.1', 0), H)


# ------------------------------------------------------------------------------------------------ the tests
passed = failed = 0


def check(label, cond, detail=''):
    global passed, failed
    if cond: passed += 1; print(f'  ok    {label}')
    else: failed += 1; print(f'  FAIL  {label}  {detail}')


def main():
    from playwright.sync_api import sync_playwright
    spw, apw = 'Stu-' + uuid.uuid4().hex[:10], 'Adm-' + uuid.uuid4().hex[:10]
    api = MockApi(spw, apw); srv = make_server(api); base = f'http://127.0.0.1:{srv.server_address[1]}'
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    pages = f'{base}/frontend/pages'

    def admin_calls():
        return [x for x in api.log if x[1].startswith('/admin/')]

    def open_menu(pg):
        pg.wait_for_selector('#navName:not(:has-text("Your account"))', state='attached', timeout=5000)   # menu filled from the server session (it sits inside the closed dropdown)
        pg.click('#userBtn')

    def menu_texts(pg):
        return [t.strip() for t in pg.locator('.dropdown-menu a, .dropdown-menu button').all_inner_texts()]

    def login(pg, email, pw):
        pg.goto(f'{pages}/login.html'); pg.fill('#email', email); pg.fill('#password', pw); pg.click('#loginForm button[type=submit]')

    with sync_playwright() as p:
        browser = p.chromium.launch()

        def fresh():
            ctx = browser.new_context(); return ctx, ctx.new_page()

        print('\n[1] student login')
        ctx, pg = fresh()
        login(pg, 'shubham@hackmate.test', spw)
        pg.wait_for_url('**/dashboard.html', timeout=5000)
        check('student is sent to dashboard.html', pg.url.endswith('/frontend/pages/dashboard.html'), pg.url)
        pg.wait_for_selector('.welcome', timeout=5000); open_menu(pg)
        check('student dropdown shows profile + log out', menu_texts(pg) == ['My profile', 'Log out'], str(menu_texts(pg)))
        check('student: NO admin link anywhere in the page DOM', pg.locator('a[href$="admin.html"], [data-admin-link]').count() == 0)
        check('student: the word "Admin" is not in the nav', 'admin' not in pg.locator('header.nav').inner_text().lower().replace('admin hackmate', ''))
        for f in ('discover', 'projects', 'hackathons', 'requests', 'team', 'profile'):      # normal student navigation keeps working
            pg.goto(f'{pages}/{f}.html'); open_menu(pg)
            check(f'student on {f}.html: no admin link, normal menu', pg.locator('[data-admin-link], a[href$="admin.html"]').count() == 0 and 'Log out' in menu_texts(pg))
        check('student navigation reached every page (not bounced)', pg.url.endswith('/profile.html'), pg.url)

        print('\n[2] student opens admin.html by typing the URL')
        n0 = len(admin_calls())
        pg.goto(f'{pages}/admin.html'); pg.wait_for_url('**/dashboard.html', timeout=5000)
        check('student is redirected away from admin.html', pg.url.endswith('/dashboard.html'), pg.url)
        check('no admin API call was even attempted', len(admin_calls()) == n0, str(admin_calls()[n0:]))
        pg.go_back(); pg.wait_for_timeout(300)
        check('admin UI never became visible (Back button too)', pg.locator('#adminShell:visible').count() == 0 and pg.locator('#panel:visible').count() == 0)

        print('\n[3] tampering with browser storage / cookies as a student')
        pg.goto(f'{pages}/dashboard.html')
        pg.evaluate("""() => { for (const k of ['role','userRole','hm_role','isAdmin','user','hm_user','currentUser']) {
            localStorage.setItem(k, k === 'user' || k.endsWith('user') || k === 'currentUser' ? JSON.stringify({role:'admin',isAdmin:true}) : 'admin');
            sessionStorage.setItem(k, 'admin'); } document.cookie = 'role=admin; path=/'; document.cookie = 'isAdmin=true; path=/'; }""")
        pg.reload(); open_menu(pg)
        check('tampered storage does not reveal the Admin option', pg.locator('[data-admin-link], a[href$="admin.html"]').count() == 0 and menu_texts(pg) == ['My profile', 'Log out'])
        pg.goto(f'{pages}/admin.html'); pg.wait_for_url('**/dashboard.html', timeout=5000)
        check('tampered storage does not open admin.html', pg.url.endswith('/dashboard.html') and not admin_calls())
        check('server confirms student cannot call admin API (403 forbidden)',
              pg.evaluate("""async () => (await fetch('../../backend/api/admin/users.php', {credentials:'same-origin'})).status""") == 403)
        check('...and no admin data leaked in that response',
              'email' not in pg.evaluate("""async () => await (await fetch('../../backend/api/admin/users.php', {credentials:'same-origin'})).text()"""))

        print('\n[4] student logout, then anonymous visitor')
        pg.click('#userBtn'); pg.click('#logoutBtn'); pg.wait_for_url('**/login.html', timeout=5000)
        check('logout returns to login.html', pg.url.endswith('/login.html'))
        pg.goto(f'{pages}/admin.html'); pg.wait_for_url('**/login.html', timeout=5000)
        check('logged-out visitor on admin.html is sent to login', pg.url.endswith('/login.html'))
        pg.goto(f'{pages}/dashboard.html'); pg.wait_for_url('**/login.html', timeout=5000)
        check('logged-out visitor on dashboard.html is still sent to login (existing behaviour kept)', pg.url.endswith('/login.html'))
        pg.goto(f'{pages}/login.html'); pg.wait_for_timeout(300); pg.click('#userBtn')
        check('logged-out visitor never sees an Admin option', pg.locator('[data-admin-link], a[href$="admin.html"]').count() == 0)
        ctx.close()

        print('\n[5] admin login')
        ctx, pg = fresh()
        login(pg, 'admin@hackmate.test', apw)
        pg.wait_for_url('**/admin.html', timeout=5000)
        check('admin is sent to admin.html', pg.url.endswith('/frontend/pages/admin.html'), pg.url)
        pg.wait_for_selector('#adminShell:visible', timeout=5000); pg.wait_for_selector('.admin-stats', timeout=5000)
        check('admin sees the admin panel with live overview data', pg.locator('.admin-stats .card').count() == 5)
        open_menu(pg)
        check('admin dropdown shows the Admin option', menu_texts(pg) == ['My profile', 'Admin', 'Log out'], str(menu_texts(pg)))
        check('Admin option points at admin.html and is marked current', pg.get_attribute('[data-admin-link]', 'href').endswith('admin.html') and pg.get_attribute('[data-admin-link]', 'aria-current') == 'page')
        pg.click('button[data-tab=users]'); pg.wait_for_selector('table td:has-text("shubham@hackmate.test")', timeout=5000)
        check('admin Users tab works', True)
        pg.goto(f'{pages}/dashboard.html'); open_menu(pg)
        check('admin still sees the Admin option on other pages', 'Admin' in menu_texts(pg))
        pg.click('[data-admin-link]'); pg.wait_for_url('**/admin.html', timeout=5000)
        check('clicking Admin opens the admin page', pg.locator('#adminShell:visible').count() == 1)
        pg.click('#userBtn'); pg.click('#logoutBtn'); pg.wait_for_url('**/login.html', timeout=5000)
        pg.goto(f'{pages}/admin.html'); pg.wait_for_url('**/login.html', timeout=5000)
        check('after admin logout, admin.html is locked again', pg.url.endswith('/login.html'))
        ctx.close()

        print('\n[6] role is read from the server on every load')
        ctx, pg = fresh()
        login(pg, 'shubham@hackmate.test', spw); pg.wait_for_url('**/dashboard.html')
        pg.request.get(f'{base}/backend/api/__test/set_role?uid=2&role=admin')          # server-side promotion
        pg.reload(); open_menu(pg)
        check('promoted user gets the Admin option after reload (no re-login, nothing cached in browser)', 'Admin' in menu_texts(pg))
        pg.goto(f'{pages}/admin.html'); pg.wait_for_selector('#adminShell:visible', timeout=5000)
        check('promoted user can open admin.html', True)
        pg.request.get(f'{base}/backend/api/__test/set_role?uid=2&role=student')        # server-side demotion
        pg.reload(); pg.wait_for_url('**/dashboard.html', timeout=5000)
        check('demoted user is bounced from admin.html on next load', pg.url.endswith('/dashboard.html'))
        open_menu(pg)
        check('demoted user loses the Admin option', 'Admin' not in menu_texts(pg))
        ctx.close()

        print('\n[7] fail closed when the session cannot be checked')
        ctx, pg = fresh()
        login(pg, 'admin@hackmate.test', apw); pg.wait_for_url('**/admin.html'); pg.wait_for_selector('#adminShell:visible')
        pg.route('**/auth/session.php', lambda r: r.abort())
        pg.reload(); pg.wait_for_selector('#adminGate .error-state, #adminGate #retryBtn', timeout=5000)
        check('network error shows an error + retry, admin panel stays hidden', pg.locator('#adminShell:visible').count() == 0 and pg.locator('#retryBtn').count() == 1)
        pg.unroute('**/auth/session.php'); pg.click('#retryBtn'); pg.wait_for_selector('#adminShell:visible', timeout=5000)
        check('retry works once the network is back', pg.locator('.admin-stats').count() == 1)
        ctx.close()

        print('\n[8] login keeps working: errors, signup, session lookup failure')
        ctx, pg = fresh()
        login(pg, 'shubham@hackmate.test', 'wrong-password-1')
        pg.wait_for_selector('.form-error:not(.hidden)', timeout=5000)
        check('wrong password shows an error and stays on login', pg.url.endswith('/login.html') and 'Incorrect' in pg.inner_text('.form-error'))
        flag = {'after_login': False}
        pg.on('response', lambda r: flag.update(after_login=True) if r.url.endswith('/auth/login.php') and r.status == 200 else None)
        pg.route('**/auth/session.php', lambda r: r.abort() if flag['after_login'] else r.continue_())
        pg.fill('#password', spw); pg.click('#loginForm button[type=submit]'); pg.wait_for_url('**/dashboard.html', timeout=5000)
        check('if the role lookup fails after login, user still lands safely on the student dashboard', pg.url.endswith('/dashboard.html'))
        ctx.close()

        ctx, pg = fresh()
        pg.goto(f'{pages}/signup.html'); pg.wait_for_selector('#signupForm select[name=campus_id] option:nth-child(6)', state='attached', timeout=5000)
        camp_labels = pg.locator('#signupForm select[name=campus_id] option').all_inner_texts()
        check('campus options are untouched (IGDTUW, DTU, NSUT, IIT Delhi, Other)', camp_labels[1:] == [n for _, n in CAMPUSES], str(camp_labels))
        pg.fill('[name=name]', 'Test Student'); pg.fill('[name=email]', f'new_{uuid.uuid4().hex[:6]}@hackmate.test')
        pg.fill('[name=password]', 'Passw0rd-xyz1'); pg.fill('[name=confirm_password]', 'Passw0rd-xyz1')
        pg.select_option('[name=campus_id]', '1'); pg.fill('[name=branch]', 'CSE'); pg.select_option('[name=year]', '2')
        pg.click('#signupForm button[type=submit]'); pg.wait_for_url('**/dashboard.html', timeout=5000)
        check('new signup lands on dashboard.html', pg.url.endswith('/dashboard.html'))
        pg.wait_for_selector('.welcome'); open_menu(pg)
        check('new signup is a student: no Admin option', menu_texts(pg) == ['My profile', 'Log out'], str(menu_texts(pg)))
        ctx.close()
        browser.close()

    srv.shutdown()
    print(f'\n{passed} passed, {failed} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
