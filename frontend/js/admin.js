/* HackMate — admin.js
 * Admin UI and interactions.
 * All admin permissions are verified server-side.
 */
(function (HM) {
  'use strict';

  HM.initPage('admin');

  const e = HM.esc;
  const box = HM.$('#panel');
  const gate = HM.$('#adminGate');
  const shell = HM.$('#adminShell');

  const D = HM.adminDashboard;
  const SECTIONS = D.SECTIONS;

  const TABS = [
    'overview',
    'users',
    'projects',
    'hackathons',
    'reports'
  ];

  let tab = 'overview';
  let shown = null;
  let reqId = 0;
  let editingHackathonId = null;

  /* ==========================================
     TABLE GENERATOR
  ========================================== */

  const table = (cols, rows, rowFn, options = {}) => {
    if (!rows.length) {
      return HM.empty({ title: 'Nothing here yet' });
    }

    const colgroup = options.colWidths
      ? `<colgroup>
          ${options.colWidths.map(
            (width) => `<col style="width:${width}">`
          ).join('')}
        </colgroup>`
      : '';

    const tableClass = options.className
      ? ` class="${options.className}"`
      : '';

    const tableStyle = options.style
      ? ` style="${options.style}"`
      : '';

    return `
      <div class="table-wrap" style="overflow-x:auto;width:100%;">
        <table${tableClass}${tableStyle}>
          ${colgroup}
          <thead>
            <tr>
              ${cols.map((c) => `<th>${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(rowFn).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const act = (
    entity,
    id,
    action,
    label,
    cls = 'btn-ghost'
  ) => `
    <button
      class="btn ${cls} btn-sm"
      data-entity="${entity}"
      data-id="${e(id)}"
      data-action="${action}"
    >
      ${label}
    </button>
  `;

  /* ==========================================
     ADMIN VIEWS
  ========================================== */

  const views = {

    /* MANAGE USERS */
    async users() {
      const [users, campuses] = await Promise.all([
        HM.api.getAdminUsers(),
        HM.api.getCampuses()
      ]);

      return table(
        [
          'Name',
          'Email',
          'College',
          'Role',
          'Status',
          'Actions'
        ],
        users,
        (u) => `
          <tr>
            <td>
              <div style="font-weight:600;">
                ${e(u.name)}
              </div>
            </td>

            <td>${e(u.email)}</td>

            <td>
              <form
                class="admin-campus-form"
                data-user-id="${e(u.id)}"
                style="
                  display:flex;
                  align-items:center;
                  gap:9px;
                  width:100%;
                  min-width:0;
                  margin:0;
                  padding:0;
                "
              >
                <select
                  class="select"
                  name="campus_id"
                  aria-label="College for ${e(u.name)}"
                  style="
                    flex:1 1 auto;
                    width:100%;
                    min-width:0;
                    max-width:220px;
                    height:42px;
                    box-sizing:border-box;
                    margin:0;
                  "
                >
                  ${campuses.map((c) => `
                    <option
                      value="${e(c.id)}"
                      ${Number(c.id) === Number(u.campus_id)
                        ? 'selected'
                        : ''}
                    >
                      ${e(c.short_name)}
                    </option>
                  `).join('')}
                </select>

                <button
                  class="btn btn-ghost btn-sm"
                  type="submit"
                  style="
                    flex:0 0 auto;
                    width:auto;
                    min-width:108px;
                    height:42px;
                    padding:0 12px;
                    margin:0;
                    white-space:nowrap;
                    box-sizing:border-box;
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                  "
                >
                  Save college
                </button>
              </form>
            </td>

            <td style="
              white-space:nowrap;
              font-weight:600;
              color:#555875;
            ">
              ${e(u.role)}
            </td>

            <td>${HM.status(u.status)}</td>

            <td>
              ${u.role === 'student'
                ? (
                    u.status === 'suspended'
                      ? act(
                          'user',
                          u.id,
                          'activate',
                          'Activate',
                          'btn-success'
                        )
                      : act(
                          'user',
                          u.id,
                          'suspend',
                          'Suspend',
                          'btn-danger'
                        )
                  )
                : ''
              }
            </td>
          </tr>
        `,
        {
          className: 'admin-users-table',
          style: `
            width:100%;
            min-width:1100px;
            table-layout:fixed;
          `,
          colWidths: [
            '15%',
            '24%',
            '34%',
            '9%',
            '9%',
            '9%'
          ]
        }
      );
    },

    /* MANAGE PROJECTS */
    async projects() {
      return table(
        [
          'Title',
          'Owner',
          'Campus',
          'Members',
          'Status',
          'Actions'
        ],
        await HM.api.getAdminProjects(),
        (p) => `
          <tr>
            <td>${e(p.title)}</td>
            <td>${e(p.owner)}</td>
            <td>${e(p.campus)}</td>
            <td>${e(p.members)}</td>
            <td>${HM.status(p.status)}</td>
            <td>
              ${
                p.status === 'closed'
                  ? act(
                      'project',
                      p.id,
                      'reopen',
                      'Reopen',
                      'btn-success'
                    )
                  : act(
                      'project',
                      p.id,
                      'close',
                      'Close',
                      'btn-danger'
                    )
              }

              ${act(
                'project',
                p.id,
                'delete',
                'Delete',
                'btn-danger'
              )}
            </td>
          </tr>
        `
      );
    },

    /* MANAGE HACKATHONS */
   async hackathons() {
  const hackathons = await HM.api.getAdminHackathons();

  return `
    <div class="row-between" style="margin-bottom:14px">
      <span></span>
      <button
        class="btn btn-primary btn-sm"
        data-entity="hackathon"
        data-action="create"
      >
        ${HM.icon('plus')}
        Add hackathon
      </button>
    </div>
  ` + table(
    [
      'Name',
      'Organizer',
      'Mode',
      'Deadline',
      'Featured',
      'Actions'
    ],
    hackathons,
    (h) => `
      <tr>
        <td>${e(h.name)}</td>
        <td>${e(h.organizer)}</td>
        <td>${e(h.mode)}</td>
        <td>${e(HM.fmtDate(h.registration_deadline))}</td>
        <td>${h.is_featured ? 'Yes' : 'No'}</td>
        <td style="white-space:nowrap">
          ${act(
            'hackathon',
            h.id,
            'edit',
            'Edit'
          )}

          ${act(
            'hackathon',
            h.id,
            h.is_featured ? 'unfeature' : 'feature',
            h.is_featured ? 'Unfeature' : 'Feature'
          )}

          ${act(
            'hackathon',
            h.id,
            h.status === 'archived' ? 'unarchive' : 'archive',
            h.status === 'archived' ? 'Unarchive' : 'Archive',
            'btn-danger'
          )}

          ${act(
            'hackathon',
            h.id,
            'delete',
            'Delete',
            'btn-danger'
          )}
        </td>
      </tr>
    `
  );
},

    /* MANAGE REPORTS */
    async reports() {
      return table(
        [
          'Target',
          'Type',
          'Reason',
          'Reported by',
          'Status',
          'Actions'
        ],
        await HM.api.getAdminReports(),
        (r) => `
          <tr>
            <td>${e(r.target)}</td>
            <td>${e(r.target_type)}</td>
            <td>${e(r.reason)}</td>
            <td>${e(r.reporter)}</td>
            <td>${HM.status(r.status)}</td>
            <td>
              ${act(
                'report',
                r.id,
                'resolve',
                'Resolve',
                'btn-success'
              )}

              ${act(
                'report',
                r.id,
                'dismiss',
                'Dismiss'
              )}
            </td>
          </tr>
        `
      );
    }

  };

  /* ==========================================
     ROUTING
  ========================================== */

  const parseHash = () => {
    const h = decodeURIComponent(location.hash.slice(1));

    return h === 'activity'
      ? { tab: 'overview', section: 'activity' }
      : {
          tab: TABS.includes(h) ? h : 'overview',
          section: null
        };
  };

  function paintChrome(section) {
    const key = section || tab;

    HM.$$('#adminNav a').forEach((a) => {
      if (a.dataset.tab === key) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    const meta =
      SECTIONS.find((x) => x.tab === key) || SECTIONS[0];

    HM.$('#sectionTitle').textContent = meta.title;
  }

  async function show() {
    const id = ++reqId;
    shown = tab;

    if (tab === 'overview') {
      box.innerHTML = '';
      return D.mount(box);
    }

    box.innerHTML = HM.skeletons(1, 200);

    try {
      const html = await views[tab]();

      if (id === reqId) {
        box.innerHTML = html;
      }
    } catch (err) {
      if (id === reqId) {
        box.innerHTML = HM.errorState(err);
      }
    }
  }

  async function route() {
    const r = parseHash();

    tab = r.tab;

    paintChrome(r.section);

    if (shown !== tab) {
      await show();
    }

    if (r.section) {
      const el = HM.$('#' + r.section);

      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    } else if (shown === tab) {
      window.scrollTo({ top: 0 });
    }
  }

  window.addEventListener('hashchange', () => {
    if (!shell.hidden) route();
  });

  /* ==========================================
     ADD HACKATHON MODAL
  ========================================== */
  function openHackathonForm(hackathon = null) {
  editingHackathonId = hackathon ? Number(hackathon.id) : null;

  if (!HM.$('#hackModal')) {
    document.body.insertAdjacentHTML(
      'beforeend',
      HM.modalShell(
        'hackModal',
        'Manage hackathon',
        `
        <form id="hackForm" novalidate>

          <div class="form-grid">
            <div class="field">
              <label for="hName">Name</label>
              <input class="input" id="hName" name="name" maxlength="150">
              <div class="field-error"></div>
            </div>

            <div class="field">
              <label for="hOrg">Organizer</label>
              <input class="input" id="hOrg" name="organizer" maxlength="150">
              <div class="field-error"></div>
            </div>
          </div>

          <div class="field">
            <label for="hDesc">Description</label>
            <textarea class="textarea" id="hDesc" name="description" maxlength="5000"></textarea>
            <div class="field-error"></div>
          </div>

          <div class="form-grid">
            <div class="field">
              <label for="hStart">Event start</label>
              <input class="input" id="hStart" name="start_date" type="date">
              <div class="field-error"></div>
            </div>

            <div class="field">
              <label for="hEnd">Event end</label>
              <input class="input" id="hEnd" name="end_date" type="date">
              <div class="field-error"></div>
            </div>
          </div>

          <div class="form-grid">
            <div class="field">
              <label for="hDead">Registration deadline</label>
              <input class="input" id="hDead" name="registration_deadline" type="date">
              <div class="field-error"></div>
            </div>

            <div class="field">
              <label for="hMode">Mode</label>
              <select class="select" id="hMode" name="mode">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div class="form-grid">
            <div class="field">
              <label for="hLoc">Location</label>
              <input
                class="input"
                id="hLoc"
                name="location"
                maxlength="150"
                placeholder="City / venue"
              >
            </div>

            <div class="field">
              <label for="hUrl">Website / registration link</label>
              <input
                class="input"
                id="hUrl"
                name="registration_url"
                placeholder="https://"
              >
              <div class="field-error"></div>
            </div>
          </div>

          <div class="field">
            <label for="hSkills">Skills (comma separated)</label>
            <input
              class="input"
              id="hSkills"
              name="skills"
              placeholder="Python, React"
            >
            <div class="field-error"></div>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" data-close>
              Cancel
            </button>

            <button class="btn btn-primary" type="submit" id="hackSubmit">
              Save hackathon
            </button>
          </div>

        </form>
        `,
        true
      )
    );

    HM.$('#hackForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();

      const f = ev.target;

      const v = HM.validate(f, {
        name: [
          HM.rules.required('Enter a name.'),
          HM.rules.minLen(3),
          HM.rules.maxLen(150)
        ],

        organizer: [
          HM.rules.required('Enter the organizer.')
        ],

        start_date: [
          HM.rules.required('Pick a start date.')
        ],

        end_date: [
          HM.rules.required('Pick an end date.'),
          (x) => (
            !f.elements.start_date.value ||
            x >= f.elements.start_date.value
              ? ''
              : 'End date must be on or after the start.'
          )
        ],

        registration_deadline: [
          HM.rules.required('Pick a deadline.'),
          (x) => (
            !f.elements.end_date.value ||
            x <= f.elements.end_date.value
              ? ''
              : 'Deadline must be on or before the event end.'
          )
        ],

        registration_url: [
          HM.rules.url()
        ]
      });

      if (!v) return;

      // Read every value directly from the form.
      // In particular, mode must not be read from v.mode.
      const payload = {
        name: f.elements.name.value.trim(),
        organizer: f.elements.organizer.value.trim(),
        description: f.elements.description.value,
        mode: f.elements.mode.value,
        location: f.elements.location.value.trim(),
        start_date: f.elements.start_date.value,
        end_date: f.elements.end_date.value,
        registration_deadline: f.elements.registration_deadline.value,
        registration_url: f.elements.registration_url.value.trim(),
        skills: HM.csv(f.elements.skills.value)
      };

      if (!['online', 'offline', 'hybrid'].includes(payload.mode)) {
        HM.toast('Please select a valid hackathon mode.', 'error');
        return;
      }

      const btn = HM.$('#hackSubmit');

      HM.setLoading(btn, true);

      try {
        if (editingHackathonId) {
          await HM.api.updateHackathon({
            id: editingHackathonId,
            ...payload
          });

          HM.toast('Hackathon updated successfully.', 'success');
        } else {
          await HM.api.createHackathon({
            ...payload,
            status: 'published'
          });

          HM.toast('Hackathon added successfully.', 'success');
        }

        HM.closeModal('hackModal');
        f.reset();
        editingHackathonId = null;

        shown = null;
        await show();

      } catch (err) {
        HM.toastError(err);
      } finally {
        HM.setLoading(btn, false);
      }
    });
  }

  const f = HM.$('#hackForm');

  if (!f) {
    HM.toast('Could not open the hackathon form.', 'error');
    return;
  }

  f.reset();

  if (hackathon) {
    f.elements.name.value = hackathon.name || '';
    f.elements.organizer.value = hackathon.organizer || '';
    f.elements.description.value = hackathon.description || '';
    f.elements.start_date.value = hackathon.start_date || '';
    f.elements.end_date.value = hackathon.end_date || '';
    f.elements.registration_deadline.value =
      hackathon.registration_deadline || '';

    f.elements.mode.value =
      ['online', 'offline', 'hybrid'].includes(hackathon.mode)
        ? hackathon.mode
        : 'online';

    f.elements.location.value = hackathon.location || '';
    f.elements.registration_url.value = hackathon.registration_url || '';
    f.elements.skills.value = (hackathon.skills || []).join(', ');
  }

  const submit = HM.$('#hackSubmit');

  if (submit) {
    submit.textContent = hackathon ? 'Update hackathon' : 'Add hackathon';
  }

  HM.openModal('hackModal');
}

  /* ==========================================
     ADMIN BUTTON ACTIONS
  ========================================== */

  document.addEventListener('click', async (ev) => {
    if (ev.target.id === 'retryBtn') {
      return shell.hidden ? init() : show();
    }

    if (ev.target.closest('#adminRefresh')) {
      shown = null;
      return route();
    }

    const nav = ev.target.closest('a[href^="#"]');

    if (
      nav &&
      nav.getAttribute('href') === location.hash
    ) {
      ev.preventDefault();

      shown = nav.dataset.tab === 'activity'
        ? shown
        : null;

      return route();
    }

    const b = ev.target.closest('[data-entity]');

    if (!b) return;

   /* CREATE HACKATHON */
if (
  b.dataset.entity === 'hackathon' &&
  b.dataset.action === 'create'
) {
  return openHackathonForm();
}

/* EDIT HACKATHON */
if (
  b.dataset.entity === 'hackathon' &&
  b.dataset.action === 'edit'
) {
  HM.setLoading(b, true);

  try {
    const hackathons = await HM.api.getAdminHackathons();

    const hackathon = hackathons.find(
      (h) => Number(h.id) === Number(b.dataset.id)
    );

    if (!hackathon) {
      throw new Error('Hackathon not found.');
    }

    openHackathonForm(hackathon);
  } catch (err) {
    HM.toastError(err);
  } finally {
    HM.setLoading(b, false);
  }

  return;
}

/* DELETE HACKATHON */
if (
  b.dataset.entity === 'hackathon' &&
  b.dataset.action === 'delete'
) {
  const name =
    b.closest('tr')?.querySelector('td')?.textContent?.trim()
    || 'this hackathon';

  if (!window.confirm(
    `Permanently delete "${name}"? This action cannot be undone.`
  )) {
    return;
  }
}

    /* CONFIRM PROJECT DELETION */
    if (
      b.dataset.entity === 'project' &&
      b.dataset.action === 'delete'
    ) {
      const row = b.closest('tr');

      const title =
        row?.querySelector('td')?.textContent?.trim()
        || 'this project';

      if (
        !window.confirm(
          `Are you sure you want to permanently delete "${title}"?`
        )
      ) {
        return;
      }
    }

    /* CONFIRM HACKATHON ARCHIVING */
    if (
      b.dataset.entity === 'hackathon' &&
      b.dataset.action === 'archive'
    ) {
      const row = b.closest('tr');

      const name =
        row?.querySelector('td')?.textContent?.trim()
        || 'this hackathon';

      if (
        !window.confirm(
          `Are you sure you want to archive "${name}"?`
        )
      ) {
        return;
      }
    }

    HM.setLoading(b, true);

    try {
      const res = await HM.api.adminAction({
        entity: b.dataset.entity,
        id: Number(b.dataset.id),
        action: b.dataset.action
      });

      HM.toastResult(res, 'Action completed');

      show();
    } catch (err) {
      HM.toastError(err);
    } finally {
      HM.setLoading(b, false);
    }
  });

  /* ==========================================
     FORM SUBMISSIONS
  ========================================== */

  document.addEventListener('submit', async (ev) => {
    /* UPDATE USER COLLEGE */
    if (ev.target.matches('.admin-campus-form')) {
      ev.preventDefault();

      const f = ev.target;
      const btn = HM.$('button[type=submit]', f);

      HM.setLoading(btn, true);

      try {
        const res = await HM.api.adminAction({
          entity: 'user',
          id: Number(f.dataset.userId),
          action: 'set_campus',
          campus_id: Number(f.elements.campus_id.value)
        });

        HM.toastResult(res, 'College updated');

        show();
      } catch (err) {
        HM.toastError(err);
      } finally {
        HM.setLoading(btn, false);
      }

      return;
    }
  });

  /* ==========================================
     ADMIN ROLE VERIFICATION
  ========================================== */

  async function init() {
    gate.textContent = 'Checking access…';

    let me;

    try {
      me = await HM.api.getCurrentUser();
    } catch (err) {
      gate.innerHTML = HM.errorState(err);
      return;
    }

    if (!me) {
      return location.replace(
        HM.pageUrl('login.html')
      );
    }

    if (me.role !== 'admin') {
      return location.replace(
        HM.pageUrl('dashboard.html')
      );
    }

    gate.remove();

    shell.hidden = false;

    document.title = 'Admin Command Centre · HackMate';

    HM.$('#adminNav').innerHTML = SECTIONS.map((x) => `
      <a
        href="#${x.route}"
        data-tab="${x.tab}"
      >
        ${D.icon(x.icon)}
        <span>${e(x.label)}</span>

        ${x.tab === 'reports'
          ? `
            <span
              class="admin-badge"
              id="navReportsBadge"
              hidden
              aria-label="open reports"
            ></span>
          `
          : ''
        }
      </a>
    `).join('');

    HM.$('#adminBack').innerHTML = `
      ${D.icon('back')}
      Back to student view
    `;

    HM.$('#adminRefresh').innerHTML = `
      ${D.icon('refresh')}
      Refresh
    `;

    HM.$('#adminWelcome').textContent =
      `Welcome back, ${me.name || 'Administrator'}. Here is what is happening on HackMate right now.`;

    route();
  }

  init();

})(window.HM);
