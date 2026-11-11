/* HackMate — hackathons.js. "Register" opens the organizer's own registration URL (new tab, noopener). */
(function (HM) {
  'use strict';
  HM.initPage('hackathons');
  const e = HM.esc; const grid = HM.$('#results'), form = HM.$('#filters'); let list = [];

  const filters = () => { const f = Object.fromEntries(new FormData(form).entries()); if (!HM.$('#savedOnly').checked) delete f.saved; return f; };
  async function load() {
    grid.innerHTML = HM.skeletons(4, 320);
    try {
      list = await HM.api.getHackathons(filters());
      grid.innerHTML = list.map(HM.cards.hackathon).join('') || HM.empty({ icon: 'calendar', title: 'No hackathons found', text: 'Try a different filter, or check back soon.' });
    } catch (err) { grid.innerHTML = HM.errorState(err); }
  }
  async function init() {
    HM.fillSelect(form.mode, [{ id: 'online', name: 'Online' }, { id: 'offline', name: 'Offline' }, { id: 'hybrid', name: 'Hybrid' }], { placeholder: 'Any mode' });
    try { HM.fillSelect(form.skill, await HM.api.getSkills(), { placeholder: 'Any skill', valueKey: 'name' }); } catch (err) { /* optional */ }
    load();
  }
  function showDetails(h) {
    const url = HM.safeUrl(h.registration_url);
    HM.$('#detailTitle').textContent = h.name;
    HM.$('#detailBody').innerHTML = `<div class="small muted" style="margin-bottom:10px">Organised by ${e(h.organizer)}</div><p>${e(h.description)}</p>
      <dl class="kv" style="margin-bottom:16px"><dt>Dates</dt><dd>${e(HM.fmtDate(h.start_date))} – ${e(HM.fmtDate(h.end_date))}</dd><dt>Register by</dt><dd>${e(HM.fmtDate(h.registration_deadline))}</dd>
        <dt>Mode</dt><dd>${e(h.mode)}${h.location ? ' · ' + e(h.location) : ''}</dd><dt>Prizes</dt><dd>${e(h.prize_info || 'TBA')}</dd></dl>
      <div class="label-sm">Skills</div>${HM.chips(h.skills)}
      <div class="modal-foot" style="margin-top:18px"><button class="btn btn-ghost" data-close>Close</button>${url ? `<a class="btn btn-primary" href="${e(url)}" target="_blank" rel="noopener noreferrer">Register on organizer site</a>` : ''}</div>`;
    HM.openModal('detailModal');
  }
  form.addEventListener('input', HM.debounce(load, 300)); form.addEventListener('submit', (x) => x.preventDefault());
  document.addEventListener('click', async (ev) => {
    if (ev.target.id === 'retryBtn') return load();
    const b = ev.target.closest('[data-action]'); if (!b) return; const h = list.find((x) => String(x.id) === b.dataset.id); if (!h) return;
    if (b.dataset.action === 'details') showDetails(h);
    if (b.dataset.action === 'save') {
      const was = b.getAttribute('aria-pressed') === 'true'; b.disabled = true;
      try {

        const res = was ? await HM.api.unsaveHackathon(h.id) : await HM.api.saveHackathon(h.id);
        b.setAttribute('aria-pressed', String(!was)); HM.$('span', b).textContent = was ? 'Save' : 'Saved'; h.is_saved = !was; HM.toastResult(res, was ? 'Removed from saved' : 'Saved');
      } catch (err) { HM.toastError(err); } finally { b.disabled = false; }
    }
  });
  init();
})(window.HM);
