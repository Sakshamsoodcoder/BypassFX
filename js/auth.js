(function () {
  "use strict";

  // ----------------------------------------------------------------
  // Config — point this at wherever `json-server --watch db.json` runs
  // ----------------------------------------------------------------
  const API_BASE = "http://localhost:3000";
  const SESSION_KEY = "bypassfx_session";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ----------------------------------------------------------------
  // Small helpers
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
    el.className = "banner show " + type;
  }

  function hideBanner(el) {
    if (!el) return;
    el.className = "banner";
  }

  function setBusy(btn, busyLabel, idleLabel) {
    if (!btn) return;
    btn.disabled = Boolean(busyLabel);
    btn.textContent = busyLabel || idleLabel;
  }

  function saveSession(user, remember) {
    const payload = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, payload);
  }

  function readSession() {
    const raw =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function friendlyNetworkError(err) {
    console.error(err);
    // More specific error messages based on common scenarios
    if (
      err instanceof TypeError &&
      (err.message === "Failed to fetch" ||
        err.message.includes("network error"))
    ) {
      return "Can't reach the server. Make sure json-server is running (npm start) on port 3000.";
    }
    if (err.message && err.message.startsWith("Server responded with status")) {
      return `Server error: ${err.message}. Please try again.`;
    }
    if (
      err.message &&
      err.message.startsWith("Password update failed with status")
    ) {
      return `Password update failed: ${err.message}. Please try again.`;
    }
    return "An unexpected error occurred. Please try again.";
  }

  // ----------------------------------------------------------------
  // Password visibility toggles (shared by login + signup)
  // ----------------------------------------------------------------
  document.querySelectorAll(".toggle-visibility").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.target);
      if (!target) return;
      const showing = target.type === "text";
      target.type = showing ? "password" : "text";
      btn.setAttribute(
        "aria-label",
        showing ? "Show password" : "Hide password",
      );
      btn.innerHTML = showing
        ? '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2.5 2.5l15 15M8.3 8.5a2.5 2.5 0 0 0 3.3 3.3M6.2 6.4C3.9 7.7 2.3 10 1.5 10c0 0 3 6 8.5 6 1.6 0 2.9-.5 4-1.2M13.8 13.7C15.9 12.4 17.5 10 18.5 10c0 0-1.2-2.4-3.4-4.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    });
  });

  // ----------------------------------------------------------------
  // Signup page
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
      const agreed = $("terms").checked;

      let hasError = false;
      if (!name) {
        setError("name", "Enter your full name.");
        hasError = true;
      }
      if (!EMAIL_RE.test(email)) {
        setError("email", "Enter a valid email address.");
        hasError = true;
      }
      if (password.length < 8) {
        setError("password", "Use at least 8 characters.");
        hasError = true;
      }
      if (confirm !== password) {
        setError("confirm", "Passwords don't match.");
        hasError = true;
      }
      if (!agreed) {
        setError("terms", "You need to agree to continue.");
        hasError = true;
      }
      if (hasError) return;

      const submitBtn = $("submitBtn");
      setBusy(submitBtn, "Creating account…");

      try {
        const existing = await fetch(
          `${API_BASE}/users?email=${encodeURIComponent(email)}`,
        ).then((r) => r.json());

        if (existing.length > 0) {
          showBanner(
            banner,
            "An account with this email already exists. Try logging in instead.",
            "error",
          );
          setBusy(submitBtn, null, "Create account");
          return;
        }

        const created = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password, // demo only — see README for why this isn't production-safe
            createdAt: new Date().toISOString(),
          }),
        }).then((r) => {
          if (!r.ok)
            throw new Error("Signup request failed with status " + r.status);
          return r.json();
        });

        showBanner(banner, "Account created! Taking you in…", "success");
        saveSession(created, true);
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } catch (err) {
        showBanner(banner, friendlyNetworkError(err), "error");
        setBusy(submitBtn, null, "Create account");
      }
    });
  }

  // ----------------------------------------------------------------
  // Login page
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
      const remember = $("remember").checked;

      let hasError = false;
      if (!EMAIL_RE.test(email)) {
        setError("email", "Enter a valid email address.");
        hasError = true;
      }
      if (!password) {
        setError("password", "Enter your password.");
        hasError = true;
      }
      if (hasError) return;

      const submitBtn = $("submitBtn");
      setBusy(submitBtn, "Logging in…");

      try {
        const matches = await fetch(
          `${API_BASE}/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        ).then((r) => {
          if (!r.ok)
            throw new Error("Login request failed with status " + r.status);
          return r.json();
        });

        if (matches.length === 0) {
          showBanner(banner, "Invalid email or password.", "error");
          setBusy(submitBtn, null, "Log in");
          return;
        }

        saveSession(matches[0], remember);
        showBanner(banner, "Logged in! Taking you in…", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 400);
      } catch (err) {
        showBanner(banner, friendlyNetworkError(err), "error");
        setBusy(submitBtn, null, "Log in");
      }
    });
  }

  // ----------------------------------------------------------------
  // Forgot Password page
  // ----------------------------------------------------------------
  const forgotPasswordForm = $("forgotPasswordForm");
  if (forgotPasswordForm) {
    const banner = $("formBanner");
    let formState = "email"; // "email" or "password"
    let userToUpdate = null;
    const emailStep = $("emailStep");
    const passwordStep = $("passwordStep");

    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideBanner(banner);

      const email = $("email").value.trim().toLowerCase();
      const submitBtn = $("submitBtn");

      if (formState === "email") {
        if (!EMAIL_RE.test(email)) {
          setError("email", "Enter a valid email address.");
          clearErrors(["email"]); // Clear previous email error if any
          return;
        }
        setBusy(submitBtn, "Checking email…");
        try {
          const userRes = await fetch(
            `${API_BASE}/users?email=${encodeURIComponent(email)}`,
          );
          if (!userRes.ok) {
            throw new Error(`Server responded with status ${userRes.status}`);
          }
          const users = await userRes.json();

          if (users.length === 0) {
            showBanner(
              banner,
              "No account found with that email address.",
              "error",
            );
            setBusy(submitBtn, null, "Find Account");
            return;
          }

          // Transition to password step
          userToUpdate = users[0];
          formState = "password";
          emailStep.style.display = "none";
          passwordStep.style.display = "flex";
          passwordStep.style.flexDirection = "column";
          passwordStep.style.gap = "16px";
          $("form-head").querySelector("h2").textContent = "Set a new password";
          $("form-head").querySelector("p").textContent =
            `Updating password for ${userToUpdate.email}`;
          setBusy(submitBtn, null, "Set New Password");
        } catch (error) {
          console.error("Forgot Password (email step) error:", error); // Log the actual error
          showBanner(banner, friendlyNetworkError(error), "error");
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
          setError("confirm", "Passwords don't match.");
          hasError = true;
        }
        if (hasError) return;

        setBusy(submitBtn, "Updating password…");

        try {
          // Update the user's password in the database
          await fetch(`${API_BASE}/users/${userToUpdate.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: password }),
          }).then((r) => {
            if (!r.ok)
              throw new Error("Password update failed with status " + r.status);
          });

          showBanner(
            banner,
            "Password reset! Redirecting to login...",
            "success",
          );
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1500);
        } catch (error) {
          console.error("Forgot Password (password step) error:", error); // Log the actual error
          showBanner(banner, friendlyNetworkError(error), "error");
          setBusy(submitBtn, null, "Set New Password");
        }
      }
    });
  }

  // ----------------------------------------------------------------
  // Dashboard page
  // ----------------------------------------------------------------
  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    const session = readSession();
    if (!session) {
      window.location.href = "login.html";
    } else {
      const greeting = $("greeting");
      if (greeting)
        greeting.textContent = "Welcome back, " + session.name.split(" ")[0];
      if ($("kv-name")) $("kv-name").textContent = session.name;
      if ($("kv-email")) $("kv-email").textContent = session.email;
      if ($("kv-id")) $("kv-id").textContent = String(session.id);
      if ($("kv-joined")) {
        $("kv-joined").textContent = session.createdAt
          ? new Date(session.createdAt).toLocaleString()
          : "—";
      }
    }

    logoutBtn.addEventListener("click", () => {
      clearSession();
      window.location.href = "login.html";
    });
  }
})();
