/**
 * BYPASSFX — Secure Authentication Engine
 * Prototype authentication with client-side SHA-256 password hashing,
 * full form validations, session management, and password reset flows.
 */

(function () {
  "use strict";

  // ----------------------------------------------------------------
  // Auth Config & Storage Keys
  // ----------------------------------------------------------------
  const SESSION_KEY = "bypassfx_session";
  const DB_KEY = "bypassfx_users_db";
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

  // ----------------------------------------------------------------
  // Secure SHA-256 Password Hasher (Web Crypto API)
  // ----------------------------------------------------------------
  async function hashPassword(plainText) {
    if (!plainText) return "";
    try {
      const msgBuffer = new TextEncoder().encode(plainText);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      // Fallback for environments lacking crypto.subtle
      let hash = 0;
      for (let i = 0; i < plainText.length; i++) {
        hash = (hash << 5) - hash + plainText.charCodeAt(i);
        hash |= 0;
      }
      return "bfx_" + Math.abs(hash).toString(16);
    }
  }

  // ----------------------------------------------------------------
  // User Storage Database
  // ----------------------------------------------------------------
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Failed to save users database:", e);
    }
  }

  // ----------------------------------------------------------------
  // Session Management
  // ----------------------------------------------------------------
  function saveSession(user, remember = true) {
    const payload = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt || new Date().toISOString(),
    });
    // Clear both first to avoid duplicates
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);

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

  // Export for global access across scripts
  window.BypassAuth = {
    getSession: readSession,
    saveSession: saveSession,
    clearSession: clearSession,
    getUsers: getUsers,
    hashPassword: hashPassword,
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

      try {
        const users = getUsers();
        const existing = users.find((u) => u.email === email);

        if (existing) {
          showBanner(
            banner,
            "An account with this email already exists. Please log in.",
            "error"
          );
          setBusy(submitBtn, null, "Create account");
          return;
        }

        const passwordHash = await hashPassword(password);
        const newUser = {
          id: "usr_" + Date.now().toString(),
          name,
          email,
          passwordHash,
          createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        saveUsers(users);

        showBanner(banner, "Account created successfully! Redirecting…", "success");
        saveSession(newUser, true);

        setTimeout(() => {
          window.location.href = "index.html";
        }, 500);
      } catch (err) {
        console.error("Signup error:", err);
        showBanner(banner, "An unexpected error occurred. Please try again.", "error");
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

      try {
        const users = getUsers();
        const user = users.find((u) => u.email === email);

        if (!user) {
          showBanner(banner, "No account found with this email. Please sign up.", "error");
          setBusy(submitBtn, null, "Log in");
          return;
        }

        const enteredHash = await hashPassword(password);
        // Compare with passwordHash or legacy plaintext password for backward compatibility
        const isMatch =
          user.passwordHash === enteredHash ||
          (user.password && user.password === password);

        if (!isMatch) {
          showBanner(banner, "Incorrect password. Please try again.", "error");
          setBusy(submitBtn, null, "Log in");
          return;
        }

        // If user had plain password, upgrade to hash
        if (user.password && !user.passwordHash) {
          user.passwordHash = enteredHash;
          delete user.password;
          saveUsers(users);
        }

        saveSession(user, remember);
        showBanner(banner, "Logged in! Redirecting…", "success");

        setTimeout(() => {
          window.location.href = "index.html";
        }, 400);
      } catch (err) {
        console.error("Login error:", err);
        showBanner(banner, "An unexpected error occurred. Please try again.", "error");
        setBusy(submitBtn, null, "Log in");
      }
    });
  }

  // ----------------------------------------------------------------
  // Forgot Password Page Logic
  // ----------------------------------------------------------------
  const forgotPasswordForm = $("forgotPasswordForm");
  if (forgotPasswordForm) {
    const banner = $("formBanner");
    let formState = "email";
    let userToUpdate = null;
    const emailStep = $("emailStep");
    const passwordStep = $("passwordStep");

    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideBanner(banner);

      const emailInput = $("email");
      const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
      const submitBtn = $("submitBtn");

      if (formState === "email") {
        if (!EMAIL_RE.test(email)) {
          setError("email", "Enter a valid email address.");
          return;
        }
        setBusy(submitBtn, "Checking account…");
        try {
          const users = getUsers();
          const match = users.find((u) => u.email === email);

          if (!match) {
            showBanner(
              banner,
              "No registered account found with that email address.",
              "error"
            );
            setBusy(submitBtn, null, "Find Account");
            return;
          }

          userToUpdate = match;
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
            if (p) p.textContent = `Updating password for ${userToUpdate.email}`;
          }
          setBusy(submitBtn, null, "Set New Password");
        } catch (error) {
          showBanner(banner, "An unexpected error occurred.", "error");
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
          const users = getUsers();
          const index = users.findIndex((u) => u.id === userToUpdate.id);
          if (index > -1) {
            users[index].passwordHash = await hashPassword(password);
            delete users[index].password;
            saveUsers(users);
          }

          showBanner(
            banner,
            "Password reset successful! Redirecting to login…",
            "success"
          );
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1200);
        } catch (error) {
          showBanner(banner, "An unexpected error occurred.", "error");
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
    const session = readSession();
    if (!session && window.location.pathname.includes("profile.html")) {
      window.location.href = "login.html";
    }

    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = "login.html";
    });
  }
})();
