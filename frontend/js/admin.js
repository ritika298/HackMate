
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
    'reports',
    'skills'
  ];

  let tab = 'overview';
  let shown = null;
  let reqId = 0;

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

            <td>
              ${e(u.email)}
            </td>

            <!-- COLLEGE -->
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

            <!-- ROLE -->
            <td style="
              white-space:nowrap;
              font-weight:600;
              color:#555875;
            ">
              ${e(u.role)}
            </td>

            <!-- STATUS -->
            <td>
              ${HM.status(u.status)}
            </td>

            <!-- ACTIONS -->
            <td>
              ${u.role === 'student' && u.status !== 'suspended'
                ? act(
                    'user',
                    u.id,
                    'suspend',
                    'Suspend',
                    'btn-danger'
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
          ''
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
              ${act(
                'project',
                p.id,
                'close',
                'Close',
                'btn-danger'
              )}
            </td>
          </tr>
        `
      );
    },

    /* MANAGE HACKATHONS */
    async hackathons() {

      return `
        <div
          class="row-between"
          style="margin-bottom:14px"
        >
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
          ''
        ],
        await HM.api.getAdminHackathons(),
        (h) => `
          <tr>
            <td>${e(h.name)}</td>
            <td>${e(h.organizer)}</td>
            <td>${e(h.mode)}</td>
            <td>${e(HM.fmtDate(h.registration_deadline))}</td>
            <td>${h.is_featured ? 'Yes' : 'No'}</td>
            <td>
              ${act(
                'hackathon',
                h.id,
                'feature',
                'Toggle featured'
              )}

              ${act(
                'hackathon',
                h.id,
                'archive',
                'Archive',
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
          ''
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
    },

    /* MANAGE SKILLS */
    async skills() {

      const s = await HM.api.getAdminSkills();

      return `
        <form
          class="row"
          id="skillForm"
          style="margin-bottom:16px"
          novalidate
        >
          <input
            class="input"
            name="name"
            placeholder="New skill name"
            style="max-width:280px"
            maxlength="60"
            aria-label="New skill name"
          >

          <button
            class="btn btn-primary"
            type="submit"
          >
            Add skill
          </button>
        </form>

        ${HM.chips(s.map((x) => x.name))}
      `;
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

  function openHackathonForm() {

    if (!HM.$('#hackModal')) {

      document.body.insertAdjacentHTML(
        'beforeend',
        HM.modalShell(
          'hackModal',
          'Add hackathon',
          `
          <form id="hackForm" novalidate>

            <div class="form-grid">

              <div class="field">
                <label for="hName">Name</label>
                <input
                  class="input"
                  id="hName"
                  name="name"
                  maxlength="150"
                >
                <div class="field-error"></div>
              </div>

              <div class="field">
                <label for="hOrg">Organizer</label>
                <input
                  class="input"
                  id="hOrg"
                  name="organizer"
                  maxlength="150"
                >
                <div class="field-error"></div>
              </div>

            </div>

            <div class="field">
              <label for="hDesc">Description</label>
              <textarea
                class="textarea"
                id="hDesc"
                name="description"
                maxlength="2000"
              ></textarea>
              <div class="field-error"></div>
            </div>

            <div class="form-grid">

              <div class="field">
                <label for="hStart">Event start</label>
                <input
                  class="input"
                  id="hStart"
                  name="start_date"
                  type="date"
                >
                <div class="field-error"></div>
              </div>

              <div class="field">
                <label for="hEnd">Event end</label>
                <input
                  class="input"
                  id="hEnd"
                  name="end_date"
                  type="date"
                >
                <div class="field-error"></div>
              </div>

            </div>

            <div class="form-grid">

              <div class="field">
                <label for="hDead">
                  Registration deadline
                </label>
                <input
                  class="input"
                  id="hDead"
                  name="registration_deadline"
                  type="date"
                >
                <div class="field-error"></div>
              </div>

              <div class="field">
                <label for="hMode">Mode</label>
                <select
                  class="select"
                  id="hMode"
                  name="mode"
                >
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
                  placeholder="City / venue (blank if online)"
                >
              </div>

              <div class="field">
                <label for="hUrl">
                  Website / registration link
                </label>
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
              <label for="hSkills">
                Skills (comma separated, must exist in Skills)
              </label>
              <input
                class="input"
                id="hSkills"
                name="skills"
                placeholder="Python, React"
              >
              <div class="field-error"></div>
            </div>

            <div class="modal-foot">

              <button
                type="button"
                class="btn btn-ghost"
                data-close
              >
                Cancel
              </button>

              <button
                class="btn btn-primary"
                type="submit"
              >
                Add hackathon
              </button>

            </div>

          </form>
          `,
          true
        )
      );

      HM.$('#hackForm').addEventListener(
        'submit',
        async (ev) => {

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
                !f.start_date.value ||
                x >= f.start_date.value
                  ? ''
                  : 'End date must be on or after the start.'
              )
            ],

            registration_deadline: [
              HM.rules.required('Pick a deadline.'),
              (x) => (
                !f.end_date.value ||
                x <= f.end_date.value
                  ? ''
                  : 'Deadline must be on or before the event end.'
              )
            ],

            registration_url: [
              HM.rules.url()
            ]

          });

          if (!v) return;

          const payload = {

            name: v.name,
            organizer: v.organizer,
            description: v.description,
            mode: v.mode,
            location: v.location,

            start_date: v.start_date,
            end_date: v.end_date,

            registration_deadline: v.registration_deadline,
            registration_url: v.registration_url,

            skills: HM.csv(v.skills),
            status: 'published'

          };

          const btn = HM.$('button[type=submit]', f);

          HM.setLoading(btn, true);

          try {

            await HM.api.createHackathon(payload);

            HM.closeModal('hackModal');

            f.reset();

            HM.toast('Hackathon added', 'success');

            show();

          } catch (err) {

            HM.toastError(err);

          } finally {

            HM.setLoading(btn, false);

          }

        }
      );
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

    if (b.dataset.action === 'create') {
      return openHackathonForm();
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

    /* ADD SKILL */
    if (ev.target.id !== 'skillForm') return;

    ev.preventDefault();

    const v = HM.validate(ev.target, {

      name: [
        HM.rules.required('Enter a skill name.'),
        HM.rules.maxLen(60)
      ]

    });

    if (!v) return;

    try {

      const res = await HM.api.adminAction({

        entity: 'skill',
        action: 'create',
        name: v.name

      });

      HM.toastResult(res, 'Skill added');

      ev.target.reset();

      show();

    } catch (err) {

      HM.toastError(err);

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
