
/* HackMate — profile.js */
(function (HM) {
  'use strict';

  HM.initPage('profile');

  const e = HM.esc;
  const box = HM.$('#profile');
  const id = new URLSearchParams(location.search).get('id');

  const LIMITS = {
    skills: 15,
    interests: 10,
    roles: 10
  };

  let current = null;
  let isMe = !id;
  let skillOptions = [];

  const INTEREST_OPTIONS = [
    'Artificial Intelligence',
    'Web Development',
    'App Development',
    'Data Science',
    'Cybersecurity',
    'Robotics',
    'Blockchain',
    'Cloud Computing',
    'Open Source',
    'UI/UX Design',
    'Entrepreneurship',
    'FinTech',
    'HealthTech',
    'Climate Tech',
    'Education Technology',
    'Game Development',
    'Research',
    'Internet of Things',
    'Competitive Programming',
    'Hackathons',
    'Open Source Contributions',
    'Social Impact',
    'AR/VR',
    'Computer Vision',
    'Natural Language Processing',
    'Automation',
    'E-commerce',
    'EdTech',
    'Web3'
  ];

  const ROLE_OPTIONS = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'UI/UX Designer',
    'ML Engineer',
    'Data Scientist',
    'AI Engineer',
    'Mobile App Developer',
    'DevOps Engineer',
    'Cybersecurity Engineer',
    'Cloud Engineer',
    'Product Manager',
    'Researcher',
    'Blockchain Developer',
    'IoT Engineer',
    'Pitch / Presentation Lead',
    'Project Manager',
    'Database Developer',
    'QA / Tester',
    'Business / Strategy',
    'Data Analyst',
    'Computer Vision Engineer',
    'Technical Writer',
    'Hardware Engineer'
  ];

  const selected = {
    skills: new Set(),
    interests: new Set(),
    roles: new Set()
  };

  const groups = [
    {
      key: 'skills',
      container: '#skillChoices',
      input: '#e-skills',
      count: '#skillCount',
      search: '#skillSearch',
      options: []
    },
    {
      key: 'interests',
      container: '#interestChoices',
      input: '#e-int',
      count: '#interestCount',
      search: '#interestSearch',
      options: INTEREST_OPTIONS.map(name => ({
        name,
        category: ''
      }))
    },
    {
      key: 'roles',
      container: '#roleChoices',
      input: '#e-roles',
      count: '#roleCount',
      search: '#roleSearch',
      options: ROLE_OPTIONS.map(name => ({
        name,
        category: ''
      }))
    }
  ];

  const CATEGORY_LABELS = {
    language: 'Programming Languages',
    frontend: 'Frontend',
    backend: 'Backend',
    data_ai: 'Data & AI',
    mobile: 'Mobile',
    design: 'Design',
    devops: 'DevOps',
    other: 'Other Skills'
  };

  function asList(value) {
    if (Array.isArray(value)) {
      return value
        .map(String)
        .map(s => s.trim())
        .filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }

    return [];
  }

  function link(icon, label, url) {
    const u = HM.safeUrl(url);

    return u
      ? `<a class="link-row" href="${e(u)}" target="_blank" rel="noopener noreferrer">${HM.icon(icon)}${label}</a>`
      : `<div class="link-row muted">${HM.icon(icon)}${label}: not added</div>`;
  }

  function getGroup(key) {
    return groups.find(group => group.key === key);
  }

  function updateHiddenInput(group) {
    const input = HM.$(group.input);

    if (input) {
      input.value = [...selected[group.key]].join(', ');
    }
  }

  function updateCount(group) {
    const count = HM.$(group.count);
    if (!count) return;

    const amount = selected[group.key].size;
    const maximum = LIMITS[group.key];

    count.textContent =
      `${amount} selected · Maximum ${maximum}`;

    count.style.color = amount >= maximum
      ? 'var(--primary, #5A3DF5)'
      : '';
  }

  function getFilteredOptions(group) {
    const searchInput = HM.$(group.search);
    const query = searchInput
      ? searchInput.value.trim().toLowerCase()
      : '';

    let options = group.options;

    if (group.key === 'skills') {
      const categoryInput = HM.$('#skillCategoryFilter');
      const category = categoryInput
        ? categoryInput.value
        : 'all';

      if (category !== 'all') {
        options = options.filter(
          option => option.category === category
        );
      }
    }

    if (query) {
      options = options.filter(option =>
        option.name.toLowerCase().includes(query)
      );
    }

    return options;
  }

  function renderChoices(group) {
    const container = HM.$(group.container);
    if (!container) return;

    const options = getFilteredOptions(group);

    if (!options.length) {
      container.innerHTML =
        '<p class="small muted">No matching options found.</p>';
    } else {
      container.innerHTML = options.map(option => {
        const name = option.name;
        const active = selected[group.key].has(name);

        const categoryLabel = option.category
          ? CATEGORY_LABELS[option.category] || option.category
          : '';

        return `
          <button
            type="button"
            class="choice-bubble"
            data-choice-group="${e(group.key)}"
            data-choice="${e(name)}"
            aria-pressed="${active ? 'true' : 'false'}"
            title="${e(categoryLabel)}"
          >${active ? '✓ ' : ''}${e(name)}</button>
        `;
      }).join('');
    }

    updateHiddenInput(group);
    updateCount(group);
  }

  function renderAllChoices() {
    groups.forEach(renderChoices);
  }

  function setSelections(key, values) {
    selected[key] = new Set(asList(values));
  }

  function addExistingOptions(group, values) {
    const existingNames = new Set(
      group.options.map(option => option.name.toLowerCase())
    );

    values.forEach(name => {
      if (!existingNames.has(name.toLowerCase())) {
        group.options.push({
          name,
          category: ''
        });

        existingNames.add(name.toLowerCase());
      }
    });
  }

  // Load the full skill catalogue from the database-backed API.
  async function loadSkills() {
    const skills = await HM.api.getSkills();

    if (!Array.isArray(skills)) {
      throw new Error('The skills API returned an unexpected response.');
    }

    skillOptions = skills.map(skill => ({
      name: String(skill.name),
      category: String(skill.category || 'other')
    }));

    const group = getGroup('skills');
    group.options = skillOptions;
  }

  // Bubble selection, with limits enforced before adding.
  groups.forEach(group => {
    const container = HM.$(group.container);
    if (!container) return;

    container.addEventListener('click', event => {
      const button = event.target.closest('[data-choice]');
      if (!button || !container.contains(button)) return;

      const value = button.dataset.choice;
      const choices = selected[group.key];

      if (choices.has(value)) {
        choices.delete(value);
      } else {
        const maximum = LIMITS[group.key];

        if (choices.size >= maximum) {
          const count = HM.$(group.count);

          if (count) {
            count.textContent =
              `Maximum ${maximum} reached. Remove one to add another.`;

            count.style.color = '#C24141';
          }

          return;
        }

        choices.add(value);
      }

      renderChoices(group);
    });
  });

  // Search as the user types.
  groups.forEach(group => {
    const search = HM.$(group.search);

    if (search) {
      search.addEventListener('input', () => {
        renderChoices(group);
      });
    }
  });

  // Filter skills by database category.
  const categoryFilter = HM.$('#skillCategoryFilter');

  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      renderChoices(getGroup('skills'));
    });
  }

  function render() {
    const u = current;

    box.innerHTML = `
      <div class="card profile-card">
        <div class="profile-banner"></div>

        <div class="profile-head">
          ${HM.avatar(u, 'avatar-lg')}

          <div style="flex:1;min-width:200px">
            <h1 style="font-size:clamp(1.6rem,3vw,2.2rem);margin:8px 0 4px">
              ${e(u.name)}
            </h1>

            <div class="muted">
              ${e(u.campus)} · ${e(u.branch)} · Year ${e(u.year)}
            </div>
          </div>

          ${isMe
            ? `<button class="btn btn-primary" id="editBtn">${HM.icon('edit')}Edit profile</button>`
            : `<button class="btn btn-primary" id="reqBtn">${HM.icon('send')}Send team request</button>
               <button class="btn btn-ghost" id="reportBtn">Report</button>`}
        </div>
      </div>

      <div class="profile-cols">
        <div class="stack">
          <section class="card">
            <h3>About</h3>
            <p style="margin:0">
              ${e(u.bio) || '<span class="muted">No bio yet.</span>'}
            </p>
          </section>

          <section class="card">
            <h3>Skills</h3>
            ${(u.skills || []).length
              ? HM.chips(u.skills)
              : '<p class="muted">No skills added.</p>'}
          </section>

          <section class="card">
            <h3>Interests</h3>
            ${(u.interests || []).length
              ? HM.chips(u.interests, 'teal')
              : '<p class="muted">No interests added.</p>'}
          </section>

          <section class="card">
            <h3>Experience</h3>
            <p style="margin:0">
              ${e(HM.labels.LEVEL[u.experience_level] || '')}
              ${u.experience_text ? ' · ' + e(u.experience_text) : ''}
            </p>
          </section>
        </div>

        <div class="stack">
          <section class="card">
            <h3>Open to</h3>

            ${(u.preferred_roles || []).length
              ? HM.chips(u.preferred_roles, 'sun')
              : '<p class="muted">No preferred roles.</p>'}

            <p class="small muted" style="margin:12px 0 0">
              ${u.looking_for_team
                ? 'Currently looking for a team.'
                : 'Not looking for a team right now.'}
            </p>
          </section>

          <section class="card">
            <h3>Links</h3>
            ${link('github', 'GitHub', u.github_url)}
            ${link('linkedin', 'LinkedIn', u.linkedin_url)}
          </section>
        </div>
      </div>
    `;

    const editButton = HM.$('#editBtn');

    if (editButton) {
      editButton.addEventListener('click', openEdit);
    }

    const reportButton = HM.$('#reportBtn');

    if (reportButton) {
      reportButton.addEventListener('click', () => {
        window.__openRep =
          window.__openRep || HM.initReportModal();

        window.__openRep(`Report ${u.name}`, {
          target_type: 'user',
          target_id: u.id
        });
      });
    }

    const requestButton = HM.$('#reqBtn');

    if (requestButton) {
      requestButton.addEventListener('click', () => {
        window.__openReq =
          window.__openReq || HM.initRequestModal();

        window.__openReq(`To ${u.name}`, {
          receiver_id: u.id,
          type: 'team_up'
        });
      });
    }
  }

  function openEdit() {
    const form = HM.$('#editForm');
    const u = current;

    form.elements.name.value = u.name || '';
    form.elements.branch.value = u.branch || '';
    form.elements.year.value = u.year || 1;
    form.elements.bio.value = u.bio || '';

    setSelections('skills', u.skills);
    setSelections('interests', u.interests);
    setSelections('roles', u.preferred_roles);

    // Preserve any previously saved interests or roles.
    addExistingOptions(getGroup('interests'), asList(u.interests));
    addExistingOptions(getGroup('roles'), asList(u.preferred_roles));

    groups.forEach(group => {
      const search = HM.$(group.search);
      if (search) search.value = '';
    });

    if (categoryFilter) categoryFilter.value = 'all';

    renderAllChoices();

    form.elements.experience_level.value =
      u.experience_level || 'beginner';

    form.elements.experience_text.value =
      u.experience_text || '';

    form.elements.github_url.value =
      u.github_url || '';

    form.elements.linkedin_url.value =
      u.linkedin_url || '';

    form.elements.looking_for_team.checked =
      !!u.looking_for_team;

    HM.openModal('editModal');
  }

  HM.$('#editForm').addEventListener('submit', async event => {
    event.preventDefault();

    const form = event.target;

    if (
      selected.skills.size > LIMITS.skills ||
      selected.interests.size > LIMITS.interests ||
      selected.roles.size > LIMITS.roles
    ) {
      HM.toastError(
        new Error('Please check the selection limits before saving.')
      );
      return;
    }

    const values = HM.validate(form, {
      name: [HM.rules.required(), HM.rules.minLen(2)],
      branch: [HM.rules.required()],
      year: [HM.rules.required()],
      bio: [HM.rules.maxLen(500)],
      github_url: [HM.rules.url('github.com')],
      linkedin_url: [HM.rules.url('linkedin.com')]
    });

    if (!values) return;
    const payload = {
  name: values.name,
  branch: values.branch,
  year: Number(values.year),
  bio: values.bio,
  skills: [...selected.skills],
  interests: [...selected.interests],
  preferred_roles: [...selected.roles],

  experience_level: form.elements.experience_level.value,
  experience_text: form.elements.experience_text.value.trim(),

  github_url: form.elements.github_url.value.trim(),
  linkedin_url: form.elements.linkedin_url.value.trim(),
  looking_for_team: form.elements.looking_for_team.checked
};

console.log('HackMate profile payload:', payload);

    const button = HM.$('button[type=submit]', form);
    HM.setLoading(button, true);

    try {
      const result = await HM.api.updateProfile(payload);

      current = await HM.api.getProfile();
      isMe = true;

      render();

      HM.closeModal('editModal');
      HM.toastResult(result, 'Profile updated');
    } catch (error) {
      HM.toastError(error);
    } finally {
      HM.setLoading(button, false);
    }
  });

  async function load() {
    box.innerHTML = HM.skeletons(2, 220);

    try {
      current = await HM.api.getProfile(id);
      isMe = !id;

      if (isMe) {
        await loadSkills();
      }

      render();
    } catch (error) {
      box.innerHTML = HM.errorState(error);
    }
  }

  document.addEventListener('click', event => {
    if (event.target.id === 'retryBtn') {
      load();
    }
  });

  load();
})(window.HM);
