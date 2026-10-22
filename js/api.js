/**
 * BypassFX — API Client
 * Centralised HTTP client for all backend API calls.
 * Automatically attaches the JWT token to every authenticated request.
 *
 * Usage (import in HTML as a regular script before auth.js, home.js, etc.):
 *   <script src="js/api.js"></script>
 */

window.BypassAPI = (function () {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  // In development: http://localhost:5000
  // In production:  your Render API URL
  const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://bypassfx-api.onrender.com'; // ← update to your Render URL after deploy

  const TOKEN_KEY = 'bypassfx_token';

  // ─── Token Helpers ─────────────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  }

  function saveToken(token, remember = true) {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    // Also clear the opposite store
    if (remember) sessionStorage.removeItem(TOKEN_KEY);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  // Session data (non-sensitive user info, cached locally for UI rendering)
  const SESSION_KEY = 'bypassfx_session';

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function saveSession(user, remember = true) {
    const payload = JSON.stringify({
      id:        user.id || user._id,
      name:      user.name,
      email:     user.email,
      createdAt: user.createdAt
    });
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, payload);
    if (remember) sessionStorage.removeItem(SESSION_KEY);
    else localStorage.removeItem(SESSION_KEY);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    clearToken();
  }

  // ─── Core Request Helper ───────────────────────────────────────────────────
  async function request(method, path, body = null, requireAuth = false) {
    const headers = { 'Content-Type': 'application/json' };

    if (requireAuth) {
      const token = getToken();
      if (!token) {
        // Redirect to login if there's no token and auth is required
        window.location.href = 'login.html';
        return;
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json();

    if (!res.ok) {
      // Token expired → redirect to login
      if (res.status === 401 && requireAuth) {
        clearSession();
        window.location.href = 'login.html';
        return;
      }
      throw { status: res.status, message: data.message || 'Request failed', errors: data.errors };
    }

    return data;
  }

  // ─── Auth API ──────────────────────────────────────────────────────────────
  const auth = {
    async signup({ name, email, password }, remember = true) {
      const data = await request('POST', '/api/auth/signup', { name, email, password });
      saveToken(data.token, remember);
      saveSession(data.user, remember);
      return data;
    },

    async login({ email, password }, remember = true) {
      const data = await request('POST', '/api/auth/login', { email, password });
      saveToken(data.token, remember);
      saveSession(data.user, remember);
      return data;
    },

    async forgotPassword(email) {
      return request('POST', '/api/auth/forgot-password', { email });
    },

    async resetPassword({ email, resetToken, newPassword }, remember = true) {
      const data = await request('POST', '/api/auth/reset-password', { email, resetToken, newPassword });
      if (data.token) {
        saveToken(data.token, remember);
        saveSession(data.user, remember);
      }
      return data;
    },

    logout() {
      clearSession();
      window.location.href = 'login.html';
    },

    getSession,
    isLoggedIn: () => !!getToken()
  };

  // ─── User API ──────────────────────────────────────────────────────────────
  const user = {
    async getProfile() {
      return request('GET', '/api/user/me', null, true);
    },

    async updateProfile({ name, email }) {
      const data = await request('PATCH', '/api/user/me', { name, email }, true);
      // Refresh local session cache
      if (data.user) {
        const remember = !!localStorage.getItem('bypassfx_token');
        saveSession(data.user, remember);
      }
      return data;
    },

    async deleteAccount() {
      const data = await request('DELETE', '/api/user/me', null, true);
      clearSession();
      return data;
    }
  };

  // ─── History API ───────────────────────────────────────────────────────────
  const history = {
    async getAll({ page = 1, limit = 20 } = {}) {
      return request('GET', `/api/history?page=${page}&limit=${limit}`, null, true);
    },

    async save({ from, to, fromAmount, toAmount, savings, savingsPct, route, provider, isOptimal, hops, legs, maxHops }) {
      return request('POST', '/api/history', {
        from, to, fromAmount, toAmount,
        savings, savingsPct,
        route, provider, isOptimal,
        hops, legs, maxHops
      }, true);
    },

    async deleteOne(id) {
      return request('DELETE', `/api/history/${id}`, null, true);
    },

    async clearAll() {
      return request('DELETE', '/api/history', null, true);
    }
  };

  // ─── Health Check ──────────────────────────────────────────────────────────
  const checkHealth = () => request('GET', '/api/health');

  // ─── Public API ───────────────────────────────────────────────────────────
  return { auth, user, history, checkHealth, getSession, isLoggedIn: auth.isLoggedIn };

})();
