/* HackMate — components.js : card renderers shared by several pages. Pure functions: data in, HTML out.
 * Everything dynamic is escaped with HM.esc / HM.chips. Buttons carry data-* attributes; pages attach listeners. */
(function (HM) {
  'use strict';
  const e = HM.esc;
  const LEVEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  const CATEGORY = { hackathon: 'Hackathon', college_project: 'College project', competition: 'Competition', open_source: 'Open source', research: 'Research' };
  HM.labels = { LEVEL, CATEGORY };

  HM.cards = {
    user(u) {
      return `<article class="card hoverable card-col person" data-id="${e(u.id)}">
        <div class="person-top">${HM.avatar(u)}<div><h3>${e(u.name)}</h3><div class="small muted">${e(u.campus)} · ${e(u.branch)}, Year ${e(u.year)}</div></div></div>
        <p class="bio">${e(u.bio)}</p>
        ${HM.chips(u.skills, '', 5)}
        <div class="looking">${HM.icon('search')}<span>Looking for: <b>${e((u.preferred_roles || []).join(', ') || 'Any role')}</b></span></div>
        <div class="looking">${HM.icon('trophy')}<span>${e(LEVEL[u.experience_level] || '')}${u.experience_text ? ' · ' + e(u.experience_text) : ''}</span></div>
        <div class="card-actions"><a class="btn btn-ghost btn-sm" href="${HM.pageUrl('profile.html')}?id=${encodeURIComponent(u.id)}">View profile</a>
          <button class="btn btn-primary btn-sm" data-action="request-user" data-id="${e(u.id)}">${HM.icon('send')}Send team request</button></div></article>`;
    },
    project(p) {
      const pct = Math.min(100, Math.round((p.member_count / p.team_size) * 100));
      return `<article class="card hoverable card-col project" data-id="${e(p.id)}">
        <div class="row-between"><span class="cat-tag">${e(CATEGORY[p.category] || p.category)} · ${e(p.campus)}</span>${HM.status(p.status)}</div>
        <h3>${e(p.title)}</h3><p class="desc">${e(p.description)}</p>
        <div class="label-sm">Looking for</div>${HM.chips(p.looking_for, 'sun')}
        <div class="label-sm" style="margin-top:12px">Tech</div>${HM.chips(p.tech, 'teal')}
        <div class="team-meter" style="margin-top:14px" title="Current team"><span>${e(p.member_count)} / ${e(p.team_size)}</span><div class="progress"><i style="width:${pct}%"></i></div></div>
        <div class="card-actions"><button class="btn btn-ghost btn-sm" data-action="view-project" data-id="${e(p.id)}">View project</button>
          <button class="btn btn-primary btn-sm" data-action="join-project" data-id="${e(p.id)}" ${p.status !== 'open' || p.member_count >= p.team_size ? 'disabled' : ''}>Request to join</button></div></article>`;
    },
    hackathon(h) {
      const d = HM.daysUntil(h.registration_deadline);
      const dl = d < 0 ? `<span class="deadline closed">Registration closed</span>` : `<span class="deadline ${d <= 7 ? 'soon' : ''}">Register by ${e(HM.fmtDate(h.registration_deadline))} (${d === 0 ? 'today' : d + 'd left'})</span>`;
      const url = HM.safeUrl(h.registration_url);
      return `<article class="card hoverable card-col hack ${e(h.mode)}" data-id="${e(h.id)}">
        <div class="row-between"><span class="chip ${h.mode === 'online' ? 'teal' : h.mode === 'offline' ? 'sun' : ''}">${e(h.mode)}</span>${h.is_featured ? `<span class="chip plain">Featured</span>` : ''}</div>
        <h3>${e(h.name)}</h3><div class="small muted">by ${e(h.organizer)}</div>
        <div class="meta" style="margin:12px 0"><span>${HM.icon('calendar')}${e(HM.fmtDate(h.start_date))}${h.end_date !== h.start_date ? ' – ' + e(HM.fmtDate(h.end_date)) : ''}</span>
          <span>${HM.icon(h.mode === 'online' ? 'globe' : 'pin')}${e(h.location || 'Online')}</span></div>
        <p class="muted small" style="margin-bottom:10px">${e(h.description)}</p>${HM.chips(h.skills, '', 4)}
        <div style="margin-top:12px">${dl}</div>
        <div class="card-actions"><button class="btn btn-ghost btn-sm" data-action="details" data-id="${e(h.id)}">View details</button>
          ${url && d >= 0 ? `<a class="btn btn-primary btn-sm" href="${e(url)}" target="_blank" rel="noopener noreferrer">Register</a>` : `<button class="btn btn-primary btn-sm" disabled>Register</button>`}
          <button class="btn btn-ghost btn-sm save-btn" data-action="save" data-id="${e(h.id)}" aria-pressed="${h.is_saved ? 'true' : 'false'}">${HM.icon('bookmark')}<span>${h.is_saved ? 'Saved' : 'Save'}</span></button></div></article>`;
    },
    /* Reusable "send a request" modal. Pass onSubmit(message) → Promise. */
    requestModal() {
      return HM.modalShell('requestModal', 'Send a request', `<form id="requestForm" novalidate><p class="muted small" id="requestTo"></p>
        <div class="field"><label for="reqMsg">Message</label><textarea class="textarea" id="reqMsg" name="message" maxlength="500" placeholder="Say hi, mention what you can build and what you are working on."></textarea><div class="field-error"></div><div class="field-hint">Up to 500 characters.</div></div>
        <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" type="submit">Send request</button></div></form>`);
    }
  };

  /* Shared "Report" modal for a user or a project. open(label, {target_type, target_id}). The backend also blocks self-reports. */
  const REASONS = { spam: 'Spam', harassment: 'Harassment', fake_profile: 'Fake profile', inappropriate: 'Inappropriate content', other: 'Something else' };
  HM.initReportModal = () => {
    document.body.insertAdjacentHTML('beforeend', HM.modalShell('reportModal', 'Report', `<form id="reportForm" novalidate><p class="muted small" id="reportTo"></p>
      <div class="field"><label for="repReason">Reason</label><select class="select" id="repReason" name="reason">${Object.entries(REASONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><div class="field-error"></div></div>
      <div class="field"><label for="repDetails">Details</label><textarea class="textarea" id="repDetails" name="details" maxlength="500" placeholder="What happened? (optional)"></textarea><div class="field-error"></div><div class="field-hint">Up to 500 characters. Reports are reviewed by the HackMate team.</div></div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" type="submit">Submit report</button></div></form>`));
    const form = HM.$('#reportForm'); let base = null;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = HM.validate(form, { reason: [HM.rules.required()], details: [HM.rules.maxLen(500)] }); if (!v) return;
      const btn = HM.$('button[type=submit]', form); HM.setLoading(btn, true);
      try { await HM.api.reportContent({ ...base, reason: v.reason, details: v.details }); HM.closeModal('reportModal'); form.reset(); HM.toast('Report submitted. Thank you.', 'success'); }
      catch (err) { HM.toastError(err); } finally { HM.setLoading(btn, false); }
    });
    return (label, payloadBase) => { base = payloadBase; HM.$('#reportTo').textContent = label; HM.openModal('reportModal'); };
  };

  /* Wires the shared request modal. open(label, payloadBase) later shows it. */
  HM.initRequestModal = () => {
    document.body.insertAdjacentHTML('beforeend', HM.cards.requestModal());
    const form = HM.$('#requestForm'); let base = null;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = HM.validate(form, { message: [HM.rules.required('Add a short message.'), HM.rules.maxLen(500)] }); if (!v) return;
      const btn = HM.$('button[type=submit]', form); HM.setLoading(btn, true);
      try { const res = await HM.api.sendRequest({ ...base, message: v.message }); HM.closeModal('requestModal'); form.reset(); HM.toastResult(res, 'Request sent'); }
      catch (err) { HM.toastError(err); } finally { HM.setLoading(btn, false); }
    });
    return (label, payloadBase) => { base = payloadBase; HM.$('#requestTo').textContent = label; HM.openModal('requestModal'); };
  };
})(window.HM);
