/* HackMate — api.js
 * ============================================================================
 * THE ONLY FILE THAT TALKS TO THE BACKEND. Every page calls HM.api.* — never fetch() directly.
 *
 * Conventions
 *  - Base URL:   HM_CONFIG.API_BASE  (relative, so it works on any free host)
 *  - Success:    { "success": true, "ok": true, "message": "…", "data": …, "meta": { … } }
 *  - Failure:    { "success": false, "ok": false, "message": "…", "error": { "code": "validation_error", "message": "…", "fields": { "email": "…" } } }
 *  - Auth:       PHP session cookie (credentials: 'same-origin'). NO tokens or secrets in JS.
 *  - CSRF:       backend issues a token via GET /auth/csrf.php; it is sent as X-CSRF-Token on every write.
 * ========================================================================== */
window.HM_CONFIG = {
  API_BASE: '../../backend/api' // relative to /frontend/pages/*.html (index.html is adjusted below). Change if your host maps folders differently.
};
(function (HM) {
  'use strict';
  if (HM.root && HM.root() === '') window.HM_CONFIG.API_BASE = '../backend/api'; // called from frontend/index.html

  class ApiError extends Error {
    constructor(message, code = 'error', fields = {}, status = 0) { super(message); this.code = code; this.fields = fields; this.status = status; }
  }
  HM.ApiError = ApiError;

  let csrfToken = null;
  async function getCsrf(force) {
    if (csrfToken && !force) return csrfToken;
    const res = await fetch(`${HM_CONFIG.API_BASE}/auth/csrf.php`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const json = await res.json(); csrfToken = json.data && json.data.token; return csrfToken;
  }

  /* Real network call. path e.g. '/users/discover.php'. Retries once if the CSRF token went stale (e.g. after logout/login). */
  async function request(path, { method = 'GET', query, body } = {}, retried = false) {
    const url = new URL(`${HM_CONFIG.API_BASE}${path}`, window.location.href);
    Object.entries(query || {}).forEach(([k, v]) => { if (v !== '' && v != null) url.searchParams.set(k, v); });
    const headers = { Accept: 'application/json' };
    if (method !== 'GET') { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = await getCsrf(retried); }
    let res;
    try { res = await fetch(url, { method, headers, credentials: 'same-origin', body: method !== 'GET' ? JSON.stringify(body || {}) : undefined }); }
    catch (e) { throw new ApiError('Network error. Check your connection and try again.', 'network'); }
    let json = null; try { json = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || !json || json.ok === false) {
      const err = (json && json.error) || {};
      if (res.status === 403 && err.code === 'csrf_invalid' && !retried) { csrfToken = null; return request(path, { method, query, body }, true); }
      if (res.status === 401 && err.code === 'unauthenticated' && !/login|signup/.test(location.pathname)) location.href = HM.pageUrl('login.html');
      throw new ApiError(err.message || `Request failed (${res.status}).`, err.code, err.fields, res.status);
    }
    return json;
  }
  const call = (path, opts) => request(path, opts).then((j) => j.data);

  HM.api = {
    /* ----- reference data ----- */
    getCampuses: () => call('/campuses/list.php'),                                  // → [{id, short_name}]
    getSkills: () => call('/skills/list.php'),                                      // → [{id, name}]
    getStats: () => call('/stats/public.php'),                                      // → {students, projects, hackathons, teams_formed}

    /* ----- auth ----- */
    signup: (payload) => call('/auth/register.php', { method: 'POST', body: payload }),   // {name,email,password,confirm_password,campus_id,branch,year}
    login: (payload) => call('/auth/login.php', { method: 'POST', body: payload }),       // {email,password,remember}
    logout: () => call('/auth/logout.php', { method: 'POST' }).then((r) => { csrfToken = null; return r; }),
    requestPasswordReset: (email) => call('/auth/forgot.php', { method: 'POST', body: { email } }),
    getCurrentUser: () => call('/auth/session.php'),                                // → user | null

    /* ----- users / profile ----- */
    getUsers: (filters = {}) => call('/users/discover.php', { query: filters }),    // ?q&campus&skill&role&branch&year
    getProfile: (id) => call('/users/profile.php', { query: id ? { id } : {} }),    // omit id = me
    updateProfile: (payload) => call('/users/profile.php', { method: 'POST', body: payload }),

    /* ----- team requests ----- */
    sendRequest: (payload) => call('/requests/send.php', { method: 'POST', body: payload }),       // {type, receiver_id?, project_id?, message}
    getRequests: () => call('/requests/list.php'),                                                 // → {incoming:[], sent:[]}
    respondRequest: (id, action) => call('/requests/respond.php', { method: 'POST', body: { id, action } }), // accept|reject
    cancelRequest: (id) => call('/requests/cancel.php', { method: 'POST', body: { id } }),

    /* ----- projects ----- */
    getProjects: (filters = {}) => call('/projects/list.php', { query: filters }),
    getProject: (id) => call('/projects/get.php', { query: { id } }),
    createProject: (payload) => call('/projects/create.php', { method: 'POST', body: payload }),
    updateProject: (payload) => call('/projects/update.php', { method: 'POST', body: payload }),
    deleteProject: (id) => call('/projects/delete.php', { method: 'POST', body: { id } }),
    leaveProject: (id) => call('/projects/leave.php', { method: 'POST', body: { id } }),

    /* ----- hackathons ----- */
    /* ----- hackathons ----- */
getHackathons: (filters = {}) =>
  call('/hackathons/list.php', { query: filters }),

getHackathon: (id) =>
  call('/hackathons/get.php', { query: { id } }),

createHackathon: (payload) =>
  call('/hackathons/create.php', {
    method: 'POST',
    body: payload
  }),

updateHackathon: (payload) =>
  call('/hackathons/update.php', {
    method: 'POST',
    body: payload
  }),

saveHackathon: (id) =>
  call('/hackathons/save.php', {
    method: 'POST',
    body: { id, saved: true }
  }),

unsaveHackathon: (id) =>
  call('/hackathons/save.php', {
    method: 'POST',
    body: { id, saved: false }
  }),

    /* ----- team / dashboard / notifications / reports ----- */
    getTeam: () => call('/teams/get.php'),                                          // → {teams:[{project, members:[]}]}
    getDashboard: () => call('/dashboard/get.php'),
    getNotifications: () => call('/notifications/list.php'),
    markNotificationsRead: (id) => call('/notifications/read.php', { method: 'POST', body: id ? { id } : {} }),
    reportContent: (payload) => call('/reports/create.php', { method: 'POST', body: payload }),   // {target_type,target_id,reason,details}

    /* ----- admin (the backend enforces role = admin on every one of these) ----- */
    getAdminOverview: () => call('/admin/overview.php'),
    getAdminActivity: () => call('/admin/activity.php'),
    getAdminUsers: () => call('/admin/users.php'),
    getAdminProjects: () => call('/admin/projects.php'),
    getAdminHackathons: () => call('/admin/hackathons.php'),
    getAdminReports: () => call('/admin/reports.php'),
    
    adminAction: (payload) => call('/admin/action.php', { method: 'POST', body: payload })      // {entity,id,action}
  };
})(window.HM);
