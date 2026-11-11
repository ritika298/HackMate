
/* HackMate — projects.js */
(function (HM) {
  'use strict';

  HM.initPage('projects');

  const e = HM.esc;
  const grid = HM.$('#results');
  const form = HM.$('#filters');
  const createForm = HM.$('#createForm');

  let list = [];
  let openRequest;
  let detail = null;
  let openReport;

  const filters = () => Object.fromEntries(new FormData(form).entries());

  function toList(value) {
    if (Array.isArray(value)) {
      return value.map(x => String(x).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value.split(',').map(x => x.trim()).filter(Boolean);
    }

    return [];
  }

  function uniqueList(values) {
    const result = [];

    values.forEach(value => {
      const item = String(value || '').trim();

      if (
        item &&
        !result.some(x => x.toLowerCase() === item.toLowerCase())
      ) {
        result.push(item);
      }
    });

    return result;
  }

  async function load() {
    grid.innerHTML = HM.skeletons(4, 300);

    try {
      list = await HM.api.getProjects(filters());

      grid.innerHTML = list.map(HM.cards.project).join('') ||
        HM.empty({
          icon: 'folder',
          title: 'No projects found',
          text: 'Change your filters, or post your own idea.',
          actionHtml: '<button class="btn btn-primary" id="emptyCreate">Create project</button>'
        });
    } catch (err) {
      grid.innerHTML = HM.errorState(err);
    }
  }

  async function init() {
    HM.fillSelect(
      form.category,
      Object.entries(HM.labels.CATEGORY).map(([id, name]) => ({ id, name })),
      { placeholder: 'Any type' }
    );

    try {
      const [campuses, skills] = await Promise.all([
        HM.api.getCampuses(),
        HM.api.getSkills()
      ]);

      HM.fillSelect(form.campus, campuses, {
        placeholder: 'Any campus',
        valueKey: 'short_name',
        labelKey: 'short_name'
      });

      HM.fillSelect(form.skill, skills, {
        placeholder: 'Any tech',
        valueKey: 'name'
      });

      HM.fillSelect(createForm.campus_id, campuses, {
        labelKey: 'short_name'
      });
    } catch (err) {
      /* Optional filter data */
    }

    HM.fillSelect(
      createForm.category,
      Object.entries(HM.labels.CATEGORY).map(([id, name]) => ({ id, name }))
    );

    load();
  }

  /* Suggestions */
  const roleSuggestions = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'UI/UX Designer',
    'ML Engineer',
    'AI Engineer',
    'Data Scientist',
    'App Developer',
    'DevOps Engineer',
    'Researcher',
    'Product Manager',
    'Tester'
  ];

  const techSuggestions = [
    'HTML/CSS',
    'JavaScript',
    'Python',
    'React',
    'Node.js',
    'PHP',
    'Java',
    'C++',
    'MySQL',
    'MongoDB',
    'Firebase',
    'TensorFlow',
    'Figma',
    'Flutter',
    'Git',
    'FastAPI',
    'Docker',
    'Android',
    'Blockchain',
    'Cloud'
  ];

  /* Reusable bubble picker */
  function setupBubblePicker(id, suggestions, initialValues) {
    const selected = uniqueList(initialValues || []);

    const selectedBox = HM.$(`#${id}Selected`);
    const optionsBox = HM.$(`#${id}Options`);
    const input = HM.$(`#${id}Custom`);
    const addButton = HM.$(`#${id}Add`);

    if (!selectedBox || !optionsBox || !input || !addButton) {
      console.error('Bubble picker elements missing:', id);
      return null;
    }

    function render() {
      selectedBox.innerHTML = selected.length
        ? selected.map(value => `
            <button
              type="button"
              class="skill-option selected"
              data-remove-value="${e(value)}"
            >
              ${e(value)}
              <span class="bubble-remove">×</span>
            </button>
          `).join('')
        : '<span class="bubble-empty">Nothing selected yet.</span>';

      const available = uniqueList(suggestions).filter(
        item => !selected.some(
          x => x.toLowerCase() === item.toLowerCase()
        )
      );

      optionsBox.innerHTML = available.length
        ? available.map(value => `
            <button
              type="button"
              class="skill-option"
              data-add-value="${e(value)}"
            >${e(value)}</button>
          `).join('')
        : '<span class="bubble-empty">All suggestions selected.</span>';
    }

    function add(value) {
      const item = String(value || '').trim();

      if (!item) return false;

      if (item.includes(',')) {
        HM.toast('Please add one item at a time.', 'error');
        return false;
      }

      if (selected.some(
        x => x.toLowerCase() === item.toLowerCase()
      )) {
        HM.toast('This item is already selected.', 'info');
        return false;
      }

      if (selected.length >= 15) {
        HM.toast('You can select up to 15 items.', 'error');
        return false;
      }

      selected.push(item);
      render();
      return true;
    }

    selectedBox.addEventListener('click', ev => {
      const button = ev.target.closest('[data-remove-value]');
      if (!button) return;

      const value = button.dataset.removeValue;
      const index = selected.findIndex(x => x === value);

      if (index !== -1) {
        selected.splice(index, 1);
      }

      render();
    });

    optionsBox.addEventListener('click', ev => {
      const button = ev.target.closest('[data-add-value]');
      if (!button) return;

      add(button.dataset.addValue);
    });

    addButton.addEventListener('click', () => {
      if (add(input.value)) {
        input.value = '';
      }

      input.focus();
    });

    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        addButton.click();
      }
    });

    render();

    return {
      getValues: () => [...selected],

      setValues: values => {
        selected.splice(
          0,
          selected.length,
          ...uniqueList(toList(values))
        );

        render();
      },

      reset: () => {
        selected.splice(0, selected.length);
        input.value = '';
        render();
      }
    };
  }

  /* Create form bubble pickers */
  const createLookPicker = setupBubblePicker(
    'createLook',
    roleSuggestions,
    []
  );

  const createTechPicker = setupBubblePicker(
    'createTech',
    techSuggestions,
    []
  );

  function syncCreateFields() {
    createForm.looking_for.value = HM.csv(
      createLookPicker.getValues()
    );

    createForm.tech.value = HM.csv(
      createTechPicker.getValues()
    );
  }

  /* Project detail */
  async function showDetail(p) {
    HM.$('#detailTitle').textContent = p.title;
    HM.$('#detailBody').innerHTML = HM.skeletons(1, 180);

    HM.openModal('detailModal');

    let d = p;

    try {
      d = await HM.api.getProject(p.id);
    } catch (err) {
      HM.toastError(err);
    }

    detail = d;

    const members = (d.members || []).map(m => `
      <div class="row" style="margin:8px 0">
        ${HM.avatar(m, 'avatar-sm')}

        <a href="${HM.pageUrl('profile.html')}?id=${encodeURIComponent(m.id)}">
          <b>${e(m.name)}</b>
        </a>

        <span class="small muted">
          ${e(m.member_role)}${m.is_owner ? ' · Owner' : ''}
        </span>
      </div>
    `).join('');

    const full = d.member_count >= d.team_size;
    const pending = d.my_request_status === 'pending';

    const actions = d.is_owner
      ? `
        <button class="btn btn-ghost btn-sm"
          data-action="edit-project" data-id="${e(d.id)}">
          ${HM.icon('edit')}Edit
        </button>

        <button class="btn btn-danger btn-sm"
          data-action="delete-project" data-id="${e(d.id)}">
          Delete project
        </button>
      `
      : (
        d.is_member
          ? `<button class="btn btn-ghost btn-sm"
              data-action="leave-project" data-id="${e(d.id)}">
              Leave team
            </button>`
          : `
            <button class="btn btn-primary btn-sm"
              data-action="join-project"
              data-id="${e(d.id)}"
              ${d.status !== 'open' || full || pending ? 'disabled' : ''}>
              ${pending ? 'Request pending' : 'Request to join'}
            </button>
          `
      ) + `
        <button class="btn btn-ghost btn-sm"
          data-action="report-project" data-id="${e(d.id)}">
          Report
        </button>
      `;

    HM.$('#detailBody').innerHTML = `
      <div class="row" style="margin-bottom:12px">
        ${HM.status(d.status)}

        <span class="cat-tag">
          ${e(HM.labels.CATEGORY[d.category] || d.category)}
          · ${e(d.campus)}
        </span>
      </div>

      <p>${e(d.description)}</p>

      <div class="detail-block">
        <div class="label-sm">Looking for</div>
        ${HM.chips(toList(d.looking_for), 'sun')}
      </div>

      <div class="detail-block">
        <div class="label-sm">Tech</div>
        ${HM.chips(toList(d.tech), 'teal')}
      </div>

      <div class="detail-block">
        <div class="label-sm">
          Team (${e(d.member_count)} / ${e(d.team_size)})
        </div>
        ${members || '<span class="muted">No members yet.</span>'}
      </div>

      <div class="card-actions" style="margin-top:16px">
        ${actions}
      </div>
    `;
  }

  /* Edit modal */
  function bubblePickerHTML(id, label, helpText) {
    return `
      <div class="field project-bubble-field">
        <label>${label}</label>

        <div class="selected-bubble-section">
          <div class="bubble-section-label">Selected</div>

          <div class="selected-bubbles" id="${id}Selected">
            <span class="bubble-empty">Nothing selected yet.</span>
          </div>
        </div>

        <div class="bubble-section-label">Suggestions</div>
        <div class="bubble-options" id="${id}Options"></div>

        <div class="custom-bubble-row">
          <input class="input" id="${id}Custom"
            type="text" maxlength="60"
            placeholder="Add your own ${label.toLowerCase()}...">

          <button type="button" class="btn btn-ghost"
            id="${id}Add">Add</button>
        </div>

        <small class="muted">${helpText}</small>
      </div>
    `;
  }

  function openEdit(d) {
    if (!HM.$('#editProjectModal')) {
      document.body.insertAdjacentHTML(
        'beforeend',
        HM.modalShell(
          'editProjectModal',
          'Edit project',
          `
          <form id="editProjectForm" novalidate>

            <div class="field">
              <label for="epTitle">Title</label>
              <input class="input" id="epTitle"
                name="title" maxlength="150">
              <div class="field-error"></div>
            </div>

            <div class="field">
              <label for="epDesc">Description</label>
              <textarea class="textarea" id="epDesc"
                name="description" maxlength="2000"></textarea>
              <div class="field-error"></div>
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="epCategory">Project type</label>
                <select class="select" id="epCategory"
                  name="category"></select>
              </div>

              <div class="field">
                <label for="epStatus">Status</label>
                <select class="select" id="epStatus" name="status">
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div class="field">
                <label for="epSize">Team size</label>
                <input class="input" id="epSize"
                  name="team_size" type="number" min="2" max="12">
                <div class="field-error"></div>
              </div>
            </div>

            ${bubblePickerHTML(
              'epLook',
              'Roles you need',
              'Choose suggestions or add your own role.'
            )}

            ${bubblePickerHTML(
              'epTech',
              'Tech you want to use',
              'Choose suggestions or add your own technology.'
            )}

            <div class="modal-foot">
              <button type="button" class="btn btn-ghost" data-close>
                Cancel
              </button>

              <button class="btn btn-primary" type="submit">
                Save changes
              </button>
            </div>

          </form>
          `,
          true
        )
      );

      const f = HM.$('#editProjectForm');

      HM.fillSelect(
        f.category,
        Object.entries(HM.labels.CATEGORY).map(
          ([id, name]) => ({ id, name })
        )
      );

      f._lookingForPicker = setupBubblePicker(
        'epLook',
        roleSuggestions,
        []
      );

      f._techPicker = setupBubblePicker(
        'epTech',
        techSuggestions,
        []
      );

      f.addEventListener('submit', async ev => {
        ev.preventDefault();

        const v = HM.validate(f, {
          title: [
            HM.rules.required('Give your project a title.'),
            HM.rules.minLen(3),
            HM.rules.maxLen(150)
          ],
          description: [
            HM.rules.required(),
            HM.rules.minLen(10),
            HM.rules.maxLen(2000)
          ],
          category: [HM.rules.required('Please select a project type.')],
          team_size: [HM.rules.required()]
        });

        if (!v) return;

        const lookingFor = f._lookingForPicker.getValues();
        const tech = f._techPicker.getValues();

        if (!lookingFor.length) {
          HM.toast('Please select at least one role you need.', 'error');
          return;
        }

        const btn = HM.$('button[type=submit]', f);
        HM.setLoading(btn, true);

        try {
          await HM.api.updateProject({
            id: detail.id,
            title: v.title,
            description: v.description,
            category: v.category,
            status: v.status,
            team_size: Number(v.team_size),
            looking_for: HM.csv(lookingFor),
            tech: HM.csv(tech)
          });

          HM.closeModal('editProjectModal');
          HM.closeModal('detailModal');
          HM.toast('Project updated', 'success');
          load();

        } catch (err) {
          HM.toastError(err);
        } finally {
          HM.setLoading(btn, false);
        }
      });
    }

    const f = HM.$('#editProjectForm');

    f.title.value = d.title || '';
    f.description.value = d.description || '';
    f.category.value = d.category || '';
    f.status.value = d.status || 'open';
    f.team_size.value = d.team_size || 3;

    f._lookingForPicker.setValues(d.looking_for);
    f._techPicker.setValues(d.tech);

    HM.openModal('editProjectModal');
  }

  /* Create project submission */
  createForm.addEventListener('submit', async ev => {
    ev.preventDefault();

    syncCreateFields();

    const v = HM.validate(createForm, {
      title: [
        HM.rules.required('Give your project a title.'),
        HM.rules.minLen(4),
        HM.rules.maxLen(150)
      ],
      description: [
        HM.rules.required('Describe what you are building.'),
        HM.rules.minLen(20, 'Add a few more details (20+ characters).'),
        HM.rules.maxLen(2000)
      ],
      category: [HM.rules.required('Please select a project type.')],
      team_size: [HM.rules.required()],
      looking_for: [
        HM.rules.required('List at least one role you need.')
      ]
    });

    if (!v) return;

    const payload = {
      title: v.title,
      description: v.description,
      category: v.category,
      campus_id: Number(v.campus_id),
      team_size: Number(v.team_size),
      looking_for: HM.csv(createLookPicker.getValues()),
      tech: HM.csv(createTechPicker.getValues())
    };

    const btn = HM.$('button[type=submit]', createForm);
    HM.setLoading(btn, true);

    try {
      const res = await HM.api.createProject(payload);

      HM.closeModal('createModal');
      createForm.reset();

      createLookPicker.reset();
      createTechPicker.reset();

      HM.toastResult(res, 'Project created');
      load();

    } catch (err) {
      HM.toastError(err);
    } finally {
      HM.setLoading(btn, false);
    }
  });

  /* Filters */
  form.addEventListener('input', HM.debounce(load, 300));

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    load();
  });

  HM.$('#createBtn').addEventListener('click', () => {
    HM.openModal('createModal');
  });

  /* Project actions */
  document.addEventListener('click', ev => {
    if (ev.target.id === 'retryBtn') load();

    if (ev.target.id === 'emptyCreate') {
      HM.openModal('createModal');
    }

    const b = ev.target.closest('[data-action]');
    if (!b) return;

    const p = list.find(x => String(x.id) === b.dataset.id);
    if (!p) return;

    if (b.dataset.action === 'view-project') {
      showDetail(p);
    }

    if (b.dataset.action === 'edit-project' && detail) {
      openEdit(detail);
    }

    if (b.dataset.action === 'report-project') {
      openReport = openReport || HM.initReportModal();

      openReport(`Report project: ${p.title}`, {
        target_type: 'project',
        target_id: p.id
      });
    }

    if (
      b.dataset.action === 'delete-project' &&
      confirm(`Delete "${p.title}"? This removes the project and its team. It cannot be undone.`)
    ) {
      HM.setLoading(b, true);

      HM.api.deleteProject(p.id)
        .then(() => {
          HM.closeModal('detailModal');
          HM.toast('Project deleted', 'success');
          load();
        })
        .catch(err => {
          HM.toastError(err);
          HM.setLoading(b, false);
        });
    }

    if (
      b.dataset.action === 'leave-project' &&
      confirm(`Leave "${p.title}"?`)
    ) {
      HM.setLoading(b, true);

      HM.api.leaveProject(p.id)
        .then(() => {
          HM.closeModal('detailModal');
          HM.toast('You left the team', 'success');
          load();
        })
        .catch(err => {
          HM.toastError(err);
          HM.setLoading(b, false);
        });
    }

    if (b.dataset.action === 'join-project') {
      HM.closeModal('detailModal');

      openRequest = openRequest || HM.initRequestModal();

      openRequest(`To join ${p.title} (owner: ${p.owner.name})`, {
        project_id: p.id,
        type: 'join_request'
      });
    }
  });

  init();

})(window.HM);
