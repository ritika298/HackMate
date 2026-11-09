/* HackMate — requests.js. Incoming + Sent tabs. Permission checks (who may accept/cancel) are the backend's job. */
(function (HM) {
  'use strict';
  HM.initPage('requests');
  const e = HM.esc; const box = HM.$('#list'); let data = { incoming: [], sent: [] }, tab = 'incoming';
  const TYPE = { join_request: 'Join request', invite: 'Invite', team_up: 'Team request' };

  function card(r, dir) {
    const pending = r.status === 'pending';
    const actions = pending ? (dir === 'incoming'
      ? `<button class="btn btn-success btn-sm" data-act="accept" data-id="${e(r.id)}">${HM.icon('check')}Accept</button><button class="btn btn-danger btn-sm" data-act="reject" data-id="${e(r.id)}">${HM.icon('x')}Reject</button>`
      : `<button class="btn btn-ghost btn-sm" data-act="cancel" data-id="${e(r.id)}">Cancel request</button>`) : '';
    return `<article class="card req-card" id="req-${e(r.id)}">${HM.avatar(r.user)}<div>
      <div class="row"><b>${e(r.user.name)}</b><span class="small muted">${e(r.user.campus)}</span><span class="chip plain">${e(TYPE[r.type] || r.type)}${r.project ? ': ' + e(r.project.title) : ''}</span></div>
      <div style="margin:8px 0">${HM.chips(r.user.skills, '', 4)}</div><div class="req-msg">${e(r.message)}</div>
      <div class="small muted">${e(HM.fmtDate(r.created_at))}</div></div>
      <div class="stack" style="align-items:flex-end"><span data-status>${HM.status(r.status)}</span><div class="req-actions">${actions}</div></div></article>`;
  }
  function render() {
    HM.$$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    HM.$('#cntIn').textContent = data.incoming.filter((r) => r.status === 'pending').length; HM.$('#cntOut').textContent = data.sent.filter((r) => r.status === 'pending').length;
    const items = data[tab];
    box.innerHTML = items.map((r) => card(r, tab)).join('') || HM.empty({ icon: 'inbox', title: tab === 'incoming' ? 'No incoming requests' : 'You have not sent any requests', text: tab === 'incoming' ? 'When someone wants to team up with you, it shows here.' : 'Find teammates on Discover and say hi.', actionHtml: `<a class="btn btn-primary" href="${HM.pageUrl('discover.html')}">Find teammates</a>` });
  }
  async function load() { box.innerHTML = HM.skeletons(3, 150); try { data = await HM.api.getRequests(); render(); } catch (err) { box.innerHTML = HM.errorState(err); } }

  document.addEventListener('click', async (ev) => {
    if (ev.target.id === 'retryBtn') return load();
    const t = ev.target.closest('.tabs button'); if (t) { tab = t.dataset.tab; return render(); }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const list = data[tab]; const r = list.find((x) => String(x.id) === b.dataset.id); if (!r) return;
    HM.setLoading(b, true);
    try {

      const res = b.dataset.act === 'cancel' ? await HM.api.cancelRequest(r.id) : await HM.api.respondRequest(r.id, b.dataset.act);
      r.status = { accept: 'accepted', reject: 'rejected', cancel: 'cancelled' }[b.dataset.act]; render();
      HM.toastResult(res, { accept: 'Request accepted', reject: 'Request rejected', cancel: 'Request cancelled' }[b.dataset.act]);
    } catch (err) { HM.toastError(err); HM.setLoading(b, false); }
  });
  load();
})(window.HM);
