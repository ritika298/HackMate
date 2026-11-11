
/* HackMate — Premium Profile Page */
(function (HM) {
  'use strict';

  HM.initPage('profile');

  const e = HM.esc;
  const box = HM.$('#profile');
  const id = new URLSearchParams(location.search).get('id');

  let current = null;
  let isMe = !id;

  // Profile links
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

  // Render profile
  function render() {
    const u = current;

    box.innerHTML = `
      <div class="profile-card">

        <!-- Gradient banner -->
        <div class="profile-banner">
          <div class="banner-decoration"></div>
        </div>

        <!-- Profile header -->
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

      <!-- Profile information -->
      <div class="profile-cols">

        <!-- Left column -->
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
            <p>
              ${e(HM.labels.LEVEL[u.experience_level] || '')}
              ${u.experience_text ? ' · ' + e(u.experience_text) : ''}
            </p>
          </section>

        </div>

        <!-- Right column -->
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

    // Edit profile
    const eb = HM.$('#editBtn');
    if (eb) eb.addEventListener('click', openEdit);

    // Report profile
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

    // Send team request
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

  // Edit profile modal
  function openEdit() {
    const f = HM.$('#editForm');
    const u = current;

    f.elements.name.value = u.name;

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

    f.elements.branch.value = u.branch;
    f.year.value = u.year;
    f.bio.value = u.bio || '';

    f.skills.value = (u.skills || []).join(', ');
    f.interests.value = (u.interests || []).join(', ');
    f.preferred_roles.value =
      (u.preferred_roles || []).join(', ');

    f.experience_level.value = u.experience_level;
    f.experience_text.value = u.experience_text || '';

    f.github_url.value = u.github_url || '';
    f.linkedin_url.value = u.linkedin_url || '';

    f.looking_for_team.checked = !!u.looking_for_team;

    HM.openModal('editModal');
  }

  // Save profile
  HM.$('#editForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const f = ev.target;

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
      skills: HM.csv(v.skills),
      interests: HM.csv(v.interests),
      preferred_roles: HM.csv(v.preferred_roles),
      experience_level: v.experience_level,
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

  // Load profile
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

  // Retry loading
  document.addEventListener('click', (ev) => {
    if (ev.target.id === 'retryBtn') {
      load();
    }
  });

  load();

})(window.HM);
