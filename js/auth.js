/**
 * BYPASSFX — Authentication Engine (Phase 2)
 * Connects frontend auth flows to Express.js + MongoDB API via BypassAPI
 * with real JWT authentication, bcrypt password security, and real Google Sign-In.
 */

(function () {
  "use strict";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ----------------------------------------------------------------
  // DOM Helpers
  // ----------------------------------------------------------------
  function $(id) {
    return document.getElementById(id);
  }

  function setError(fieldId, message) {
    const el = $("err-" + fieldId);
    const input = $(fieldId);
    if (el) el.textContent = message || "";
    if (input) input.classList.toggle("invalid", Boolean(message));
  }

  function clearErrors(ids) {
    ids.forEach((id) => setError(id, ""));
  }

  function showBanner(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = "banner show " + (type || "error");
  }

  function hideBanner(el) {
    if (!el) return;
    el.className = "banner";
    el.textContent = "";
  }

  function setBusy(btn, busyLabel, idleLabel) {
    if (!btn) return;
    btn.disabled = Boolean(busyLabel);
    btn.textContent = busyLabel || idleLabel;
  }

  // Helper to ensure BypassAPI is loaded
  function getApi() {
    if (!window.BypassAPI) {
      console.error("BypassAPI client is not loaded. Ensure js/api.js is included.");
      return null;
    }
    return window.BypassAPI;
  }

  // ----------------------------------------------------------------
  // Global Auth Export
  // ----------------------------------------------------------------
  window.BypassAuth = {
    getSession: () => (window.BypassAPI ? window.BypassAPI.getSession() : null),
    isLoggedIn: () => (window.BypassAPI ? window.BypassAPI.isLoggedIn() : false),
    clearSession: () => (window.BypassAPI ? window.BypassAPI.auth.logout() : null)
  };

  // ----------------------------------------------------------------
  // Password Visibility Toggles
  // ----------------------------------------------------------------
  document.querySelectorAll(".toggle-visibility").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.target);
      if (!target) return;
      const showing = target.type === "text";
      target.type = showing ? "password" : "text";
      btn.setAttribute(
        "aria-label",
        showing ? "Show password" : "Hide password"
      );
      btn.innerHTML = showing
        ? '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6Z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2.5 2.5l15 15M8.3 8.5a2.5 2.5 0 0 0 3.3 3.3M6.2 6.4C3.9 7.7 2.3 10 1.5 10c0 0 3 6 8.5 6 1.6 0 2.9-.5 4-1.2M13.8 13.7C15.9 12.4 17.5 10 18.5 10c0 0-1.2-2.4-3.4-4.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    });
  });

  // ----------------------------------------------------------------
  // Signup Page Logic
  // ----------------------------------------------------------------
  const signupForm = $("signupForm");
  if (signupForm) {
    const banner = $("formBanner");

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideBanner(banner);
      clearErrors(["name", "email", "password", "confirm", "terms"]);

      const name = $("name").value.trim();
      const email = $("email").value.trim().toLowerCase();
      const password = $("password").value;
      const confirm = $("confirm").value;
      const termsCheckbox = $("terms");
      const agreed = termsCheckbox ? termsCheckbox.checked : true;

      let hasError = false;
      if (!name) {
        setError("name", "Please enter your full name.");
        hasError = true;
      }
      if (!EMAIL_RE.test(email)) {
        setError("email", "Please enter a valid email address.");
        hasError = true;
      }
      if (password.length < 8) {
        setError("password", "Password must be at least 8 characters.");
        hasError = true;
      }
      if (confirm !== password) {
        setError("confirm", "Passwords do not match.");
        hasError = true;
      }
      if (termsCheckbox && !agreed) {
        setError("terms", "You must agree to the terms to continue.");
        hasError = true;
      }
      if (hasError) return;

      const submitBtn = $("submitBtn");
      setBusy(submitBtn, "Creating account…");

      const api = getApi();
      if (!api) {
        showBanner(banner, "API service unavailable. Please check your setup.", "error");
        setBusy(submitBtn, null, "Create account");
        return;
      }

      try {
        await api.auth.signup({ name, email, password }, true);
        showBanner(banner, "Account created successfully! Redirecting…", "success");

        setTimeout(() => {
          window.location.href = "index.html";
        }, 500);
      } catch (err) {
        console.error("Signup error:", err);
        const msg = err.message || (err.errors && err.errors[0] && err.errors[0].msg) || "An unexpected error occurred. Please try again.";
        showBanner(banner, msg, "error");
        setBusy(submitBtn, null, "Create account");
      }
    });
  }

  // ----------------------------------------------------------------
  // Login Page Logic
  // ----------------------------------------------------------------
  const loginForm = $("loginForm");
  if (loginForm) {
    const banner = $("formBanner");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideBanner(banner);
      clearErrors(["email", "password"]);

      const email = $("email").value.trim().toLowerCase();
      const password = $("password").value;
      const rememberCheckbox = $("remember");
      const remember = rememberCheckbox ? rememberCheckbox.checked : true;

      let hasError = false;
      if (!EMAIL_RE.test(email)) {
        setError("email", "Please enter a valid email address.");
        hasError = true;
      }
      if (!password) {
        setError("password", "Please enter your password.");
        hasError = true;
      }
      if (hasError) return;

      const submitBtn = $("submitBtn");
      setBusy(submitBtn, "Logging in…");

      const api = getApi();
      if (!api) {
        showBanner(banner, "API service unavailable. Please check your setup.", "error");
        setBusy(submitBtn, null, "Log in");
        return;
      }

      try {
        await api.auth.login({ email, password }, remember);
        showBanner(banner, "Logged in! Redirecting…", "success");

        setTimeout(() => {
          window.location.href = "index.html";
        }, 400);
      } catch (err) {
        console.error("Login error:", err);
        const msg = err.message || "Invalid email or password. Please try again.";
        showBanner(banner, msg, "error");
        setBusy(submitBtn, null, "Log in");
      }
    });
  }

  // ----------------------------------------------------------------
  // Continue with Google (Real System Google Account Chooser)
  // ----------------------------------------------------------------
  async function setupGoogleAuth() {
    const googleBtn = $("googleAuthBtn");
    const banner = $("formBanner");
    if (!googleBtn) return;

    const api = getApi();

    async function getGoogleClientId() {
      // 1. Check local storage override if user previously provided it
      let clientId = localStorage.getItem("google_client_id") || "";
      if (clientId) return clientId.trim();

      // 2. Fetch from backend environment (/api/auth/google/config)
      if (api) {
        try {
          const config = await api.auth.getGoogleConfig();
          if (config && config.clientId) {
            clientId = config.clientId.trim();
          }
        } catch (e) {
          // ignore network error
        }
      }
      return clientId;
    }

    googleBtn.addEventListener("click", async () => {
      hideBanner(banner);

      if (!window.google || !window.google.accounts) {
        showBanner(banner, "Google Sign-In is loading. Please check your internet connection.", "error");
        return;
      }

      let clientId = await getGoogleClientId();

      // If no Google Client ID is configured yet, ask the user so their real system accounts can be connected
      if (!clientId) {
        const userInput = window.prompt(
          "To connect your system's Google accounts, please enter your Google OAuth 2.0 Client ID (from Google Cloud Console), or configure GOOGLE_CLIENT_ID in backend/.env:"
        );
        if (!userInput || !userInput.trim()) {
          showBanner(banner, "Google Client ID is required to launch the system account chooser.", "error");
          return;
        }
        clientId = userInput.trim();
        localStorage.setItem("google_client_id", clientId);
      }

      try {
        // Use Google Identity Services OAuth 2.0 Token Client with prompt: 'select_account'
        // This opens Google's authentic account chooser displaying all accounts on the system/browser
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile openid",
          prompt: "select_account",
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              if (tokenResponse.error !== "access_denied") {
                showBanner(banner, "Google authorization error: " + (tokenResponse.error_description || tokenResponse.error), "error");
              }
              return;
            }

            showBanner(banner, "Authenticating with Google…", "success");

            try {
              // Retrieve real Google user profile from Google's UserInfo API
              const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: "Bearer " + tokenResponse.access_token }
              });

              if (!res.ok) {
                throw new Error("Failed to fetch Google profile information.");
              }

              const profile = await res.json();
              if (!profile.email) {
                throw new Error("No email returned from Google account.");
              }

              // Send verified system Google account to backend
              await api.auth.googleLogin({
                email: profile.email,
                name: profile.name || profile.given_name || profile.email.split("@")[0],
                googleId: profile.sub,
                avatar: profile.picture || ""
              }, true);

              showBanner(banner, "Signed in as " + profile.email + "! Redirecting…", "success");
              setTimeout(() => {
                window.location.href = "index.html";
              }, 400);
            } catch (err) {
              console.error("Google login processing error:", err);
              showBanner(banner, err.message || "Could not complete sign in with Google.", "error");
            }
          }
        });

        // Request access token - opens real Google account picker popup
        tokenClient.requestAccessToken();
      } catch (err) {
        console.error("Failed to initialize Google token client:", err);
        showBanner(banner, "Could not open Google sign in. Ensure your Client ID is valid.", "error");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupGoogleAuth);
  } else {
    setupGoogleAuth();
  }

  // ----------------------------------------------------------------
  // Forgot Password Page Logic
  // ----------------------------------------------------------------
  const forgotPasswordForm = $("forgotPasswordForm");
  if (forgotPasswordForm) {
    const banner = $("formBanner");
    let formState = "email";
    let pendingEmail = "";
    let pendingResetToken = "";
    const emailStep = $("emailStep");
    const passwordStep = $("passwordStep");

    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideBanner(banner);

      const emailInput = $("email");
      const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
      const submitBtn = $("submitBtn");

      const api = getApi();
      if (!api) {
        showBanner(banner, "API service unavailable.", "error");
        return;
      }

      if (formState === "email") {
        if (!EMAIL_RE.test(email)) {
          setError("email", "Enter a valid email address.");
          return;
        }
        setBusy(submitBtn, "Checking account…");
        try {
          const res = await api.auth.forgotPassword(email);
          pendingEmail = email;
          pendingResetToken = res.resetToken || "RESET_TOKEN";

          formState = "password";
          if (emailStep) emailStep.style.display = "none";
          if (passwordStep) {
            passwordStep.style.display = "flex";
            passwordStep.style.flexDirection = "column";
            passwordStep.style.gap = "16px";
          }
          const formHead = $("form-head");
          if (formHead) {
            const h2 = formHead.querySelector("h2");
            const p = formHead.querySelector("p");
            if (h2) h2.textContent = "Set a new password";
            if (p) p.textContent = `Updating password for ${pendingEmail}`;
          }
          setBusy(submitBtn, null, "Set New Password");
        } catch (error) {
          showBanner(banner, error.message || "An unexpected error occurred.", "error");
          setBusy(submitBtn, null, "Find Account");
        }
      } else if (formState === "password") {
        clearErrors(["password", "confirm"]);
        const password = $("password").value;
        const confirm = $("confirm").value;

        let hasError = false;
        if (password.length < 8) {
          setError("password", "Use at least 8 characters.");
          hasError = true;
        }
        if (confirm !== password) {
          setError("confirm", "Passwords do not match.");
          hasError = true;
        }
        if (hasError) return;

        setBusy(submitBtn, "Updating password…");

        try {
          await api.auth.resetPassword({
            email: pendingEmail,
            resetToken: pendingResetToken,
            newPassword: password
          });

          showBanner(
            banner,
            "Password reset successful! Redirecting to login…",
            "success"
          );
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1200);
        } catch (error) {
          showBanner(banner, error.message || "An error occurred resetting your password.", "error");
          setBusy(submitBtn, null, "Set New Password");
        }
      }
    });
  }

  // ----------------------------------------------------------------
  // Profile / Dashboard Logout Handler
  // ----------------------------------------------------------------
  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const api = getApi();
      if (api) api.auth.logout();
      else window.location.href = "login.html";
    });
  }
})();
