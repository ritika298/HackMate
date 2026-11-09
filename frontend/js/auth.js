
/* HackMate — auth.js (login.html + signup.html)
 * Login redirects users according to their database role.
 * Signup continues to redirect new students to the student dashboard.
 */
(function (HM) {
  'use strict';

  const page = document.body.dataset.page;
  HM.initPage(page);

  function showFormError(form, msg) {
    const b = HM.$('.form-error', form);
    b.textContent = msg;
    b.classList.toggle('hidden', !msg);
  }

  function applyServerFields(form, fields) {
    Object.entries(fields || {}).forEach(([n, m]) => {
      const el = form.elements[n];
      const f = el && el.closest('.field');

      if (f) {
        f.classList.add('invalid');
        HM.$('.field-error', f).textContent = m;
      }
    });
  }

  /* ---------- signup ---------- */
  const signup = HM.$('#signupForm');

  if (signup) {
    HM.api.getCampuses()
      .then((c) => HM.fillSelect(
        signup.elements.campus_id,
        c,
        { placeholder: 'Select your campus', labelKey: 'short_name' }
      ))
      .catch(() => {});

    HM.fillSelect(
      signup.elements.year,
      [1, 2, 3, 4, 5].map((y) => ({
        id: y,
        name: 'Year ' + y
      })),
      { placeholder: 'Select year' }
    );

    const meter = HM.$('#pwMeter');

    signup.elements.password.addEventListener('input', (e) => {
      const v = e.target.value;
      meter.dataset.score =
        (v.length >= 8) +
        (/[A-Z]/.test(v) && /[a-z]/.test(v)) +
        /\d/.test(v) +
        /[^A-Za-z0-9]/.test(v);
    });

    signup.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      showFormError(signup, '');

      const v = HM.validate(signup, {
        name: [
          HM.rules.required('Enter your name.'),
          HM.rules.minLen(2),
          HM.rules.maxLen(100)
        ],
        email: [
          HM.rules.required('Enter your email.'),
          HM.rules.email()
        ],
        password: [
          HM.rules.required('Choose a password.'),
          HM.rules.password()
        ],
        confirm_password: [
          HM.rules.required('Confirm your password.'),
          HM.rules.matches('password')
        ],
        campus_id: [
          HM.rules.required('Select your campus.')
        ],
        branch: [
          HM.rules.required('Enter your branch.'),
          HM.rules.maxLen(100)
        ],
        year: [
          HM.rules.required('Select your year.')
        ]
      });

      if (!v) return;

      const btn = HM.$('button[type=submit]', signup);
      HM.setLoading(btn, true);

      try {
        await HM.api.signup(v);

        // Newly registered accounts go to the student dashboard.
        window.location.href = HM.pageUrl('dashboard.html');

      } catch (err) {
        showFormError(signup, err.message);
        applyServerFields(signup, err.fields);

      } finally {
        HM.setLoading(btn, false);
      }
    });
  }

  /* ---------- login ---------- */
  const login = HM.$('#loginForm');

  if (login) {
    login.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      showFormError(login, '');

      const v = HM.validate(login, {
        email: [
          HM.rules.required('Enter your email.'),
          HM.rules.email()
        ],
        password: [
          HM.rules.required('Enter your password.')
        ]
      });

      if (!v) return;

      v.remember = login.elements.remember.checked;

      const btn = HM.$('button[type=submit]', login);
      HM.setLoading(btn, true);

      try {
        // Backend returns the actual database user and role.
        const result = await HM.api.login(v);
        const role = result?.user?.role;

        if (role === 'admin') {
          window.location.href = HM.pageUrl('admin.html');
        } else if (role === 'student') {
          window.location.href = HM.pageUrl('dashboard.html');
        } else {
          showFormError(login, 'Could not verify your account role. Please contact support.');
        }

      } catch (err) {
        showFormError(login, err.message);

      } finally {
        HM.setLoading(btn, false);
      }
    });

    // Forgot password
    HM.$('#forgotLink').addEventListener('click', (e) => {
      e.preventDefault();
      HM.openModal('forgotModal');
    });

    const forgot = HM.$('#forgotForm');

    forgot.addEventListener('submit', async (ev) => {
      ev.preventDefault();

      const v = HM.validate(forgot, {
        email: [
          HM.rules.required('Enter your email.'),
          HM.rules.email()
        ]
      });

      if (!v) return;

      try {
        await HM.api.requestPasswordReset(v.email);
        HM.closeModal('forgotModal');
        HM.toast(
          'If that email exists, a reset link is on its way.',
          'success'
        );

      } catch (err) {
        HM.toastError(err);
      }
    });
  }

})(window.HM);
