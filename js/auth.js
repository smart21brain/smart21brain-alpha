/* Smart21Brain — Auth forms
   Login and registration now call the real /api/auth endpoints (Cloudflare
   Pages Functions + D1). Other demo forms below still show local-only
   feedback until wired to a backend. */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.needs-validation').forEach((form) => {
      form.addEventListener('submit', (e) => {
        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
        }
        form.classList.add('was-validated');
      }, false);
    });

    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.querySelector(btn.dataset.togglePassword);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.querySelector('i')?.classList.toggle('fa-eye');
        btn.querySelector('i')?.classList.toggle('fa-eye-slash');
      });
    });

    /* Demo-only submit flows. There is no real backend yet, so these just
       give honest, smooth feedback instead of the browser's default full
       page reload (which would otherwise happen on a valid form with no
       submit handler and no `action` attribute). */
    function withSpinner(btn, busyLabel) {
      const original = btn.innerHTML;
      btn.classList.add('is-loading');
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${busyLabel}`;
      return () => { btn.classList.remove('is-loading'); btn.innerHTML = original; };
    }
    function t(key, fallback) { return (window.S21_t ? window.S21_t(key) : null) || fallback; }

    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) { loginForm.classList.add('was-validated'); return; }
      const btn = loginForm.querySelector('button[type="submit"]');
      const restore = withSpinner(btn, t('runtime_logging_in', 'Logging in…'));
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Login failed.');
          const user = data.user || null;
          const role = String((user && user.role) || 'user').toLowerCase();
          const roleMap = {
            admin: 'admin.html',
            teacher: 'teachers.html',
            parent: 'parents.html',
            user: 'dashboard.html',
          };
          // A ?next= page (e.g. the course a learner tried to enrol in)
          // takes priority over the role dashboard. Same-site paths only.
          let nextPage = '';
          try {
            const raw = new URLSearchParams(window.location.search).get('next') || '';
            if (raw && !/^[a-z]+:|^\/\//i.test(raw)) nextPage = raw;
          } catch { /* ignore a malformed query string */ }
          const targetPage = nextPage || roleMap[role] || 'dashboard.html';
          restore();
          try {
            localStorage.setItem('s21-onboarded', '1');
            localStorage.removeItem('s21-needs-onboarding');
            // Hand the real destination (role-specific dashboard) and the
            // user's name off to welcome.html, which is a one-time stop
            // between login and the dashboard for every role, admin included.
            sessionStorage.setItem('s21-welcome-dashboard', targetPage);
            if (user && user.name) sessionStorage.setItem('s21-welcome-name', user.name);
          } catch (storageError) { /* continue if storage is unavailable */ }
          const welcomeMessage = role === 'admin'
            ? 'Welcome back, Admin!'
            : role === 'teacher'
              ? 'Welcome back, Teacher!'
              : role === 'parent'
                ? 'Welcome back, Parent!'
                : 'Welcome back!';
          window.S21_toast?.(t('runtime_welcome_back_toast', welcomeMessage));
          setTimeout(() => { window.location.href = 'welcome.html'; }, 700);
        })
        .catch((err) => {
          restore();
          window.S21_toast?.(err.message || 'Something went wrong. Please try again.');
        });
    });

    // Registration profile-photo picker: live preview + client-side checks
    // (the server enforces the same limits, this just gives fast feedback).
    const regAvatarInput = document.getElementById('reg-avatar');
    const regAvatarPreview = document.getElementById('reg-avatar-preview');
    const regAvatarPlaceholder = document.getElementById('reg-avatar-placeholder');
    const regAvatarError = document.getElementById('reg-avatar-error');
    const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
    regAvatarInput?.addEventListener('change', () => {
      const file = regAvatarInput.files?.[0];
      if (regAvatarError) { regAvatarError.textContent = ''; regAvatarError.classList.add('d-none'); }
      if (!file) return;
      if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        regAvatarInput.value = '';
        if (regAvatarError) { regAvatarError.textContent = t('runtime_avatar_type_error', 'Please choose a PNG, JPG, WEBP or GIF image.'); regAvatarError.classList.remove('d-none'); }
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        regAvatarInput.value = '';
        if (regAvatarError) { regAvatarError.textContent = t('runtime_avatar_size_error', 'That photo is too large (5MB max).'); regAvatarError.classList.remove('d-none'); }
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (regAvatarPreview) { regAvatarPreview.src = reader.result; regAvatarPreview.classList.remove('d-none'); }
        regAvatarPlaceholder?.classList.add('d-none');
      };
      reader.readAsDataURL(file);
    });

    // Registration role tabs: show the admin invite-code field only when
    // "Admin" is selected.
    const regAdminCodeWrap = document.getElementById('reg-admin-code-wrap');
    document.querySelectorAll('.auth-role-tabs input[name="role"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        regAdminCodeWrap?.classList.toggle('d-none', radio.value !== 'admin' || !radio.checked);
      });
    });

    const registerForm = document.getElementById('register-form');
    registerForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!registerForm.checkValidity()) { registerForm.classList.add('was-validated'); return; }
      const btn = registerForm.querySelector('button[type="submit"]');
      const restore = withSpinner(btn, t('runtime_creating_account', 'Creating account…'));
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const avatarFile = document.getElementById('reg-avatar')?.files?.[0] || null;
      const role = document.querySelector('.auth-role-tabs input[name="role"]:checked')?.value || 'user';
      const adminCode = document.getElementById('reg-admin-code')?.value || '';

      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('role', role);
      if (role === 'admin') formData.append('admin_code', adminCode);
      if (avatarFile) formData.append('avatar', avatarFile);

      fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Registration failed.');
          restore();
          try { localStorage.setItem('s21-needs-onboarding', '1'); } catch (storageError) { /* continue if storage is unavailable */ }
          window.S21_toast?.(t('runtime_account_created_toast', 'Account created! Let\'s set things up…'));
          setTimeout(() => { window.location.href = 'onboarding.html'; }, 700);
        })
        .catch((err) => {
          restore();
          window.S21_toast?.(err.message || 'Something went wrong. Please try again.');
        });
    });

    const accountDetailsForm = document.getElementById('account-details-form');
    if (accountDetailsForm) {
      fetch('/api/account/profile', { credentials: 'include' })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (!data?.user) return;
          document.getElementById('profile-name').value = data.user.name;
          document.getElementById('profile-email').value = data.user.email;
          const nameDisplay = document.getElementById('profile-name-display');
          if (nameDisplay && data.user.name) nameDisplay.textContent = data.user.name;
          const avatarImg = document.getElementById('profile-avatar-img');
          if (avatarImg && data.user.avatar_key) {
            avatarImg.src = `/api/avatar/${encodeURIComponent(data.user.id)}`;
          }
          if (avatarImg && data.user.name) {
            avatarImg.alt = `${data.user.name}'s profile picture`;
          }
        })
        .catch(() => {});
    }

    // "Change photo" on the profile page: click the visible button to
    // open a hidden file picker, then upload the chosen image right away.
    const changePhotoBtn = document.getElementById('profile-change-photo-btn');
    const profileAvatarInput = document.getElementById('profile-avatar-input');
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    const profileAvatarError = document.getElementById('profile-avatar-error');
    changePhotoBtn?.addEventListener('click', () => profileAvatarInput?.click());
    profileAvatarInput?.addEventListener('change', async () => {
      const file = profileAvatarInput.files?.[0];
      if (profileAvatarError) { profileAvatarError.textContent = ''; profileAvatarError.classList.add('d-none'); }
      if (!file) return;

      const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
      if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        profileAvatarInput.value = '';
        if (profileAvatarError) { profileAvatarError.textContent = t('runtime_avatar_type_error', 'Please choose a PNG, JPG, WEBP or GIF image.'); profileAvatarError.classList.remove('d-none'); }
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        profileAvatarInput.value = '';
        if (profileAvatarError) { profileAvatarError.textContent = t('runtime_avatar_size_error', 'That photo is too large (5MB max).'); profileAvatarError.classList.remove('d-none'); }
        return;
      }

      const restore = changePhotoBtn ? withSpinner(changePhotoBtn, t('runtime_uploading', 'Uploading…')) : null;
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await fetch('/api/account/avatar', { method: 'POST', credentials: 'include', body: formData });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not update your photo.');
        if (profileAvatarImg && data.user) {
          profileAvatarImg.src = `/api/avatar/${encodeURIComponent(data.user.id)}?t=${Date.now()}`;
        }
        window.S21_toast?.(t('runtime_photo_updated_toast', 'Profile photo updated.'));
      } catch (error) {
        window.S21_toast?.(error.message);
      } finally {
        restore?.();
        profileAvatarInput.value = '';
      }
    });

    accountDetailsForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!accountDetailsForm.checkValidity()) { accountDetailsForm.classList.add('was-validated'); return; }
      const btn = accountDetailsForm.querySelector('button[type="submit"]');
      const restore = withSpinner(btn, t('runtime_saving', 'Saving…'));
      try {
        const response = await fetch('/api/account/profile', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: document.getElementById('profile-name').value, email: document.getElementById('profile-email').value }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not save changes.');
        const nameDisplay = document.getElementById('profile-name-display');
        if (nameDisplay) nameDisplay.textContent = document.getElementById('profile-name').value;
        window.S21_toast?.(t('runtime_changes_saved_toast', 'Changes saved.'));
      } catch (error) { window.S21_toast?.(error.message); } finally { restore(); }
    });

    const updatePasswordForm = document.getElementById('update-password-form');
    updatePasswordForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!updatePasswordForm.checkValidity()) { updatePasswordForm.classList.add('was-validated'); return; }
      const btn = updatePasswordForm.querySelector('button[type="submit"]');
      const restore = withSpinner(btn, t('runtime_saving', 'Saving…'));
      try {
        const response = await fetch('/api/account/password', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: document.getElementById('profile-current-password').value, newPassword: document.getElementById('profile-new-password').value }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not update password.');
        window.S21_toast?.(t('runtime_password_updated_toast', 'Password updated.'));
        updatePasswordForm.reset();
      } catch (error) { window.S21_toast?.(error.message); } finally { restore(); }
    });

    document.querySelectorAll('[data-logout]').forEach((logoutLink) => {
      logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        logoutLink.setAttribute('aria-disabled', 'true');
        logoutLink.style.pointerEvents = 'none';
        try {
          const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
          if (!response.ok) throw new Error('Could not log out. Please try again.');
          window.location.href = logoutLink.href || 'login.html';
        } catch (error) {
          logoutLink.removeAttribute('aria-disabled');
          logoutLink.style.pointerEvents = '';
          window.S21_toast?.(error.message);
        }
      });
    });
  });
})();
