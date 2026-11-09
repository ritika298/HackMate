/* HackMate — utils.js
 * Shared UI helpers (namespace: window.HM). No network code here; see api.js.
 * RULE: every value that comes from data MUST go through HM.esc() before being put in innerHTML. */
window.HM = window.HM || {};
(function (HM) {
  'use strict';

  HM.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  HM.$ = (sel, root = document) => root.querySelector(sel);
  HM.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  HM.debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  HM.root = () => document.body.dataset.root || '';
  HM.pageUrl = (file) => (HM.root() === '' ? 'pages/' : '') + file;
  HM.safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  HM.initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  HM.csv = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

  /* ---------- icons (inline SVG, stroke style) ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.7 3.5 2.6 3.5 5.6"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    bell: '<path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.600 2.800 15.400 0 18M12 3c-2.800 2.600-2.800 15.400 0 18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
    github: '<path d="M9 19c-4 1.200-4-2-6-2.500m12 5v-3.500c0-1 .1-1.400-.5-2 2.800-.3 5.500-1.400 5.500-6a4.600 4.600 0 0 0-1.300-3.200 4.200 4.200 0 0 0-.1-3.200s-1.100-.3-3.500 1.300a12 12 0 0 0-6.200 0C6.500 2.800 5.400 3.100 5.400 3.100a4.200 4.200 0 0 0-.1 3.200A4.600 4.600 0 0 0 4 9.500c0 4.600 2.700 5.700 5.500 6-.6.600-.6 1.200-.5 2V21"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 11v5M8 8v.01M12 16v-5m0 2c0-1.500 1-2 2-2s2 .700 2 2.500V16"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    bookmark: '<path d="M6.500 3.500h11v17L12 16.500l-5.500 4z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="m21 3-9.500 18-2.500-7.500L1.500 11z"/><path d="M21 3 9 13.500"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3 4.500 6v5.500c0 4.500 3 8 7.500 9.500 4.500-1.500 7.500-5 7.500-9.500V6z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.500 2.500M15.500 15.500 18 18M18 6l-2.500 2.500M8.500 15.500 6 18"/>',
    inbox: '<path d="M3 13.500 6 5h12l3 8.500V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13.500h5l1 2.500h6l1-2.500h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.600-6 8-6s8 2 8 6"/>',
    logout: '<path d="M9 4H5.500A1.500 1.500 0 0 0 4 5.500v13A1.500 1.500 0 0 0 5.500 20H9M16 8l4 4-4 4M20 12H9"/>',
    edit: '<path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16z"/>',
    alert: '<path d="M12 4 2.500 20h19z"/><path d="M12 10v4M12 17.500v.01"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.500a3 3 0 0 0 3.500 4M16 6h3.500A3 3 0 0 1 16 10M12 13v4M8.500 20h7"/>'
  };
  HM.icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ---------- small renderers ---------- */
  HM.avatar = (user, size = '') => {
    const name = user?.name || '?';
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    const url = HM.safeUrl(user?.avatar_url) || (user?.avatar_url && /^[\w./-]+$/.test(user.avatar_url) ? user.avatar_url : '');
    if (url) return `<img class="avatar ${size}" src="${HM.esc(url)}" alt="${HM.esc(name)}">`;
    return `<div class="avatar ${size}" style="background:linear-gradient(135deg,hsl(${h} 70% 48%),hsl(${(h + 40) % 360} 70% 38%))" aria-hidden="true">${HM.esc(HM.initials(name))}</div>`;
  };
  HM.chips = (list, cls = '', max = 99) => {
    const items = (list || []).slice(0, max).map((s) => `<span class="chip ${cls}">${HM.esc(s)}</span>`);
    if ((list || []).length > max) items.push(`<span class="chip plain">+${list.length - max}</span>`);
    return `<div class="chips">${items.join('')}</div>`;
  };
  HM.status = (s) => `<span class="status s-${HM.esc(s)}">${HM.esc(String(s).replace('_', ' '))}</span>`;
  HM.fmtDate = (d) => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  HM.daysUntil = (d) => Math.ceil((new Date(d).setHours(23, 59, 59) - Date.now()) / 864e5);
  HM.timeAgo = (d) => {
    const m = Math.floor((Date.now() - new Date(d)) / 6e4);
    if (m < 60) return `${Math.max(m, 1)}m ago`; if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  };
  HM.skeletons = (n = 3, h = 180) => Array.from({ length: n }, () => `<div class="skeleton" style="min-height:${h}px"></div>`).join('');
  HM.empty = ({ icon = 'inbox', title, text = '', actionHtml = '' }) =>
    `<div class="empty">${HM.icon(icon)}<h3>${HM.esc(title)}</h3><p class="muted">${HM.esc(text)}</p>${actionHtml}</div>`;
  HM.errorState = (err, retryId = 'retryBtn') =>
    `<div class="empty">${HM.icon('alert')}<h3>Couldn't load this</h3><p class="muted">${HM.esc(err?.message || 'Something went wrong.')}</p><button class="btn btn-ghost" id="${retryId}">Try again</button></div>`;

  /* ---------- toasts ---------- */
  HM.toast = (msg, type = 'info', ms = 3600) => {
    let stack = HM.$('#toasts');
    if (!stack) { stack = document.createElement('div'); stack.id = 'toasts'; stack.className = 'toast-stack'; stack.setAttribute('aria-live', 'polite'); document.body.appendChild(stack); }
    const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg; stack.appendChild(t);
    setTimeout(() => t.remove(), ms);
  };
  HM.toastResult = (res, okMsg) => HM.toast(okMsg, 'success');
  HM.toastError = (err) => { const first = err && err.fields && Object.values(err.fields)[0]; HM.toast(first ? `${err.message} ${first}` : (err?.message || 'Something went wrong. Please try again.'), 'error', 5000); };

  /* ---------- buttons ---------- */
  HM.setLoading = (btn, on) => { if (!btn) return; btn.disabled = on; btn.classList.toggle('loading', on); };

  /* ---------- modals: <div class="modal" id="x"><div class="modal-box">…</div></div> ---------- */
  let lastFocus = null;
  HM.openModal = (id) => { const m = HM.$('#' + id); if (!m) return; lastFocus = document.activeElement; m.classList.add('open'); document.body.style.overflow = 'hidden'; (HM.$('input,select,textarea,button:not(.modal-x)', m) || m).focus(); };
  HM.closeModal = (id) => { const m = id ? HM.$('#' + id) : HM.$('.modal.open'); if (!m) return; m.classList.remove('open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus && lastFocus.focus(); };
  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal')) HM.closeModal();
    if (e.target.closest('[data-close]')) HM.closeModal();
    const dd = e.target.closest('.dropdown');
    HM.$$('.dropdown.open').forEach((d) => { if (d !== dd) d.classList.remove('open'); });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { HM.closeModal(); HM.$$('.dropdown.open').forEach((d) => d.classList.remove('open')); } });
  HM.modalShell = (id, title, bodyHtml, wide = false) =>
    `<div class="modal" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-t"><div class="modal-box ${wide ? 'wide' : ''}"><div class="modal-head"><h3 id="${id}-t">${HM.esc(title)}</h3><button class="modal-x" data-close aria-label="Close">${HM.icon('x')}</button></div>${bodyHtml}</div></div>`;

  /* ---------- form validation (UX only! the backend MUST re-validate everything) ---------- */
  HM.rules = {
    required: (m = 'This field is required.') => (v) => (String(v).trim() ? '' : m),
    minLen: (n, m) => (v) => (String(v).trim().length >= n ? '' : m || `Use at least ${n} characters.`),
    maxLen: (n, m) => (v) => (String(v).length <= n ? '' : m || `Keep it under ${n} characters.`),
    email: () => (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter a valid email address.'),
    password: () => (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : 'Use 8+ characters with at least one letter and one number.'),
    matches: (otherName, m = 'Passwords do not match.') => (v, form) => (v === form.elements[otherName].value ? '' : m),
    url: (host) => (v) => (!v || (HM.safeUrl(v) && (!host || new URL(v).hostname.endsWith(host))) ? '' : host ? `Enter a valid ${host} link.` : 'Enter a valid link starting with https://')
  };
  /* rules = { fieldName: [ruleFn, …] } → returns {values} or null when invalid */
  HM.validate = (form, rules) => {
    let ok = true; const values = {};
    Object.keys(rules).forEach((name) => {
      const el = form.elements[name]; if (!el) return;
      const val = el.type === 'checkbox' ? el.checked : el.value;
      let err = ''; for (const r of rules[name]) { err = r(val, form); if (err) break; }
      const field = el.closest('.field');
      if (field) { field.classList.toggle('invalid', !!err); const box = HM.$('.field-error', field); if (box) box.textContent = err; }
      el.setAttribute('aria-invalid', err ? 'true' : 'false');
      if (err) ok = false; values[name] = typeof val === 'string' ? val.trim() : val;
    });
    if (!ok) { const first = HM.$('.field.invalid .input, .field.invalid .select, .field.invalid .textarea', form); first && first.focus(); }
    return ok ? values : null;
  };
  HM.fillSelect = (sel, items, { placeholder, valueKey = 'id', labelKey = 'name' } = {}) => {
    sel.innerHTML = (placeholder ? `<option value="">${HM.esc(placeholder)}</option>` : '') +
      items.map((i) => { const v = typeof i === 'object' ? i[valueKey] : i; const l = typeof i === 'object' ? i[labelKey] : i; return `<option value="${HM.esc(v)}">${HM.esc(l)}</option>`; }).join('');
  };

  /* ---------- shared layout: navbar + footer ---------- */
  const NAV = [['dashboard', 'Dashboard', 'dashboard.html'], ['discover', 'Discover', 'discover.html'], ['projects', 'Projects', 'projects.html'], ['hackathons', 'Hackathons', 'hackathons.html'], ['requests', 'Requests', 'requests.html'], ['team', 'My Team', 'team.html']];
  const LOGO = `<span class="logo-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="8" r="2.2"/><circle cx="10" cy="18" r="2.2"/><path d="M8 7l8 .8M7 8l2 8M17 10l-6 6.500"/></svg></span>HackMate`;

  HM.renderNav = (active, { landing = false } = {}) => {
    const host = HM.$('#app-nav'); if (!host) return;
    const R = HM.root(); const P = HM.pageUrl;
    const links = landing
      ? `<a href="#how">How it works</a><a href="#projects">Projects</a><a href="#hackathons">Hackathons</a><a href="#skills">Skills</a>`
      : NAV.map(([k, l, f]) => `<a href="${P(f)}" ${k === active ? 'aria-current="page"' : ''}>${l}</a>`).join('');
    const right = landing
      ? `<select class="select campus-select" id="campusSelect" aria-label="Choose your campus"><option value="">All campuses</option></select>
         <a class="btn btn-ghost hide-sm" href="${P('login.html')}">Log in</a><a class="btn btn-primary" href="${P('signup.html')}">Sign up</a>`
      : `<a class="btn btn-ghost btn-sm" href="${P('requests.html')}" aria-label="Requests">${HM.icon('bell')}</a>
         <div class="dropdown"><button class="btn btn-ghost btn-sm" id="userBtn" aria-haspopup="true" aria-label="Account menu"><span id="navAvatar">${HM.icon('user')}</span></button>
          <div class="dropdown-menu" role="menu"><div class="dropdown-head"><b id="navName">Your account</b><div class="small muted" id="navCampus"></div></div>
           <a href="${P('profile.html')}">${HM.icon('user')}My profile</a><a href="${P('admin.html')}">${HM.icon('shield')}Admin</a>
           <button id="logoutBtn">${HM.icon('logout')}Log out</button></div></div>`;
    host.innerHTML = `<header class="nav"><div class="container nav-inner"><a class="logo" href="${R}index.html">${LOGO}</a>
      <nav class="nav-links" aria-label="Main">${links}</nav><div class="nav-actions">${right}</div>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">${HM.icon('menu')}</button></div></header>`;
    HM.$('#navToggle').addEventListener('click', (e) => { const n = HM.$('.nav'); const o = n.classList.toggle('menu-open'); e.currentTarget.setAttribute('aria-expanded', o); });
    const ub = HM.$('#userBtn'); if (ub) ub.addEventListener('click', (e) => { e.stopPropagation(); ub.parentElement.classList.toggle('open'); });
    const lo = HM.$('#logoutBtn'); if (lo) lo.addEventListener('click', async () => { try { await HM.api.logout(); window.location.href = P('login.html'); } catch (err) { HM.toastError(err); } });
    if (!landing && HM.api) HM.api.getCurrentUser().then((u) => { // fills the menu; never used for security decisions
      if (!u) return; HM.$('#navAvatar').innerHTML = HM.avatar(u, 'avatar-sm'); HM.$('#navName').textContent = u.name; HM.$('#navCampus').textContent = u.campus || '';
    }).catch(() => {});
  };
  HM.renderFooter = () => {
    const host = HM.$('#app-footer'); if (!host) return; const P = HM.pageUrl;
    host.innerHTML = `<footer class="footer"><div class="container footer-inner"><div><a class="logo" href="${HM.root()}index.html">${LOGO}</a><p class="muted small" style="margin-top:10px;max-width:26em">Built by students, for students. Find your people and build something great.</p></div>
      <div class="footer-links"><a href="${P('discover.html')}">Discover</a><a href="${P('projects.html')}">Projects</a><a href="${P('hackathons.html')}">Hackathons</a><a href="${P('signup.html')}">Join</a></div></div></footer>`;
  };
  HM.initPage = (active, opts) => { HM.renderNav(active, opts); HM.renderFooter(); };
})(window.HM);
