/* HackMate — admin-dashboard.js : the "Overview" of the Admin Command Centre. UI ONLY.
 * Data comes from two admin-only endpoints (each re-checks role = 'admin' on the server):
 *   GET /admin/overview.php  -> live counts      GET /admin/activity.php -> recent users / projects / reports / hackathons / moderation
 * The two are loaded independently, so one failing section shows its own error + retry while the other still renders.
 * Every value that comes from data goes through HM.esc(). */
(function (HM) {
  'use strict';
  const e = HM.esc;

  /* Icons used only by the admin console (the shared set in utils.js is left untouched). */
  const EXTRA = {
    dashboard: '<rect x="3.500" y="3.500" width="7" height="8" rx="1.500"/><rect x="13.500" y="3.500" width="7" height="5" rx="1.500"/><rect x="13.500" y="11.500" width="7" height="9" rx="1.500"/><rect x="3.500" y="14.500" width="7" height="6" rx="1.500"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    tag: '<path d="M3.500 12.500V4.500a1 1 0 0 1 1-1h8l8 8-8.500 8.500z"/><circle cx="8" cy="8" r="1.200"/>',
    pulse: '<path d="M3 12h4l2.500-6 4 12 2.500-6H21"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4.500L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4.500L20 15M20 20v-5h-5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>'
  };
  const ic = (name) => (EXTRA[name] ? `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${EXTRA[name]}</svg>` : HM.icon(name));

  const ago = (d) => (d ? HM.timeAgo(String(d).replace(' ', 'T')) : '');
  const num = (n) => Number(n || 0).toLocaleString('en-IN');
  const REASON = { spam: 'Spam', harassment: 'Harassment', fake_profile: 'Fake profile', inappropriate: 'Inappropriate content', other: 'Other' };

  /* Admin section pages (also the sidebar). `route` is the location.hash the section lives at. */
  
  
const SECTIONS = [
  { tab: 'overview', route: 'overview', label: 'Overview', icon: 'dashboard', title: 'Overview' },
  { tab: 'users', route: 'users', label: 'Users', icon: 'users', title: 'Manage users' },
  { tab: 'projects', route: 'projects', label: 'Projects', icon: 'folder', title: 'Manage projects' },
  { tab: 'hackathons', route: 'hackathons', label: 'Hackathons', icon: 'trophy', title: 'Manage hackathons' },
  { tab: 'reports', route: 'reports', label: 'Reports', icon: 'flag', title: 'Review complaints' },
  { tab: 'activity', route: 'activity', label: 'Platform activity', icon: 'pulse', title: 'Platform activity' }
];


  const STATS = [
    { key: 'users', label: 'Total users', icon: 'users', route: 'users' },
    { key: 'active_users', label: 'Active users', icon: 'check', route: 'users', tone: 'ok' },
    { key: 'suspended_users', label: 'Suspended users', icon: 'alert', route: 'users', tone: 'bad' },
    { key: 'projects', label: 'Total projects', icon: 'folder', route: 'projects' },
    { key: 'open_projects', label: 'Open projects', icon: 'spark', route: 'projects', tone: 'teal' },
    { key: 'hackathons', label: 'Hackathons', icon: 'trophy', route: 'hackathons' },
    { key: 'open_reports', label: 'Open / pending reports', icon: 'flag', route: 'reports', tone: 'warn' },
    { key: 'campuses', label: 'Registered campuses', icon: 'pin', route: null, tone: 'teal' }
  ];

  
const ACTIONS = [
  { route: 'users', icon: 'users', label: 'Manage Users', hint: 'Suspend or reactivate accounts' },
  { route: 'reports', icon: 'flag', label: 'Review Complaints', hint: 'Resolve or dismiss reports' },
  { route: 'projects', icon: 'folder', label: 'Manage Projects', hint: 'Close, reopen or remove' },
  { route: 'hackathons', icon: 'trophy', label: 'Manage Hackathons', hint: 'Add, edit, feature or archive' },
  { route: 'activity', icon: 'pulse', label: 'View Platform Activity', hint: 'Latest signups and reports' }
];


  /* ---------- small renderers ---------- */
  const link = (route, inner, cls) => `<a class="${cls}" href="#${route}">${inner}</a>`;
  const sectionError = (what, key, err) => `<div class="adm-error" role="alert">${ic('alert')}<span>Couldn't load ${e(what)}. ${e(err?.message || 'Something went wrong.')}</span><button class="btn btn-ghost btn-sm" type="button" data-retry="${key}">${ic('refresh')}Try again</button></div>`;
  const miniEmpty = (text, icon = 'inbox') => `<div class="adm-empty">${ic(icon)}${e(text)}</div>`;
  const li = (lead, main, sub, side) => `<li>${lead || ''}<div class="adm-li-main"><b>${main}</b><span>${sub}</span></div><div class="adm-li-side">${side}</div></li>`;

  function statCard(s, stats) {
    const inner = `<div class="adm-stat-ico">${ic(s.icon)}</div><div><b>${e(num(stats[s.key]))}</b><span class="lbl">${e(s.label)}</span></div>`;
    const cls = `card adm-stat ${s.tone || ''}`;
    return s.route ? `<a class="${cls} hoverable" href="#${s.route}" aria-label="${e(s.label)}: ${e(num(stats[s.key]))}. Open ${e(s.route)}">${inner}</a>` : `<div class="${cls}">${inner}</div>`;
  }

  /* Alerts are derived from live counts only: nothing is shown unless the database says it applies. */
  function alertsHtml(stats, activity) {
    const out = [];
    const alert = (tone, route, icon, title, text) => out.push(`<a class="adm-alert ${tone}" href="#${route}">${ic(icon)}<div class="txt"><b>${e(title)}</b><span>${e(text)}</span></div><span class="go">Open ${ic('arrow')}</span></a>`);
    const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;
    if (stats.open_reports > 0) alert('warn', 'reports', 'flag', `${plural(stats.open_reports, 'complaint needs', 'complaints need')} attention`, 'Open or under review in Reports.');
    if (stats.stale_reports > 0) alert('bad', 'reports', 'clock', `${plural(stats.stale_reports, 'report has', 'reports have')} waited over 7 days`, 'Oldest complaints are still unresolved.');
    if (stats.pending_users > 0) alert('warn', 'users', 'user', `${plural(stats.pending_users, 'account is', 'accounts are')} pending`, 'Review them in Users.');
    if (stats.draft_hackathons > 0) alert('', 'hackathons', 'calendar', `${plural(stats.draft_hackathons, 'hackathon is a draft', 'hackathons are drafts')}`, 'Not visible to students until published.');
    if (stats.suspended_users > 0) alert('', 'users', 'alert', `${plural(stats.suspended_users, 'user is', 'users are')} suspended`, 'Review or reactivate in Users.');
    let html = out.length ? out.join('') : `<div class="adm-alert good">${ic('check')}<div class="txt"><b>All clear</b><span>No pending complaints or platform alerts.</span></div></div>`;
    const pend = (activity && activity.pending_reports) || [];
    if (pend.length) {
      html += `<div class="adm-pending-title">Pending complaints</div>` + pend.map((r) =>
        `<a class="adm-alert" href="#reports">${ic('flag')}<div class="txt"><b>${e(REASON[r.reason] || r.reason)} · ${e(r.target)}</b><span>${e(r.target_type)} reported by ${e(r.reporter)} · ${e(ago(r.created_at))}</span></div>${HM.status(r.status)}</a>`).join('');
    }
    return `<div class="adm-alerts">${html}</div>`;
  }

  function feedCard(icon, title, route, body, note) {
    return `<article class="card adm-feed"><div class="adm-feed-head">${ic(icon)}<h4>${e(title)}</h4>${route ? `<a href="#${route}">View all</a>` : ''}</div>${body}${note ? `<p class="adm-note">${e(note)}</p>` : ''}</article>`;
  }

  function feedsHtml(a) {
    const list = (items, empty, icon, row) => (items && items.length ? `<ul class="adm-list">${items.map(row).join('')}</ul>` : miniEmpty(empty, icon));
    return [
      feedCard('users', 'Recently registered users', 'users', list(a.users, 'No users have registered yet.', 'users', (u) =>
        li(HM.avatar(u, 'avatar-sm'), e(u.name), `${e(u.campus)} · ${e(u.role)}`, `${HM.status(u.status)}<span>${e(ago(u.created_at))}</span>`))),
      feedCard('folder', 'Recently created projects', 'projects', list(a.projects, 'No projects have been created yet.', 'folder', (p) =>
        li('', e(p.title), `by ${e(p.owner)} · ${e(p.campus)}`, `${HM.status(p.status)}<span>${e(ago(p.created_at))}</span>`))),
      feedCard('flag', 'Recent complaints', 'reports', list(a.reports, 'No complaints have been submitted.', 'flag', (r) =>
        li('', `${e(REASON[r.reason] || r.reason)} · ${e(r.target)}`, `${e(r.target_type)} reported by ${e(r.reporter)}`, `${HM.status(r.status)}<span>${e(ago(r.created_at))}</span>`))),
      feedCard('trophy', 'Recent hackathon additions', 'hackathons', list(a.hackathons, 'No hackathons have been added yet.', 'trophy', (h) =>
        li('', e(h.name), `${e(h.organizer)}${h.added_by ? ' · added by ' + e(h.added_by) : ''}`, `${HM.status(h.status)}<span>${e(ago(h.created_at))}</span>`))),
      feedCard('shield', 'Recent moderation actions', 'reports', list(a.moderation, 'No reports have been resolved or dismissed yet.', 'shield', (m) =>
        li('', `${e(m.admin)} ${m.status === 'resolved' ? 'resolved' : 'dismissed'} a report`, `Target: ${e(m.target)}`, `${HM.status(m.status)}<span>${e(ago(m.resolved_at))}</span>`)),
      'Covers report resolutions and dismissals only. Other admin actions (suspensions, project and hackathon changes) are not logged yet.')
    ].join('');
  }

  /* ---------- mount ---------- */
  function mount(box) {
    const st = { stats: null, activity: null };
    const skel = (n, h) => HM.skeletons(n, h);
    box.innerHTML = `<div class="adm-dash">
      <section class="adm-section" aria-labelledby="dsH"><div class="adm-sec-head"><h3 id="dsH">Platform overview</h3><span class="muted small" id="dStamp"></span></div><div class="adm-stats" id="dStats">${skel(8, 84)}</div></section>
      <div class="adm-cols">
        <section aria-labelledby="daH"><div class="adm-sec-head"><h3 id="daH">Notifications</h3></div><div id="dAlerts">${skel(1, 160)}</div></section>
        <section aria-labelledby="dqH"><div class="adm-sec-head"><h3 id="dqH">Quick actions</h3></div>
          <div class="adm-actions">${ACTIONS.map((a) => link(a.route, `${ic(a.icon)}${e(a.label)}<small>${e(a.hint)}</small>`, 'adm-action')).join('')}</div></section>
      </div>
      <section class="adm-section" id="activity" aria-labelledby="dfH" tabindex="-1"><div class="adm-sec-head"><h3 id="dfH">Recent platform activity</h3></div><div class="adm-feeds" id="dFeeds">${skel(5, 200)}</div></section></div>`;
    const root = box.firstElementChild; // listeners and lookups are scoped to THIS mount, so re-mounting never leaves stale handlers behind
    const $ = (id) => root.querySelector('#' + id);
    const live = (el) => el && el.isConnected; // the admin may have switched tab while a request was in flight

    function render(which) {
      if (which !== 'activity') {
        const el = $('dStats'); if (!live(el)) return;
        if (st.statsErr) el.innerHTML = sectionError('platform statistics', 'stats', st.statsErr);
        else if (st.stats) { el.innerHTML = STATS.map((s) => statCard(s, st.stats)).join(''); $('dStamp').textContent = 'Live from the database · updated just now'; }
      }
      const alertsEl = $('dAlerts');
      if (live(alertsEl)) {
        if (st.statsErr) alertsEl.innerHTML = sectionError('notifications', 'stats', st.statsErr);
        else if (st.stats) alertsEl.innerHTML = alertsHtml(st.stats, st.activity);
      }
      if (which !== 'stats') {
        const el = $('dFeeds'); if (!live(el)) return;
        if (st.actErr) el.innerHTML = sectionError('recent activity', 'activity', st.actErr);
        else if (st.activity) el.innerHTML = feedsHtml(st.activity);
      }
    }
    async function loadStats() {
      st.statsErr = null; st.stats = null;
      if (live($('dStats'))) { $('dStats').innerHTML = skel(8, 84); $('dAlerts').innerHTML = skel(1, 160); }
      try { st.stats = await HM.api.getAdminOverview(); syncBadge(st.stats); } catch (err) { st.statsErr = err; }
      render('stats');
    }
    async function loadActivity() {
      st.actErr = null; st.activity = null;
      if (live($('dFeeds'))) $('dFeeds').innerHTML = skel(5, 200);
      try { st.activity = await HM.api.getAdminActivity(); } catch (err) { st.actErr = err; }
      render('activity');
      if (st.stats) render('stats'); // alerts list pending complaints, which arrive with the activity feed
    }
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-retry]'); if (!b) return;
      b.dataset.retry === 'stats' ? loadStats() : loadActivity();
    });
    loadStats(); loadActivity();
  }

  /* Red count on the sidebar's Reports link: only ever set from the live open_reports figure. */
  function syncBadge(stats) {
    const b = HM.$('#navReportsBadge'); if (!b) return;
    b.textContent = num(stats.open_reports); b.hidden = !(stats.open_reports > 0);
  }

  HM.adminDashboard = { mount, SECTIONS, icon: ic };
})(window.HM);
