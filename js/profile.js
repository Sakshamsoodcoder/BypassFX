/**
 * BypassFX — Profile Page & Intelligence Studio Controller
 * Manages user session, dark/light theme persistence, favourite currencies,
 * conversion history grid/list rendering, live exchange rate polling,
 * and account data export.
 */

(function () {
  'use strict';

  // ============================================================
  // 1. Constants & Configurations
  // ============================================================
  const STORAGE_KEYS = {
    SESSION: 'bypassfx_session',
    THEME: 'bypassfx_theme',
    FAVOURITES: 'bypassfx_favourites',
    HISTORY: 'bypassfx_history',
    PREFERENCES: 'bypassfx_preferences'
  };

  const API_BASE = 'https://api.frankfurter.app';

  const CURRENCY_METADATA = {
    USD: { name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
    EUR: { name: 'Euro', flag: '🇪🇺', symbol: '€' },
    GBP: { name: 'British Pound', flag: '🇬🇧', symbol: '£' },
    INR: { name: 'Indian Rupee', flag: '🇮🇳', symbol: '₹' },
    JPY: { name: 'Japanese Yen', flag: '🇯🇵', symbol: '¥' },
    CAD: { name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'C$' },
    AUD: { name: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$' },
    CHF: { name: 'Swiss Franc', flag: '🇨🇭', symbol: 'CHF' },
    SGD: { name: 'Singapore Dollar', flag: '🇸🇬', symbol: 'S$' },
    AED: { name: 'UAE Dirham', flag: '🇦🇪', symbol: 'AED' },
    CNY: { name: 'Chinese Yuan', flag: '🇨🇳', symbol: '¥' },
    NZD: { name: 'New Zealand Dollar', flag: '🇳🇿', symbol: 'NZ$' }
  };

  const ZERO_DECIMAL_CURRENCIES = new Set(['JPY']);

  const USD_BASE_RATES = {
    USD: 1.0, INR: 86.8520, EUR: 0.9245, GBP: 0.7915,
    JPY: 153.42, CAD: 1.3850, AUD: 1.5425, CHF: 0.8850,
    SGD: 1.3480, AED: 3.6725, CNY: 7.2450, NZD: 1.6950
  };

  // Seed sample conversion history if none exists for instant visual appeal
  const DEFAULT_SEED_HISTORY = [
    {
      id: 'tx-101',
      from: 'INR',
      to: 'EUR',
      fromAmount: 100000,
      toAmount: 1052.40,
      savings: 280.50,
      savingsCur: 'INR',
      isOptimal: true,
      route: 'INR ➔ USD ➔ EUR',
      provider: 'Wise + Wise',
      date: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'tx-102',
      from: 'USD',
      to: 'INR',
      fromAmount: 1200,
      toAmount: 104222.40,
      savings: 1420.00,
      savingsCur: 'INR',
      isOptimal: true,
      route: 'USD ➔ INR',
      provider: 'Wise Direct',
      date: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    {
      id: 'tx-103',
      from: 'EUR',
      to: 'USD',
      fromAmount: 5000,
      toAmount: 5410.80,
      savings: 85.20,
      savingsCur: 'USD',
      isOptimal: true,
      route: 'EUR ➔ GBP ➔ USD',
      provider: 'Wise + Revolut',
      date: new Date(Date.now() - 3600000 * 42).toISOString()
    },
    {
      id: 'tx-104',
      from: 'GBP',
      to: 'INR',
      fromAmount: 850,
      toAmount: 93210.25,
      savings: 1100.00,
      savingsCur: 'INR',
      isOptimal: false,
      route: 'GBP ➔ INR (Direct)',
      provider: 'Bank Wire',
      date: new Date(Date.now() - 3600000 * 68).toISOString()
    },
    {
      id: 'tx-105',
      from: 'USD',
      to: 'JPY',
      fromAmount: 2500,
      toAmount: 383550,
      savings: 42.50,
      savingsCur: 'USD',
      isOptimal: true,
      route: 'USD ➔ EUR ➔ JPY',
      provider: 'Wise + Wise',
      date: new Date(Date.now() - 3600000 * 95).toISOString()
    },
    {
      id: 'tx-106',
      from: 'AUD',
      to: 'EUR',
      fromAmount: 3200,
      toAmount: 1918.40,
      savings: 34.80,
      savingsCur: 'EUR',
      isOptimal: true,
      route: 'AUD ➔ USD ➔ EUR',
      provider: 'Wise (Optimal)',
      date: new Date(Date.now() - 3600000 * 120).toISOString()
    }
  ];

  // ============================================================
  // 2. Application State
  // ============================================================
  const state = {
    user: null,
    theme: 'light',
    favourites: ['USD', 'EUR', 'GBP', 'INR'],
    history: [],
    historyView: 'grid', // 'grid' | 'list'
    historyFilter: 'all', // 'all' | 'optimal' | 'direct'
    historySort: 'newest',
    preferences: {
      defaultFrom: 'INR',
      defaultTo: 'EUR',
      strategy: 'max_yield'
    },
    liveRates: {}
  };

  function $(id) {
    return document.getElementById(id);
  }

  function formatAmount(n, currency) {
    if (n == null || isNaN(n)) return '0.00';
    const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // ============================================================
  // 3. Theme Engine (Light / Dark Forest / System)
  // ============================================================
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'system';
    applyTheme(saved, false);

    // Attach listeners to theme cards in settings
    const cards = [
      { id: 'themeCardLight', val: 'light' },
      { id: 'themeCardDark', val: 'dark' },
      { id: 'themeCardSystem', val: 'system' }
    ];

    cards.forEach(({ id, val }) => {
      const cardEl = $(id);
      if (cardEl) {
        cardEl.addEventListener('click', () => applyTheme(val, true));
      }
    });

    // Quick toggle button in nav
    const navBtn = $('btnNavThemeToggle');
    if (navBtn) {
      navBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    }
  }

  function applyTheme(themeVal, persist = true) {
    state.theme = themeVal;
    let effective = themeVal;

    if (themeVal === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', effective);

    if (persist) {
      localStorage.setItem(STORAGE_KEYS.THEME, themeVal);
    }

    // Update active check state on theme cards
    ['themeCardLight', 'themeCardDark', 'themeCardSystem'].forEach(id => {
      const el = $(id);
      if (el) {
        el.classList.toggle('active', el.dataset.themeVal === themeVal);
      }
    });
  }

  // ============================================================
  // 4. Session & Profile Identity Manager
  // ============================================================
  function loadSession() {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION) || sessionStorage.getItem(STORAGE_KEYS.SESSION);
    if (raw) {
      try {
        state.user = JSON.parse(raw);
      } catch (e) {
        state.user = null;
      }
    }

    // Default demo profile if no login session
    if (!state.user) {
      state.user = {
        id: 'FX-8492',
        name: 'Kartik Verma',
        email: 'kartikverma1074@gmail.com',
        tagline: 'Head of Arbitrage Routing • Verified Trader',
        tier: 'Pro Member',
        createdAt: '2026-08-15T00:00:00.000Z'
      };
    }

    renderProfileHeader();
  }

  function renderProfileHeader() {
    const u = state.user;
    if (!u) return;

    $('profileUserName').innerHTML = `
      <span>${escapeHtml(u.name)}</span>
      <span class="verified-icon-badge" title="Verified Member">✓</span>
    `;

    $('profileUserEmail').textContent = u.email || '—';
    $('profileUserId').textContent = u.id ? String(u.id).replace(/\D/g, '').padStart(4, '0').slice(0, 4) : 'FX-8492';
    $('profileUserTier').textContent = u.tier || 'Pro Member';

    if (u.tagline) {
      $('profileUserTagline').textContent = u.tagline;
    }

    // Initials (e.g. Kartik Verma -> KV)
    const parts = (u.name || 'Member').trim().split(' ');
    const initial = parts.length > 1
      ? parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase()
      : parts[0].charAt(0).toUpperCase();

    $('profileAvatarText').textContent = initial;

    // Update Nav bar
    const navAuth = $('navAuthSlot');
    const mobAuth = $('mobileAuthSlot');
    if (navAuth) {
      navAuth.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-family: var(--font-display); font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">
            👋 ${parts[0]}
          </span>
          <a href="index.html" class="btn-primary" style="padding: 8px 18px; font-size: 0.85rem;">Converter</a>
        </div>
      `;
    }
    if (mobAuth) {
      mobAuth.innerHTML = `
        <div style="font-family: var(--font-display); font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
          Logged in as ${u.name}
        </div>
        <a href="index.html" class="btn-primary" style="text-align: center;">Go to Converter</a>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ============================================================
  // 5. Favourite Currencies Studio
  // ============================================================
  function loadFavourites() {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVOURITES);
    if (raw) {
      try {
        state.favourites = JSON.parse(raw);
      } catch (e) {
        state.favourites = ['USD', 'EUR', 'GBP', 'INR'];
      }
    }
    renderFavourites();
    fetchLiveRatesForFavourites();
  }

  function saveFavourites() {
    localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(state.favourites));
    renderFavourites();
  }

  function addFavourite(code) {
    if (!code || state.favourites.includes(code)) return;
    state.favourites.push(code);
    saveFavourites();
  }

  function removeFavourite(code) {
    state.favourites = state.favourites.filter(c => c !== code);
    saveFavourites();
  }

  async function fetchLiveRatesForFavourites() {
    try {
      const res = await fetch(`${API_BASE}/latest?from=USD`);
      if (res.ok) {
        const data = await res.json();
        state.liveRates = data.rates || {};
        renderFavourites(); // Re-render with fresh rates
      }
    } catch (e) {}
  }

  function renderFavourites() {
    const container = $('favGridContainer');
    const emptyState = $('favEmptyState');
    const countBadge = $('favCountBadge');

    if (!container) return;

    if (countBadge) {
      countBadge.textContent = `${state.favourites.length} Pinned`;
    }

    if (state.favourites.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = state.favourites.map(code => {
      const meta = CURRENCY_METADATA[code] || { name: code, flag: '🌐', symbol: code };
      const rateVsUSD = state.liveRates[code] || USD_BASE_RATES[code] || 1.0;
      const rateDisplay = code === 'USD' ? '1.0000 USD' : `${formatAmount(rateVsUSD, code)} / $1`;

      return `
        <div class="fav-currency-item" data-code="${code}">
          <div class="fav-item-header">
            <div class="fav-item-flag-code">
              <span class="fav-flag">${meta.flag}</span>
              <div>
                <span class="fav-code">${code}</span>
                <div class="fav-item-name">${meta.name}</div>
              </div>
            </div>
            <button type="button" class="btn-remove-fav" data-code="${code}" title="Remove from favourites" aria-label="Remove ${code}">
              ✕
            </button>
          </div>

          <div class="fav-item-rate-row">
            <div>
              <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Spot Rate</span>
              <div class="fav-rate-num">${rateDisplay}</div>
            </div>
            <span class="change-pill up">+0.18%</span>
          </div>

          <div class="fav-item-actions">
            <span style="font-size: 0.75rem; color: var(--text-muted);">${meta.symbol} · High Liquidity</span>
            <a href="index.html#converterSection" class="btn-fav-convert" data-code="${code}">
              <span>Convert Now</span> ➔
            </a>
          </div>
        </div>
      `;
    }).join('');

    // Attach remove listeners
    container.querySelectorAll('.btn-remove-fav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFavourite(btn.dataset.code);
      });
    });

    // Attach convert now listeners
    container.querySelectorAll('.btn-fav-convert').forEach(link => {
      link.addEventListener('click', () => {
        localStorage.setItem('bypassfx_preset_from', link.dataset.code);
      });
    });
  }

  // ============================================================
  // 6. Conversion History Studio (Grid & List View Modes)
  // ============================================================
  function loadHistory() {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw) {
      try {
        state.history = JSON.parse(raw);
      } catch (e) {
        state.history = DEFAULT_SEED_HISTORY;
      }
    } else {
      state.history = DEFAULT_SEED_HISTORY;
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(DEFAULT_SEED_HISTORY));
    }

    renderHistory();
    updateStatisticsDeck();
  }

  function renderHistory() {
    const container = $('historyCardsContainer');
    const emptyState = $('historyEmptyState');
    const pagination = $('historyPagination');

    if (!container) return;

    let items = [...state.history];

    // Filter
    if (state.historyFilter === 'optimal') {
      items = items.filter(i => i.isOptimal);
    } else if (state.historyFilter === 'direct') {
      items = items.filter(i => !i.isOptimal);
    }

    // Sort
    if (state.historySort === 'highest') {
      items.sort((a, b) => b.fromAmount - a.fromAmount);
    } else if (state.historySort === 'savings') {
      items.sort((a, b) => (b.savings || 0) - (a.savings || 0));
    } else {
      items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }

    if (items.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (pagination) pagination.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (pagination) pagination.style.display = 'flex';

    container.innerHTML = items.map(item => {
      const fromMeta = CURRENCY_METADATA[item.from] || { flag: '🌐', symbol: item.from };
      const toMeta = CURRENCY_METADATA[item.to] || { flag: '🌐', symbol: item.to };
      const d = new Date(item.date);
      const dateLabel = isNaN(d) ? 'Recent' : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const timeLabel = isNaN(d) ? '' : ` · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      const statusBadge = item.isOptimal
        ? `<span class="hist-status-pill optimal">✨ Optimal Route</span>`
        : `<span class="hist-status-pill direct">Direct</span>`;

      const savingsDisplay = item.savings > 0
        ? `+${fromMeta.symbol}${formatAmount(item.savings, item.from)} saved`
        : 'Direct Bank Yield';

      return `
        <div class="history-item-card">
          <div class="hist-card-header">
            <div class="hist-date-stamp">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${dateLabel}${timeLabel}</span>
            </div>
            ${statusBadge}
          </div>

          <div class="hist-metrics-row">
            <div class="hist-metric-col">
              <span class="label">Sent Amount</span>
              <span class="val">${fromMeta.symbol}${formatAmount(item.fromAmount, item.from)} <span style="font-size: 0.8rem; color: var(--text-muted);">${item.from}</span></span>
            </div>
            <div class="hist-metric-col">
              <span class="label">Received Yield</span>
              <span class="val green">${toMeta.symbol}${formatAmount(item.toAmount, item.to)} <span style="font-size: 0.8rem; color: var(--text-muted);">${item.to}</span></span>
            </div>
          </div>

          <div class="hist-route-path">
            <span>Route:</span>
            <strong>${escapeHtml(item.route || `${item.from} ➔ ${item.to}`)}</strong>
          </div>

          <div class="hist-card-footer">
            <span class="hist-savings-badge">${savingsDisplay}</span>
            <button type="button" class="btn-hist-reconvert" data-from="${item.from}" data-to="${item.to}" data-amount="${item.fromAmount}">
              <span>Re-convert</span> ➔
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach re-convert button handlers
    container.querySelectorAll('.btn-hist-reconvert').forEach(btn => {
      btn.addEventListener('click', () => {
        localStorage.setItem('bypassfx_preset_from', btn.dataset.from);
        localStorage.setItem('bypassfx_preset_to', btn.dataset.to);
        localStorage.setItem('bypassfx_preset_amount', btn.dataset.amount);
        window.location.href = 'index.html#converterSection';
      });
    });
  }

  function updateStatisticsDeck() {
    const list = state.history;
    $('statTotalConversions').textContent = list.length;

    let totalSaved = 0;
    list.forEach(i => {
      totalSaved += (i.savings || 0);
    });

    $('statTotalSavings').textContent = `₹${formatAmount(totalSaved, 'INR')}`;

    if (list.length > 0) {
      const pairCounts = {};
      list.forEach(i => {
        const pair = `${i.from} ➔ ${i.to}`;
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      });
      const topPair = Object.keys(pairCounts).sort((a, b) => pairCounts[b] - pairCounts[a])[0];
      if (topPair) $('statTopCorridor').textContent = topPair;
    }
  }

  // ============================================================
  // 7. Statement & JSON Data Exporters
  // ============================================================
  function exportAccountStatement(format = 'json') {
    const payload = {
      account: state.user,
      exportedAt: new Date().toISOString(),
      statistics: {
        totalConversions: state.history.length,
        favourites: state.favourites
      },
      conversions: state.history
    };

    let dataStr = '';
    let filename = `BypassFX_Statement_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
      dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      filename += '.json';
    } else {
      // CSV Export
      let csv = 'Date,From Currency,Sent Amount,To Currency,Received Amount,Savings,Route,Provider\n';
      state.history.forEach(row => {
        csv += `"${row.date}","${row.from}",${row.fromAmount},"${row.to}",${row.toAmount},${row.savings || 0},"${row.route || ''}","${row.provider || ''}"\n`;
      });
      dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      filename += '.csv';
    }

    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', filename);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }

  // ============================================================
  // 8. Event Listeners & Modals
  // ============================================================
  function setupEventListeners() {
    // 1. Edit Profile Modal
    const editModal = $('editProfileModal');
    $('btnOpenEditProfile')?.addEventListener('click', () => {
      if (state.user) {
        $('inputEditName').value = state.user.name || '';
        $('inputEditEmail').value = state.user.email || '';
        $('inputEditTagline').value = state.user.tagline || '';
      }
      editModal?.classList.add('open');
    });

    $('btnCloseEditModal')?.addEventListener('click', () => editModal?.classList.remove('open'));
    $('btnCancelEdit')?.addEventListener('click', () => editModal?.classList.remove('open'));

    $('editProfileForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      state.user.name = $('inputEditName').value.trim();
      state.user.email = $('inputEditEmail').value.trim();
      state.user.tagline = $('inputEditTagline').value.trim();

      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(state.user));
      renderProfileHeader();
      editModal?.classList.remove('open');
    });

    // 2. Clear History Modal
    const clearModal = $('clearHistoryModal');
    $('btnOpenClearHistory')?.addEventListener('click', () => clearModal?.classList.add('open'));
    $('btnCloseClearModal')?.addEventListener('click', () => clearModal?.classList.remove('open'));
    $('btnCancelClear')?.addEventListener('click', () => clearModal?.classList.remove('open'));

    $('btnConfirmClear')?.addEventListener('click', () => {
      state.history = [];
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
      renderHistory();
      updateStatisticsDeck();
      clearModal?.classList.remove('open');
    });

    // 3. Favourites Add & Quick Pin
    $('btnAddFav')?.addEventListener('click', () => {
      const select = $('favAddSelect');
      if (select && select.value) {
        addFavourite(select.value);
        select.value = '';
      }
    });

    $('btnPinPopular')?.addEventListener('click', () => {
      state.favourites = ['USD', 'EUR', 'GBP', 'INR'];
      saveFavourites();
    });

    // 4. History Filters & Sort
    document.querySelectorAll('.filter-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.historyFilter = btn.dataset.filter;
        renderHistory();
      });
    });

    $('historySortSelect')?.addEventListener('change', (e) => {
      state.historySort = e.target.value;
      renderHistory();
    });

    // 5. Exporters
    $('btnExportStatement')?.addEventListener('click', () => exportAccountStatement('csv'));
    $('btnExportJson')?.addEventListener('click', () => exportAccountStatement('json'));

    // 6. Log Out
    $('btnLogoutProfile')?.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
      window.location.href = 'index.html';
    });

    // 7. Mobile Menu
    $('menuToggleBtn')?.addEventListener('click', () => {
      $('mobileNavDrawer')?.classList.toggle('open');
    });
  }

  // ============================================================
  // 9. Main Bootstrap
  // ============================================================
  function init() {
    initTheme();
    loadSession();
    loadFavourites();
    loadHistory();
    setupEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
