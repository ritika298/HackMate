/* HackMate — projects.js */
(function (HM) {
  'use strict';
  HM.initPage('projects');
  const e = HM.esc;
  const grid = HM.$('#results');
  const form = HM.$('#filters');
  let list = [], openRequest;

  const pageParams = new URLSearchParams(window.location.search);
  const myProjectsOnly = pageParams.get('mine') === '1';

  const filters = () => {
  const f = Object.fromEntries(new FormData(form).entries());

  // Show only projects created or joined by the logged-in user.
  if (myProjectsOnly) {
    f.mine = '1';
  }

  return f;
};
  async function load() {
    grid.innerHTML = HM.skeletons(4, 300);
    try {
      list = await HM.api.getProjects(filters());
      grid.innerHTML = list.map(HM.cards.project).join('') || HM.empty({ icon: 'folder', title: 'No projects found', text: 'Change your filters, or post your own idea.', actionHtml: '<button class="btn btn-primary" id="emptyCreate">Create project</button>' });
    } catch (err) { grid.innerHTML = HM.errorState(err); }
  }
  async function init() {
    HM.fillSelect(form.category, Object.entries(HM.labels.CATEGORY).map(([id, name]) => ({ id, name })), { placeholder: 'Any type' });
    try {
      const [c, s] = await Promise.all([HM.api.getCampuses(), HM.api.getSkills()]);
      HM.fillSelect(form.campus, c, { placeholder: 'Any campus', valueKey: 'short_name', labelKey: 'short_name' });
      HM.fillSelect(form.skill, s, { placeholder: 'Any tech', valueKey: 'name' });
      HM.fillSelect(HM.$('#createForm').campus_id, c, { labelKey: 'short_name' });
    } catch (err) { /* optional */ }
    HM.fillSelect(HM.$('#createForm').category, Object.entries(HM.labels.CATEGORY).map(([id, name]) => ({ id, name })));
    load();
  }

  let detail = null, openReport;
  async function showDetail(p) {
    HM.$('#detailTitle').textContent = p.title; HM.$('#detailBody').innerHTML = HM.skeletons(1, 180); HM.openModal('detailModal');
    let d = p;
    try { d = await HM.api.getProject(p.id); } catch (err) { HM.toastError(err); }
    detail = d;
    const members = (d.members || []).map((m) => `<div class="row" style="margin:8px 0">${HM.avatar(m, 'avatar-sm')}<a href="${HM.pageUrl('profile.html')}?id=${encodeURIComponent(m.id)}"><b>${e(m.name)}</b></a><span class="small muted">${e(m.member_role)}${m.is_owner ? ' · Owner' : ''}</span></div>`).join('');
    const full = d.member_count >= d.team_size, pending = d.my_request_status === 'pending';
    const actions = d.is_owner
      ? `<button class="btn btn-ghost btn-sm" data-action="edit-project" data-id="${e(d.id)}">${HM.icon('edit')}Edit</button><button class="btn btn-danger btn-sm" data-action="delete-project" data-id="${e(d.id)}">Delete project</button>`
      : (d.is_member ? `<button class="btn btn-ghost btn-sm" data-action="leave-project" data-id="${e(d.id)}">Leave team</button>`
        : `<button class="btn btn-primary btn-sm" data-action="join-project" data-id="${e(d.id)}" ${d.status !== 'open' || full || pending ? 'disabled' : ''}>${pending ? 'Request pending' : 'Request to join'}</button>`)
        + (d.is_owner ? '' : `<button class="btn btn-ghost btn-sm" data-action="report-project" data-id="${e(d.id)}">Report</button>`);
    HM.$('#detailBody').innerHTML = `<div class="row" style="margin-bottom:12px">${HM.status(d.status)}<span class="cat-tag">${e(HM.labels.CATEGORY[d.category] || d.category)} · ${e(d.campus)}</span></div>
      <p>${e(d.description)}</p>
      <div class="detail-block"><div class="label-sm">Looking for</div>${HM.chips(d.looking_for, 'sun')}</div><div class="detail-block"><div class="label-sm">Tech</div>${HM.chips(d.tech, 'teal')}</div>
      <div class="detail-block"><div class="label-sm">Team (${e(d.member_count)} / ${e(d.team_size)})</div>${members || '<span class="muted">No members yet.</span>'}</div>
      <div class="card-actions" style="margin-top:16px">${actions}</div>`;
  }

  /* Edit modal (owner only; the backend re-checks ownership). Built on first use. */
  function openEdit(d) {
    if (!HM.$('#editProjectModal')) {
      document.body.insertAdjacentHTML('beforeend', HM.modalShell('editProjectModal', 'Edit project', `<form id="editProjectForm" novalidate>
        <div class="field"><label for="epTitle">Title</label><input class="input" id="epTitle" name="title" maxlength="150"><div class="field-error"></div></div>
        <div class="field"><label for="epDesc">Description</label><textarea class="textarea" id="epDesc" name="description" maxlength="2000"></textarea><div class="field-error"></div></div>
        <div class="form-grid"><div class="field"><label for="epStatus">Status</label><select class="select" id="epStatus" name="status"><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="closed">Closed</option></select></div>
        <div class="field"><label for="epSize">Team size</label><input class="input" id="epSize" name="team_size" type="number" min="2" max="12"><div class="field-error"></div></div></div>
        <div class="field"><label for="epLook">Looking for (comma separated)</label><input class="input" id="epLook" name="looking_for"><div class="field-error"></div></div>
        <div class="field"><label for="epTech">Tech (comma separated)</label><input class="input" id="epTech" name="tech"><div class="field-error"></div></div>
        <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save changes</button></div></form>`, true));
      HM.$('#editProjectForm').addEventListener('submit', async (ev) => {
        ev.preventDefault(); const f = ev.target;
        const v = HM.validate(f, { title: [HM.rules.required('Give your project a title.'), HM.rules.minLen(3), HM.rules.maxLen(150)], description: [HM.rules.required(), HM.rules.minLen(10), HM.rules.maxLen(2000)], team_size: [HM.rules.required()] });
        if (!v) return;
        const btn = HM.$('button[type=submit]', f); HM.setLoading(btn, true);
        try {
          await HM.api.updateProject({ id: detail.id, title: v.title, description: v.description, status: v.status, team_size: Number(v.team_size), looking_for: HM.csv(v.looking_for), tech: HM.csv(v.tech) });
          HM.closeModal('editProjectModal'); HM.closeModal('detailModal'); HM.toast('Project updated', 'success'); load();
        } catch (err) { HM.toastError(err); } finally { HM.setLoading(btn, false); }
      });
    }
    const f = HM.$('#editProjectForm');
    f.title.value = d.title; f.description.value = d.description; f.status.value = d.status; f.team_size.value = d.team_size;
    f.looking_for.value = (d.looking_for || []).join(', '); f.tech.value = (d.tech || []).join(', ');
    HM.openModal('editProjectModal');
  }

  HM.$('#createForm').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const f = ev.target;
    const v = HM.validate(f, { title: [HM.rules.required('Give your project a title.'), HM.rules.minLen(4), HM.rules.maxLen(150)], description: [HM.rules.required('Describe what you are building.'), HM.rules.minLen(20, 'Add a few more details (20+ characters).'), HM.rules.maxLen(2000)],
      team_size: [HM.rules.required()], looking_for: [HM.rules.required('List at least one role you need.')] });
    if (!v) return;
    const payload = { title: v.title, description: v.description, category: v.category, campus_id: Number(v.campus_id), team_size: Number(v.team_size), looking_for: HM.csv(v.looking_for), tech: HM.csv(v.tech) };
    const btn = HM.$('button[type=submit]', f); HM.setLoading(btn, true);
    try {

      const res = await HM.api.createProject(payload); HM.closeModal('createModal'); f.reset(); HM.toastResult(res, 'Project created'); load();
    } catch (err) { HM.toastError(err); } finally { HM.setLoading(btn, false); }
  });

  form.addEventListener('input', HM.debounce(load, 300)); form.addEventListener('submit', (x) => { x.preventDefault(); load(); });
  HM.$('#createBtn').addEventListener('click', () => HM.openModal('createModal'));
  document.addEventListener('click', (ev) => {
    if (ev.target.id === 'retryBtn') load(); if (ev.target.id === 'emptyCreate') HM.openModal('createModal');
    const b = ev.target.closest('[data-action]'); if (!b) return; const p = list.find((x) => String(x.id) === b.dataset.id); if (!p) return;
    if (b.dataset.action === 'view-project') showDetail(p);
    if (b.dataset.action === 'edit-project' && detail) openEdit(detail);
    if (b.dataset.action === 'report-project') { openReport = openReport || HM.initReportModal(); openReport(`Report project: ${p.title}`, { target_type: 'project', target_id: p.id }); }
    if (b.dataset.action === 'delete-project' && confirm(`Delete "${p.title}"? This removes the project and its team. It cannot be undone.`)) {
      HM.setLoading(b, true);
      HM.api.deleteProject(p.id).then(() => { HM.closeModal('detailModal'); HM.toast('Project deleted', 'success'); load(); }).catch((err) => { HM.toastError(err); HM.setLoading(b, false); });
    }
    if (b.dataset.action === 'leave-project' && confirm(`Leave "${p.title}"?`)) {
      HM.setLoading(b, true);
      HM.api.leaveProject(p.id).then(() => { HM.closeModal('detailModal'); HM.toast('You left the team', 'success'); load(); }).catch((err) => { HM.toastError(err); HM.setLoading(b, false); });
    }
    if (b.dataset.action === 'join-project') { HM.closeModal('detailModal'); openRequest = openRequest || HM.initRequestModal(); openRequest(`To join ${p.title} (owner: ${p.owner.name})`, { project_id: p.id, type: 'join_request' }); }
  });
  init();
})(window.HM);
