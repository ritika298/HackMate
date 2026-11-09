/* HackMate — landing.js (index.html). Data via HM.api only. */
(function (HM) {
  'use strict';
  HM.initPage('home', { landing: true });
  const R = HM.root();

  async function load() {
    const sel = HM.$('#campusSelect');
    HM.api.getCampuses().then((c) => { sel.innerHTML = '<option value="">All campuses</option>' + c.map((x) => `<option value="${HM.esc(x.short_name)}">${HM.esc(x.short_name)}</option>`).join(''); sel.value = localStorage.getItem('hm_campus') || ''; }).catch(() => {});
    sel.addEventListener('change', () => { try { localStorage.setItem('hm_campus', sel.value); } catch (e) { /* storage unavailable */ } renderFeatured(); });
    HM.api.getStats().then((s) => {
      HM.$('#stats').innerHTML = [['students', 'Students'], ['projects', 'Projects posted'], ['hackathons', 'Hackathons listed'], ['teams_formed', 'Teams formed']]
        .map(([k, l]) => `<div><b>${HM.esc(Number(s[k]).toLocaleString('en-IN'))}+</b><span>${l}</span></div>`).join('');
    }).catch(() => { HM.$('#stats').classList.add('hidden'); });
    HM.api.getSkills().then((s) => { HM.$('#skillCloud').innerHTML = s.slice(0, 16).map((x) => `<a class="chip" href="${HM.pageUrl('discover.html')}?skill=${encodeURIComponent(x.name)}">${HM.esc(x.name)}</a>`).join(''); }).catch(() => {});
    renderFeatured();
  }
  async function renderFeatured() {
    const campus = HM.$('#campusSelect').value;
    const pBox = HM.$('#featuredProjects'), hBox = HM.$('#featuredHackathons');
    pBox.innerHTML = HM.skeletons(3, 260); hBox.innerHTML = HM.skeletons(3, 260);
    try {
      const [p, h] = await Promise.all([HM.api.getProjects({ campus, status: 'open' }), HM.api.getHackathons({})]);
      pBox.innerHTML = p.slice(0, 3).map(HM.cards.project).join('') || HM.empty({ icon: 'folder', title: 'No projects yet for this campus', text: 'Be the first to post one.' });
      hBox.innerHTML = h.filter((x) => x.is_featured).slice(0, 3).map(HM.cards.hackathon).join('') || HM.empty({ icon: 'calendar', title: 'No featured hackathons right now' });
    } catch (err) { pBox.innerHTML = HM.errorState(err); hBox.innerHTML = ''; }
  }
  // On the landing page, card buttons send visitors to the full pages (they need an account anyway).
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-action]'); if (!b) return;
    const map = { 'view-project': 'projects.html', 'join-project': 'projects.html', details: 'hackathons.html', save: 'login.html' };
    if (map[b.dataset.action]) window.location.href = HM.pageUrl(map[b.dataset.action]);
  });
  document.addEventListener('click', (ev) => { if (ev.target.id === 'retryBtn') renderFeatured(); });
  load();
})(window.HM);
