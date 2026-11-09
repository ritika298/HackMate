/* HackMate — discover.js. Filters are sent to HM.api.getUsers(filters); the BACKEND does the filtering. */
(function (HM) {
  'use strict';
  HM.initPage('discover');
  const grid = HM.$('#results'), form = HM.$('#filters'); let openRequest;
  const ROLES = ['Frontend Developer', 'Backend Developer', 'ML Engineer', 'Mobile Developer', 'UI/UX Designer', 'Researcher', 'Embedded Developer', 'Security Engineer', 'Product Manager'];

  const filters = () => Object.fromEntries(new FormData(form).entries());
  async function load() {
    grid.innerHTML = HM.skeletons(6, 260);
    try {
      const users = await HM.api.getUsers(filters());
      HM.$('#count').textContent = `${users.length} student${users.length === 1 ? '' : 's'}`;
      grid.innerHTML = users.map(HM.cards.user).join('') || HM.empty({ icon: 'users', title: 'No students match these filters', text: 'Try removing a filter or searching for a different skill.', actionHtml: '<button class="btn btn-ghost" id="clearBtn">Clear filters</button>' });
    } catch (err) { grid.innerHTML = HM.errorState(err); }
  }
  async function init() {
    HM.fillSelect(form.role, ROLES, { placeholder: 'Any role' });
    HM.fillSelect(form.year, [1, 2, 3, 4, 5].map((y) => ({ id: y, name: 'Year ' + y })), { placeholder: 'Any year' });
    try {
      const [c, s] = await Promise.all([HM.api.getCampuses(), HM.api.getSkills()]);
      HM.fillSelect(form.campus, c, { placeholder: 'Any campus', valueKey: 'short_name', labelKey: 'short_name' });
      HM.fillSelect(form.skill, s, { placeholder: 'Any skill', valueKey: 'name' });
    } catch (e) { /* filters stay usable without options */ }
    const qs = new URLSearchParams(location.search); // landing page skill chips link here
    ['skill', 'campus', 'q'].forEach((k) => { if (qs.get(k) && form[k]) form[k].value = qs.get(k); });
    load();
  }
  form.addEventListener('input', HM.debounce(load, 300));
  form.addEventListener('submit', (e) => { e.preventDefault(); load(); });
  document.addEventListener('click', (ev) => {
    if (ev.target.id === 'retryBtn') load();
    if (ev.target.id === 'clearBtn') { form.reset(); load(); }
    const b = ev.target.closest('[data-action="request-user"]');
    if (b) {
      const u = b.closest('.person'); const name = HM.$('h3', u).textContent;
      openRequest = openRequest || HM.initRequestModal(); openRequest(`To ${name}`, { receiver_id: Number(b.dataset.id), type: 'team_up' });
    }
  });
  init();
})(window.HM);
