/* Smart21Brain — Social sign-in (Google / Apple)
   ---------------------------------------------------------------------
   This is a static demo site with no backend, so real OAuth cannot be
   completed here yet. This file IS wired to work for real as soon as
   you plug in your own credentials below:

   1. GOOGLE — create an OAuth Client ID (type: "Web application") at
      https://console.cloud.google.com/apis/credentials
      Add your real domain under "Authorized JavaScript origins".
      Paste the Client ID into GOOGLE_CLIENT_ID below.

   2. APPLE — create a Services ID at
      https://developer.apple.com/account/resources/identifiers/list/serviceId
      Enable "Sign in with Apple", register your domain + a redirect URL
      that points at an endpoint on YOUR backend (Apple posts the result
      there). Paste the Services ID into APPLE_CLIENT_ID and the redirect
      URL into APPLE_REDIRECT_URI below.

   In both cases, the token/credential Google or Apple hands back must be
   verified on your SERVER before you trust it or create a session —
   never accept it as proof of identity purely in the browser.

   Until real credentials are added, these buttons should not redirect the
   user into a protected page. They must stay on the login screen and ask
   the user to sign in with a real account. */
(function () {
  const APPLE_CLIENT_ID = '';  // e.g. 'com.smart21brain.web'
  const APPLE_REDIRECT_URI = ''; // e.g. 'https://smart21brain.com/auth/apple/callback'

  function t(key, fallback) {
    return (window.S21_t ? window.S21_t(key) : null) || fallback;
  }

  function showNotice(btn, key, fallback) {
    const holder = btn.closest('.social-auth-group') || btn.parentElement;
    let note = holder.querySelector('.social-auth-note');
    if (!note) {
      note = document.createElement('p');      
      note.className = 'social-auth-note text-soft text-center';
      note.style.cssText = 'font-size:.75rem;margin:.6rem 0 0';
      holder.appendChild(note);
    }
    note.textContent = t(key, fallback);
  }

  function waitForGoogle() {
    return new Promise((resolve) => {
      const started = Date.now();
      const check = () => {
        if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
        if (Date.now() - started > 8000) return resolve(null);
        setTimeout(check, 100);
      };
      check();
    });
  }

  async function initGoogle(btn) {
    let config;
    try {
      const response = await fetch('/api/auth/google/config');
      config = response.ok ? await response.json() : null;
    } catch (error) { config = null; }
    const googleId = config?.clientId;
    const google = await waitForGoogle();
    if (!googleId || !google) {
      btn.addEventListener('click', () => {
        showNotice(btn, 'login_google_not_connected', "Google sign-in isn't connected yet. Please use your email and password.");
      });
      return;
    }
    google.initialize({
      client_id: googleId,
      callback: async (response) => {
        btn.disabled = true;
        try {
          const result = await fetch('/api/auth/google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ credential: response.credential }),
          });
          const data = await result.json().catch(() => ({}));
          if (!result.ok) throw new Error(data.error || 'Google sign-in failed.');
          try {
            localStorage.setItem('s21-onboarded', '1');
            if (data.isNewUser) localStorage.setItem('s21-needs-onboarding', '1');
            if (!data.isNewUser) {
              sessionStorage.setItem('s21-welcome-dashboard', 'dashboard.html');
              if (data.user && data.user.name) sessionStorage.setItem('s21-welcome-name', data.user.name);
            }
          } catch (storageError) { /* continue if storage is unavailable */ }
          window.location.href = data.isNewUser ? 'onboarding.html' : 'welcome.html';
        } catch (error) {
          showNotice(btn, 'login_google_not_connected', error.message || 'Google sign-in failed.');
        } finally { btn.disabled = false; }
      },
    });
    btn.addEventListener('click', () => google.prompt());
  }

  function initApple(btn) {
    const ready = APPLE_CLIENT_ID && APPLE_REDIRECT_URI && window.AppleID;
    if (!ready) {
      btn.addEventListener('click', () => {
        showNotice(btn, 'login_apple_not_connected', "Apple sign-in isn't connected yet. Please use your email and password.");
        demoContinue();
      });
      return;
    }
    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: 'name email',
      redirectURI: APPLE_REDIRECT_URI,
      usePopup: true,
    });
    btn.addEventListener('click', async () => {
      try {
        const res = await window.AppleID.auth.signIn();
        // res.authorization.id_token is signed by Apple. Send it to YOUR
        // backend to verify before creating a session.
        console.log('Apple credential received — verify this server-side before trusting it', res);
        showNotice(btn, 'login_apple_not_connected', 'Apple sign-in is not connected yet. Please use your email and password.');
      } catch (e) {
        console.warn('Apple sign-in was cancelled or failed', e);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-social-auth="google"]').forEach(initGoogle);
    document.querySelectorAll('[data-social-auth="apple"]').forEach(initApple);
  });
})();
