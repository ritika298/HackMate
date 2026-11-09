/* HackMate — dashboard.js. Data: HM.api.getDashboard() → see docs/HANDOFF_ACCOUNT_1.md */
(function (HM) {
  'use strict';
  HM.initPage('dashboard');
  const e = HM.esc; const main = HM.$('#dash');

  const stat = (icon, n, label, href) => `<a class="card stat-card hoverable" href="${HM.pageUrl(href)}" style="color:inherit;text-decoration:none"><span class="icon-bubble">${HM.icon(icon)}</span><b>${e(n)}</b><span class="muted small">${label}</span></a>`;

  async function load() {
    main.innerHTML = `<div class="grid-cards">${HM.skeletons(3, 140)}</div>`;
    try {
      const d = await HM.api.getDashboard(); const first = (d.user.name || '').split(' ')[0];
      main.innerHTML = `
        <div class="welcome"><div><h1 style="font-size:clamp(1.7rem,3.5vw,2.4rem);margin-bottom:4px">Welcome back, ${e(first)}</h1><p class="muted" style="margin:0">Here is what is happening with your teams and requests.</p></div>
          <a class="btn btn-primary" href="${HM.pageUrl('projects.html')}">${HM.icon('plus')}Post a project</a></div>
        <div class="stat-grid">
          <div class="card stat-card"><span class="icon-bubble">${HM.icon('user')}</span><b>${e(d.profile_completion)}%</b><span class="muted small">Profile completion</span><div class="progress"><i style="width:${Number(d.profile_completion) || 0}%"></i></div></div>
          ${stat('inbox', d.pending_requests, 'Pending requests', 'requests.html')}
          ${stat('folder', d.projects_count, 'My projects', 'projects.html?mine=1')}
          ${stat('bookmark', d.saved_hackathons_count, 'Saved hackathons', 'hackathons.html?saved=1')}
          ${stat('users', d.team_members_count, 'Team members', 'team.html')}
        </div>
        <div class="dash-cols"><div class="stack">
          <section class="card"><div class="section-head"><h3>Recommended teammates</h3><a href="${HM.pageUrl('discover.html')}" class="small">See all</a></div>
            <div class="mini-list">${(d.recommended_users || []).map((u) => `<div class="mini-item">${HM.avatar(u)}<div class="grow"><b>${e(u.name)}</b><div class="small muted">${e(u.campus)} · ${e((u.skills || []).slice(0, 3).join(', '))}</div></div>
              <button class="btn btn-ghost btn-sm" data-action="request-user" data-id="${e(u.id)}" data-name="${e(u.name)}">Connect</button></div>`).join('') || HM.empty({ title: 'No recommendations yet', text: 'Add skills to your profile to get matches.' })}</div></section>
          <section class="card"><div class="section-head"><h3>My projects</h3><a href="${HM.pageUrl('projects.html')}" class="small">All projects</a></div>
            <div class="mini-list">${(d.my_projects || []).map((p) => `<div class="mini-item"><span class="icon-bubble" style="width:40px;height:40px;border-radius:12px;background:var(--brand-soft);display:grid;place-items:center;color:var(--brand-ink)">${HM.icon('folder')}</span>
              <div class="grow"><b>${e(p.title)}</b><div class="small muted">${e(p.member_count)} / ${e(p.team_size)} members</div></div>${HM.status(p.status)}</div>`).join('') || HM.empty({ icon: 'folder', title: 'No projects yet', text: 'Post one and start building your team.' })}</div></section>
        </div><div class="stack">
          <section class="card"><div class="section-head"><h3>Upcoming hackathons</h3></div>
            <div class="mini-list">${(d.upcoming_hackathons || []).map((h) => `<div class="mini-item"><div class="grow"><b>${e(h.name)}</b><div class="small muted">Register by ${e(HM.fmtDate(h.registration_deadline))}</div></div><span class="chip ${h.mode === 'online' ? 'teal' : ''}">${e(h.mode)}</span></div>`).join('')}</div></section>
          <section class="card"><div class="section-head"><h3>Recent notifications</h3><button class="btn btn-ghost btn-sm" data-notif="all">Mark all as read</button></div>
            <div class="mini-list">${(d.notifications || []).map((n) => `<div class="mini-item" data-notif="${e(n.id)}" style="cursor:pointer" title="${n.is_read ? '' : 'Click to mark as read'}"><span class="notif-dot ${n.is_read ? 'read' : ''}"></span><div class="grow"><b>${e(n.title)}</b><div class="small muted">${e(n.body)}</div></div><span class="small muted">${e(HM.timeAgo(n.created_at))}</span></div>`).join('') || '<p class="muted">You are all caught up.</p>'}</div></section>
        </div></div>`;
    } catch (err) { main.innerHTML = HM.errorState(err); }
  }
  let openRequest;
  document.addEventListener('click', (ev) => {
    if (ev.target.id === 'retryBtn') load();
    const b = ev.target.closest('[data-action="request-user"]');
    if (b) { openRequest = openRequest || HM.initRequestModal(); openRequest(`To ${b.dataset.name}`, { receiver_id: Number(b.dataset.id), type: 'team_up' }); }
  });
  load();
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-notif]'); if (!b) return;
    const all = b.dataset.notif === 'all';
    try {
      await HM.api.markNotificationsRead(all ? null : Number(b.dataset.notif));
      (all ? HM.$$('.notif-dot') : [HM.$('.notif-dot', b)]).forEach((d) => d && d.classList.add('read'));
      if (all) HM.toast('All notifications marked as read', 'success');
    } catch (err) { HM.toastError(err); }
  });
})(window.HM);
