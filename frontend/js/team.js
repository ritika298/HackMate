/* HackMate — team.js. getTeam() → {teams:[{project, members:[{…user, member_role, is_owner}]}]} */
(function (HM) {
  'use strict';
  HM.initPage('team');
  const e = HM.esc; const box = HM.$('#team'); let teams = [], idx = 0;

  function render() {
    if (!teams.length) { box.innerHTML = HM.empty({ icon: 'users', title: 'You are not on a team yet', text: 'Join a project or accept a request to see your team here.', actionHtml: `<a class="btn btn-primary" href="${HM.pageUrl('projects.html')}">Browse projects</a>` }); return; }
    const t = teams[idx];
    box.innerHTML = `${teams.length > 1 ? `<div class="tabs">${teams.map((x, i) => `<button data-i="${i}" aria-selected="${i === idx}">${e(x.project.title)}</button>`).join('')}</div>` : ''}
      <div class="team-hero"><h2>Team: ${e(t.project.title)}</h2><p>${e(t.project.description)}</p>${t.project.hackathon ? `<p style="margin-top:8px">${HM.icon('trophy')} Building for ${e(t.project.hackathon)}</p>` : ''}</div>
      <div class="section-head"><h2 style="font-size:1.4rem">Members (${t.members.length})</h2></div>
      <div class="grid-cards">${t.members.map((m) => `<article class="card member card-col">${HM.avatar(m)}<h3 style="margin:0">${e(m.name)}</h3>
        <div class="role">${e(m.member_role)}${m.is_owner ? ' · Owner' : ''}</div><div class="small muted">${e(m.campus)} · ${e(m.branch)}</div>${HM.chips(m.skills, '', 4)}
        <a class="btn btn-ghost btn-sm" href="${HM.pageUrl('profile.html')}?id=${encodeURIComponent(m.id)}">View profile</a></article>`).join('')}</div>`;
  }
  async function load() { box.innerHTML = HM.skeletons(3, 200); try { teams = (await HM.api.getTeam()).teams || []; render(); } catch (err) { box.innerHTML = HM.errorState(err); } }
  document.addEventListener('click', (ev) => { if (ev.target.id === 'retryBtn') load(); const b = ev.target.closest('.tabs button'); if (b) { idx = Number(b.dataset.i); render(); } });
  load();
})(window.HM);
