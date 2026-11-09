/* HackMate — admin.js. UI ONLY. Hiding this page in the frontend is NOT security:
 * every /admin/* endpoint must verify role = 'admin' server-side (see handoff doc). */
(function (HM) {
  'use strict';
  HM.initPage('admin');
  const e = HM.esc; const box = HM.$('#panel'); let tab = 'overview';

  const table = (cols, rows, rowFn) => rows.length ? `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(rowFn).join('')}</tbody></table></div>` : HM.empty({ title: 'Nothing here yet' });
  const act = (entity, id, action, label, cls = 'btn-ghost') => `<button class="btn ${cls} btn-sm" data-entity="${entity}" data-id="${e(id)}" data-action="${action}">${label}</button>`;

  const views = {
    async overview() {
      const o = await HM.api.getAdminOverview();
      return `<div class="admin-stats">${[['users', 'Users'], ['projects', 'Projects'], ['hackathons', 'Hackathons'], ['open_reports', 'Open reports'], ['skills', 'Skills']].map(([k, l]) => `<div class="card"><b>${e(o[k])}</b><span class="muted small">${l}</span></div>`).join('')}</div>
        <p class="muted">Use the tabs above to review users, projects, hackathons, reports and the skills list.</p>`;
    },
    async users() { return table(['Name', 'Email', 'Campus', 'Role', 'Status', ''], await HM.api.getAdminUsers(), (u) => `<tr><td>${e(u.name)}</td><td>${e(u.email)}</td><td>${e(u.campus)}</td><td>${e(u.role)}</td><td>${HM.status(u.status)}</td><td>${act('user', u.id, 'suspend', 'Suspend', 'btn-danger')}</td></tr>`); },
    async projects() { return table(['Title', 'Owner', 'Campus', 'Members', 'Status', ''], await HM.api.getAdminProjects(), (p) => `<tr><td>${e(p.title)}</td><td>${e(p.owner)}</td><td>${e(p.campus)}</td><td>${e(p.members)}</td><td>${HM.status(p.status)}</td><td>${act('project', p.id, 'close', 'Close', 'btn-danger')}</td></tr>`); },
    async hackathons() { return `<div class="row-between" style="margin-bottom:14px"><span></span><button class="btn btn-primary btn-sm" data-entity="hackathon" data-action="create">${HM.icon('plus')}Add hackathon</button></div>` + table(['Name', 'Organizer', 'Mode', 'Deadline', 'Featured', ''], await HM.api.getAdminHackathons(), (h) => `<tr><td>${e(h.name)}</td><td>${e(h.organizer)}</td><td>${e(h.mode)}</td><td>${e(HM.fmtDate(h.registration_deadline))}</td><td>${h.is_featured ? 'Yes' : 'No'}</td><td>${act('hackathon', h.id, 'feature', 'Toggle featured')} ${act('hackathon', h.id, 'archive', 'Archive', 'btn-danger')}</td></tr>`); },
    async reports() { return table(['Target', 'Type', 'Reason', 'Reported by', 'Status', ''], await HM.api.getAdminReports(), (r) => `<tr><td>${e(r.target)}</td><td>${e(r.target_type)}</td><td>${e(r.reason)}</td><td>${e(r.reporter)}</td><td>${HM.status(r.status)}</td><td>${act('report', r.id, 'resolve', 'Resolve', 'btn-success')} ${act('report', r.id, 'dismiss', 'Dismiss')}</td></tr>`); },
    async skills() {
      const s = await HM.api.getAdminSkills();
      return `<form class="row" id="skillForm" style="margin-bottom:16px" novalidate><input class="input" name="name" placeholder="New skill name" style="max-width:280px" maxlength="60" aria-label="New skill name"><button class="btn btn-primary" type="submit">Add skill</button></form>${HM.chips(s.map((x) => x.name))}`;
    }
  };
  async function show() {
    HM.$$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    box.innerHTML = HM.skeletons(1, 200);
    try { box.innerHTML = await views[tab](); } catch (err) { box.innerHTML = HM.errorState(err); }
  }

  /* "Add hackathon" modal. Posts to hackathons/create.php (admin only; the backend re-validates dates and skill names). */
  function openHackathonForm() {
    if (!HM.$('#hackModal')) {
      document.body.insertAdjacentHTML('beforeend', HM.modalShell('hackModal', 'Add hackathon', `<form id="hackForm" novalidate>
        <div class="form-grid"><div class="field"><label for="hName">Name</label><input class="input" id="hName" name="name" maxlength="150"><div class="field-error"></div></div>
        <div class="field"><label for="hOrg">Organizer</label><input class="input" id="hOrg" name="organizer" maxlength="150"><div class="field-error"></div></div></div>
        <div class="field"><label for="hDesc">Description</label><textarea class="textarea" id="hDesc" name="description" maxlength="2000"></textarea><div class="field-error"></div></div>
        <div class="form-grid"><div class="field"><label for="hStart">Event start</label><input class="input" id="hStart" name="start_date" type="date"><div class="field-error"></div></div>
        <div class="field"><label for="hEnd">Event end</label><input class="input" id="hEnd" name="end_date" type="date"><div class="field-error"></div></div></div>
        <div class="form-grid"><div class="field"><label for="hDead">Registration deadline</label><input class="input" id="hDead" name="registration_deadline" type="date"><div class="field-error"></div></div>
        <div class="field"><label for="hMode">Mode</label><select class="select" id="hMode" name="mode"><option value="online">Online</option><option value="offline">Offline</option><option value="hybrid">Hybrid</option></select></div></div>
        <div class="form-grid"><div class="field"><label for="hLoc">Location</label><input class="input" id="hLoc" name="location" maxlength="150" placeholder="City / venue (blank if online)"></div>
        <div class="field"><label for="hUrl">Website / registration link</label><input class="input" id="hUrl" name="registration_url" placeholder="https://"><div class="field-error"></div></div></div>
        <div class="field"><label for="hSkills">Skills (comma separated, must exist in Skills)</label><input class="input" id="hSkills" name="skills" placeholder="Python, React"><div class="field-error"></div></div>
        <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" type="submit">Add hackathon</button></div></form>`, true));
      HM.$('#hackForm').addEventListener('submit', async (ev) => {
        ev.preventDefault(); const f = ev.target;
        const v = HM.validate(f, { name: [HM.rules.required('Enter a name.'), HM.rules.minLen(3), HM.rules.maxLen(150)], organizer: [HM.rules.required('Enter the organizer.')],
          start_date: [HM.rules.required('Pick a start date.')], end_date: [HM.rules.required('Pick an end date.'), (x) => (!f.start_date.value || x >= f.start_date.value ? '' : 'End date must be on or after the start.')],
          registration_deadline: [HM.rules.required('Pick a deadline.'), (x) => (!f.end_date.value || x <= f.end_date.value ? '' : 'Deadline must be on or before the event end.')],
          registration_url: [HM.rules.url()] });
        if (!v) return;
        const payload = { name: v.name, organizer: v.organizer, description: v.description, mode: v.mode, location: v.location, start_date: v.start_date, end_date: v.end_date,
          registration_deadline: v.registration_deadline, registration_url: v.registration_url, skills: HM.csv(v.skills), status: 'published' };
        const btn = HM.$('button[type=submit]', f); HM.setLoading(btn, true);
        try { await HM.api.createHackathon(payload); HM.closeModal('hackModal'); f.reset(); HM.toast('Hackathon added', 'success'); show(); }
        catch (err) { HM.toastError(err); } finally { HM.setLoading(btn, false); }
      });
    }
    HM.openModal('hackModal');
  }
  document.addEventListener('click', async (ev) => {
    if (ev.target.id === 'retryBtn') return show();
    const t = ev.target.closest('.tabs button'); if (t) { tab = t.dataset.tab; return show(); }
    const b = ev.target.closest('[data-entity]'); if (!b) return;
    if (b.dataset.action === 'create') return openHackathonForm();
    HM.setLoading(b, true);
    try {
      const res = await HM.api.adminAction({ entity: b.dataset.entity, id: Number(b.dataset.id), action: b.dataset.action }); HM.toastResult(res, 'Action completed'); show();
    } catch (err) { HM.toastError(err); } finally { HM.setLoading(b, false); }
  });
  document.addEventListener('submit', async (ev) => {
    if (ev.target.id !== 'skillForm') return; ev.preventDefault();
    const v = HM.validate(ev.target, { name: [HM.rules.required('Enter a skill name.'), HM.rules.maxLen(60)] }); if (!v) return;
    try { const res = await HM.api.adminAction({ entity: 'skill', action: 'create', name: v.name }); HM.toastResult(res, 'Skill added'); ev.target.reset(); show(); } catch (err) { HM.toastError(err); }
  });
  show();
})(window.HM);
