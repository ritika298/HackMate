
/* HackMate — Premium Profile Page with Separate Bubble Pickers */
(function (HM) {
  'use strict';

  HM.initPage('profile');

  const e = HM.esc;
  const box = HM.$('#profile');
  const id = new URLSearchParams(location.search).get('id');

  let current = null;
  let isMe = !id;
  let skillCatalog = [];

  // ==========================================
  // BUBBLE PICKER DATA
  // ==========================================

  const selectedSkills = [];
  const selectedInterests = [];
  const selectedRoles = [];

  const interestOptions = [
    'Artificial Intelligence',
    'Web Development',
    'App Development',
    'Game Development',
    'FinTech',
    'HealthTech',
    'EdTech',
    'Sustainability',
    'Robotics',
    'Open Source',
    'Cybersecurity',
    'Blockchain',
    'Data Analytics',
    'Startups',
    'Entrepreneurship',
    'UI/UX Design',
    'Social Impact',
    'Research',
    'Hackathons',
    'Cloud Computing',
    'Machine Learning',
    'Internet of Things',
    'Graphic Design',
    'Competitive Programming',
    'AR/VR',
    'Product Development',
    'Community Building',
    'Technology',
    'App Security',
    'Open Source Development',
    'Digital Marketing',
    'Entrepreneurship',
    'FinTech Innovation',
    'Game Design',
    'Automation',
    'Social Entrepreneurship'
  ];

  const roleOptions = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'UI/UX Designer',
    'App Developer',
    'AI/ML Engineer',
    'Data Scientist',
    'Data Analyst',
    'Cloud Engineer',
    'Cybersecurity Engineer',
    'Blockchain Developer',
    'Researcher',
    'Project Manager',
    'Product Designer',
    'Business Strategist',
    'Pitch Presenter',
    'Content Writer',
    'QA Tester',
    'DevOps Engineer',
    'Database Administrator',
    'Mobile App Developer',
    'Game Developer',
    'Marketing Lead',
    'Team Leader',
    'Frontend Designer',
    'Backend Engineer',
    'Business Analyst',
    'Technical Writer',
    'Public Relations',
    'Video Editor',
    'Graphic Designer',
    'Machine Learning Engineer',
    'Software Tester',
    'Cloud Architect',
    'Data Engineer',
    'Research Assistant',
    'Community Manager',
    'Product Manager',
    'Hardware Engineer',
    'Robotics Engineer'
  ];

  // ==========================================
  // ARRAY HELPERS
  // ==========================================

  function cleanList(values) {
    if (!Array.isArray(values)) return [];

    const result = [];

    values.forEach((item) => {
      let value = '';

      if (typeof item === 'string') {
        value = item.trim();
      } else if (item && typeof item.name === 'string') {
        value = item.name.trim();
      }

      if (
        value &&
        !result.some(
          (existing) => existing.toLowerCase() === value.toLowerCase()
        )
      ) {
        result.push(value);
      }
    });

    return result;
  }

  function hasValue(list, value) {
    return list.some(
      (item) => item.toLowerCase() === value.toLowerCase()
    );
  }

  function addValue(list, value) {
    const clean = String(value || '').trim();

    if (!clean || hasValue(list, clean)) return false;

    if (clean.includes(',')) {
      window.alert('Please enter one item at a time without commas.');
      return false;
    }

    list.push(clean);
    return true;
  }

  function removeValue(list, value) {
    const index = list.findIndex(
      (item) => item.toLowerCase() === value.toLowerCase()
    );

    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  function replaceList(target, values) {
    target.splice(0, target.length, ...cleanList(values));
  }

  // ==========================================
  // HIDDEN FORM FIELDS
  // ==========================================

  function syncHiddenFields() {
    const skills = HM.$('#e-skills');
    const interests = HM.$('#e-int');
    const roles = HM.$('#e-roles');

    if (skills) skills.value = selectedSkills.join(', ');
    if (interests) interests.value = selectedInterests.join(', ');
    if (roles) roles.value = selectedRoles.join(', ');
  }

  // ==========================================
  // BUBBLE RENDERING
  // ==========================================

  function renderPicker(
    optionsId,
    selectedId,
    options,
    selected,
    className
  ) {
    const optionsContainer = HM.$('#' + optionsId);
    const selectedContainer = HM.$('#' + selectedId);

    if (!optionsContainer || !selectedContainer) return;

    // SELECTED BUBBLES

    if (selected.length) {
      selectedContainer.innerHTML = selected.map((item) => `
        <button
          type="button"
          class="${className} selected"
          data-remove-value="${e(item)}"
          aria-label="Remove ${e(item)}"
        >
          ${e(item)}
          <span class="bubble-remove" aria-hidden="true">×</span>
        </button>
      `).join('');
    } else {
      selectedContainer.innerHTML =
        '<span class="bubble-empty">Nothing selected yet. Choose below!</span>';
    }

    // AVAILABLE BUBBLES

    const available = options.filter(
      (item) => !hasValue(selected, item)
    );

    if (!available.length) {
      optionsContainer.innerHTML =
        '<p class="muted">All available options selected. You can still add your own.</p>';
      return;
    }

    optionsContainer.innerHTML = available.map((item) => `
      <button
        type="button"
        class="${className}"
        data-add-value="${e(item)}"
        aria-pressed="false"
      >
        ${e(item)}
      </button>
    `).join('');
  }

  function renderAllPickers() {
    const skillNames = skillCatalog.map((item) => item.name);

    renderPicker(
      'skillOptions',
      'skillSelected',
      skillNames,
      selectedSkills,
      'skill-option'
    );

    renderPicker(
      'interestOptions',
      'interestSelected',
      interestOptions,
      selectedInterests,
      'interest-option'
    );

    renderPicker(
      'roleOptions',
      'roleSelected',
      roleOptions,
      selectedRoles,
      'role-option'
    );

    syncHiddenFields();
  }

  // ==========================================
  // LOAD SKILLS FROM DATABASE
  // ==========================================

  async function loadSkillCatalog() {
    const container = HM.$('#skillOptions');

    if (skillCatalog.length) {
      renderAllPickers();
      return;
    }

    if (container) {
      container.innerHTML =
        '<p class="muted">Loading skills...</p>';
    }

    try {
      const result = await HM.api.getSkills();

      skillCatalog = Array.isArray(result)
        ? result
            .filter((item) => item && item.name)
            .map((item) => ({
              id: item.id,
              name: item.name.trim()
            }))
        : [];

      renderAllPickers();

    } catch (err) {
      console.error('Could not load skills:', err);

      skillCatalog = [];

      if (container) {
        container.innerHTML =
          '<p class="muted">Could not load suggested skills. You can still add your own.</p>';
      }

      renderAllPickers();
    }
  }

  // ==========================================
  // PICKER CLICK EVENTS
  // ==========================================

  function setupPicker(
    pickerId,
    optionsId,
    selectedId,
    selected,
    className
  ) {
    const picker = HM.$('#' + pickerId);

    if (!picker) return;

    picker.addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-add-value]');
      const removeButton = event.target.closest('[data-remove-value]');

      if (addButton && picker.contains(addButton)) {
        const value = addButton.dataset.addValue;

        if (addValue(selected, value)) {
          renderAllPickers();
        }

        return;
      }

      if (removeButton && picker.contains(removeButton)) {
        const value = removeButton.dataset.removeValue;

        removeValue(selected, value);
        renderAllPickers();
      }
    });
  }

  setupPicker(
    'skillPicker',
    'skillOptions',
    'skillSelected',
    selectedSkills,
    'skill-option'
  );

  setupPicker(
    'interestPicker',
    'interestOptions',
    'interestSelected',
    selectedInterests,
    'interest-option'
  );

  setupPicker(
    'rolePicker',
    'roleOptions',
    'roleSelected',
    selectedRoles,
    'role-option'
  );

  // ==========================================
  // CUSTOM BUBBLE INPUTS
  // ==========================================

  function setupCustomInput(inputId, buttonId, selected) {
    const input = HM.$('#' + inputId);
    const button = HM.$('#' + buttonId);

    if (!input || !button) return;

    function addCustom() {
      const value = input.value.trim();

      if (!value) {
        input.focus();
        return;
      }

      if (addValue(selected, value)) {
        input.value = '';
        renderAllPickers();
      } else if (hasValue(selected, value)) {
        input.value = '';
      } else {
        input.focus();
      }
    }

    button.addEventListener('click', addCustom);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCustom();
      }
    });
  }

  setupCustomInput('customSkill', 'addCustomSkill', selectedSkills);
  setupCustomInput('customInterest', 'addCustomInterest', selectedInterests);
  setupCustomInput('customRole', 'addCustomRole', selectedRoles);

  // ==========================================
  // PROFILE LINKS
  // ==========================================

  const link = (icon, label, url) => {
    const u = HM.safeUrl(url);

    return u
      ? `<a class="link-row" href="${e(u)}"
           target="_blank" rel="noopener noreferrer">
           ${HM.icon(icon)}
           <span>${label}</span>
         </a>`
      : `<div class="link-row muted">
           ${HM.icon(icon)}
           <span>${label}: not added</span>
         </div>`;
  };

  // ==========================================
  // RENDER PROFILE
  // ==========================================

  function render() {
    const u = current;

    box.innerHTML = `
      <div class="profile-card">

        <div class="profile-banner">
          <div class="banner-decoration"></div>
        </div>

        <div class="profile-head">

          <div class="profile-avatar">
            ${HM.avatar(u, 'avatar-lg')}
          </div>

          <div class="profile-identity">
            <h1>${e(u.name)}</h1>

            <div class="profile-meta">
              <span>${e(u.campus)}</span>
              <span class="meta-dot">·</span>
              <span>${e(u.branch)}</span>
              <span class="meta-dot">·</span>
              <span>Year ${e(u.year)}</span>
            </div>
          </div>

          <div class="profile-actions">
            ${
              isMe
                ? `<button class="btn btn-primary" id="editBtn">
                     ${HM.icon('edit')}
                     Edit profile
                   </button>`
                : `
                  <button class="btn btn-primary" id="reqBtn">
                    ${HM.icon('send')}
                    Send team request
                  </button>
                  <button class="btn btn-ghost" id="reportBtn">
                    Report
                  </button>
                `
            }
          </div>

        </div>
      </div>

      <div class="profile-cols">

        <div class="stack">

          <section class="card profile-section">
            <h3>About</h3>
            <p>${e(u.bio) || '<span class="muted">No bio added yet.</span>'}</p>
          </section>

          <section class="card profile-section">
            <h3>Skills</h3>
            ${
              (u.skills || []).length
                ? HM.chips(u.skills)
                : '<p class="muted">No skills added yet.</p>'
            }
          </section>

          <section class="card profile-section">
            <h3>Interests</h3>
            ${
              (u.interests || []).length
                ? HM.chips(u.interests, 'teal')
                : '<p class="muted">No interests added yet.</p>'
            }
          </section>

          <section class="card profile-section">
            <h3>Experience</h3>
            ${
              u.experience_text
                ? `<p>${e(u.experience_text)}</p>`
                : '<p class="muted">No experience added yet.</p>'
            }
          </section>

        </div>

        <div class="stack">

          <section class="card profile-section">
            <h3>Open to</h3>

            ${
              (u.preferred_roles || []).length
                ? HM.chips(u.preferred_roles, 'sun')
                : '<p class="muted">No preferred roles.</p>'
            }

            <p class="small muted profile-status">
              ${
                u.looking_for_team
                  ? 'Currently looking for a team.'
                  : 'Not looking for a team right now.'
              }
            </p>
          </section>

          <section class="card profile-section">
            <h3>Links</h3>
            ${link('github', 'GitHub', u.github_url)}
            ${link('linkedin', 'LinkedIn', u.linkedin_url)}
          </section>

        </div>
      </div>
    `;

    // EDIT PROFILE

    const eb = HM.$('#editBtn');

    if (eb) {
      eb.addEventListener('click', openEdit);
    }

    // REPORT PROFILE

    const rp = HM.$('#reportBtn');

    if (rp) {
      rp.addEventListener('click', () => {
        window.__openRep = window.__openRep || HM.initReportModal();

        window.__openRep(
          `Report ${u.name}`,
          { target_type: 'user', target_id: u.id }
        );
      });
    }

    // SEND TEAM REQUEST

    const rb = HM.$('#reqBtn');

    if (rb) {
      rb.addEventListener('click', () => {
        window.__openReq = window.__openReq || HM.initRequestModal();

        window.__openReq(
          `To ${u.name}`,
          { receiver_id: u.id, type: 'team_up' }
        );
      });
    }
  }

  // ==========================================
  // EDIT PROFILE MODAL
  // ==========================================

  async function openEdit() {
    const f = HM.$('#editForm');
    const u = current;

    f.elements.name.value = u.name || '';

    const campusSelect = f.elements.campus_id;

    campusSelect.innerHTML =
      '<option value="">Loading colleges…</option>';

    HM.api.getCampuses()
      .then((campuses) => {
        HM.fillSelect(campusSelect, campuses, {
          placeholder: 'Select your college',
          labelKey: 'short_name'
        });

        campusSelect.value = String(u.campus_id || '');
      })
      .catch(() => {
        campusSelect.innerHTML =
          '<option value="">Could not load colleges</option>';
      });

    f.elements.branch.value = u.branch || '';
    f.elements.year.value = u.year || '1';
    f.elements.bio.value = u.bio || '';

    replaceList(selectedSkills, u.skills);
    replaceList(selectedInterests, u.interests);
    replaceList(selectedRoles, u.preferred_roles);

    renderAllPickers();

    f.elements.experience_text.value = u.experience_text || '';

    f.elements.github_url.value = u.github_url || '';
    f.elements.linkedin_url.value = u.linkedin_url || '';

    f.elements.looking_for_team.checked = !!u.looking_for_team;

    await loadSkillCatalog();

    HM.openModal('editModal');
  }

  // ==========================================
  // SAVE PROFILE
  // ==========================================

  HM.$('#editForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const f = ev.target;

    syncHiddenFields();

    const v = HM.validate(f, {
      campus_id: [
        HM.rules.required('Select your college.')
      ],
      name: [
        HM.rules.required(),
        HM.rules.minLen(2)
      ],
      branch: [
        HM.rules.required()
      ],
      year: [
        HM.rules.required()
      ],
      bio: [
        HM.rules.maxLen(500)
      ],
      experience_text: [
        HM.rules.maxLen(500)
      ],
      github_url: [
        HM.rules.url('github.com')
      ],
      linkedin_url: [
        HM.rules.url('linkedin.com')
      ]
    });

    if (!v) return;

    const payload = {
      campus_id: Number(v.campus_id),
      name: v.name,
      branch: v.branch,
      year: Number(v.year),
      bio: v.bio,
      skills: cleanList(selectedSkills),
      interests: cleanList(selectedInterests),
      preferred_roles: cleanList(selectedRoles),
      experience_text: v.experience_text,
      github_url: v.github_url,
      linkedin_url: v.linkedin_url,
      looking_for_team: v.looking_for_team
    };

    const btn = HM.$('button[type=submit]', f);

    HM.setLoading(btn, true);

    try {
      const res = await HM.api.updateProfile(payload);

      current = res && res.id
        ? res
        : { ...current, ...payload };

      const navCampus = HM.$('#navCampus');

      if (navCampus) {
        navCampus.textContent = current.campus || '';
      }

      render();

      HM.closeModal('editModal');
      HM.toastResult(res, 'Profile updated');

    } catch (err) {
      HM.toastError(err);

    } finally {
      HM.setLoading(btn, false);
    }
  });

  // ==========================================
  // LOAD PROFILE
  // ==========================================

  async function load() {
    box.innerHTML = HM.skeletons(2, 220);

    try {
      current = await HM.api.getProfile(id);
      isMe = !id;
      render();

    } catch (err) {
      box.innerHTML = HM.errorState(err);
    }
  }

  // RETRY LOADING

  document.addEventListener('click', (ev) => {
    if (ev.target.id === 'retryBtn') {
      load();
    }
  });

  load();

})(window.HM);
