/**
 * BYPASSFX — Homepage Engine (Pure Vanilla JS)
 * Phase 1 Prototype: Authentication-Gated Converter UI & Currency Showcase
 * Zero external rate API calls; Conversion is gated and marked as "Coming Soon".
 */

(function () {
  "use strict";

  // ============================================================
  // 1. Comprehensive Currency Master List (36 Supported Currencies)
  // ============================================================
  const CURRENCIES = [
    { code: 'INR', name: 'Indian Rupee', iso: 'in', flag: '🇮🇳', symbol: '₹', country: 'India' },
    { code: 'USD', name: 'US Dollar', iso: 'us', flag: '🇺🇸', symbol: '$', country: 'United States' },
    { code: 'EUR', name: 'Euro', iso: 'eu', flag: '🇪🇺', symbol: '€', country: 'European Union' },
    { code: 'GBP', name: 'British Pound', iso: 'gb', flag: '🇬🇧', symbol: '£', country: 'United Kingdom' },
    { code: 'JPY', name: 'Japanese Yen', iso: 'jp', flag: '🇯🇵', symbol: '¥', country: 'Japan' },
    { code: 'AUD', name: 'Australian Dollar', iso: 'au', flag: '🇦🇺', symbol: 'A$', country: 'Australia' },
    { code: 'CAD', name: 'Canadian Dollar', iso: 'ca', flag: '🇨🇦', symbol: 'C$', country: 'Canada' },
    { code: 'CHF', name: 'Swiss Franc', iso: 'ch', flag: '🇨🇭', symbol: 'CHF', country: 'Switzerland' },
    { code: 'CNY', name: 'Chinese Yuan', iso: 'cn', flag: '🇨🇳', symbol: '¥', country: 'China' },
    { code: 'SGD', name: 'Singapore Dollar', iso: 'sg', flag: '🇸🇬', symbol: 'S$', country: 'Singapore' },
    { code: 'HKD', name: 'Hong Kong Dollar', iso: 'hk', flag: '🇭🇰', symbol: 'HK$', country: 'Hong Kong' },
    { code: 'NZD', name: 'New Zealand Dollar', iso: 'nz', flag: '🇳🇿', symbol: 'NZ$', country: 'New Zealand' },
    { code: 'KRW', name: 'South Korean Won', iso: 'kr', flag: '🇰🇷', symbol: '₩', country: 'South Korea' },
    { code: 'AED', name: 'UAE Dirham', iso: 'ae', flag: '🇦🇪', symbol: 'AED', country: 'United Arab Emirates' },
    { code: 'SAR', name: 'Saudi Riyal', iso: 'sa', flag: '🇸🇦', symbol: 'SAR', country: 'Saudi Arabia' },
    { code: 'QAR', name: 'Qatari Riyal', iso: 'qa', flag: '🇶🇦', symbol: 'QAR', country: 'Qatar' },
    { code: 'THB', name: 'Thai Baht', iso: 'th', flag: '🇹🇭', symbol: '฿', country: 'Thailand' },
    { code: 'MYR', name: 'Malaysian Ringgit', iso: 'my', flag: '🇲🇾', symbol: 'RM', country: 'Malaysia' },
    { code: 'IDR', name: 'Indonesian Rupiah', iso: 'id', flag: '🇮🇩', symbol: 'Rp', country: 'Indonesia' },
    { code: 'PHP', name: 'Philippine Peso', iso: 'ph', flag: '🇵🇭', symbol: '₱', country: 'Philippines' },
    { code: 'ZAR', name: 'South African Rand', iso: 'za', flag: '🇿🇦', symbol: 'R', country: 'South Africa' },
    { code: 'RUB', name: 'Russian Ruble', iso: 'ru', flag: '🇷🇺', symbol: '₽', country: 'Russia' },
    { code: 'BRL', name: 'Brazilian Real', iso: 'br', flag: '🇧🇷', symbol: 'R$', country: 'Brazil' },
    { code: 'MXN', name: 'Mexican Peso', iso: 'mx', flag: '🇲🇽', symbol: 'Mex$', country: 'Mexico' },
    { code: 'SEK', name: 'Swedish Krona', iso: 'se', flag: '🇸🇪', symbol: 'kr', country: 'Sweden' },
    { code: 'NOK', name: 'Norwegian Krone', iso: 'no', flag: '🇳🇴', symbol: 'kr', country: 'Norway' },
    { code: 'DKK', name: 'Danish Krone', iso: 'dk', flag: '🇩🇰', symbol: 'kr', country: 'Denmark' },
    { code: 'PLN', name: 'Polish Zloty', iso: 'pl', flag: '🇵🇱', symbol: 'zł', country: 'Poland' },
    { code: 'TRY', name: 'Turkish Lira', iso: 'tr', flag: '🇹🇷', symbol: '₺', country: 'Turkey' },
    { code: 'CZK', name: 'Czech Koruna', iso: 'cz', flag: '🇨🇿', symbol: 'Kč', country: 'Czech Republic' },
    { code: 'HUF', name: 'Hungarian Forint', iso: 'hu', flag: '🇭🇺', symbol: 'Ft', country: 'Hungary' },
    { code: 'ILS', name: 'Israeli New Shekel', iso: 'il', flag: '🇮🇱', symbol: '₪', country: 'Israel' },
    { code: 'BGN', name: 'Bulgarian Lev', iso: 'bg', flag: '🇧🇬', symbol: 'лв', country: 'Bulgaria' },
    { code: 'RON', name: 'Romanian Leu', iso: 'ro', flag: '🇷🇴', symbol: 'lei', country: 'Romania' },
    { code: 'CLP', name: 'Chilean Peso', iso: 'cl', flag: '🇨🇱', symbol: 'CLP$', country: 'Chile' },
    { code: 'COP', name: 'Colombian Peso', iso: 'co', flag: '🇨🇴', symbol: 'COL$', country: 'Colombia' }
  ];

  const STORAGE_KEYS = {
    SESSION: 'bypassfx_session',
    HISTORY: 'bypassfx_history'
  };

  // ============================================================
  // 2. Helper Functions & Flag Rendering
  // ============================================================
  function getCurrencyMeta(code) {
    return CURRENCIES.find(c => c.code === code) || {
      code: code,
      name: code,
      iso: code.slice(0, 2).toLowerCase(),
      flag: '🌐',
      symbol: code,
      country: ''
    };
  }

  function getFlagHtml(currencyMeta, size = 'normal') {
    if (!currencyMeta) return '';
    const iso = (currencyMeta.iso || 'un').toLowerCase();
    const width = size === 'large' ? 26 : 22;
    const height = size === 'large' ? 18 : 15;
    const code = currencyMeta.code || 'Currency';
    const emoji = currencyMeta.flag || '🌐';

    return `<img src="https://flagcdn.com/w40/${iso}.png" srcset="https://flagcdn.com/w80/${iso}.png 2x" width="${width}" height="${height}" alt="${code} flag" class="currency-flag-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"><span class="flag-fallback" style="display:none;">${emoji}</span>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getAuthSession() {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION) || sessionStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearAuthSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  // ============================================================
  // 3. Auth-Gate Modals -- You cant't access without LoggingIn
  // ============================================================
  function showAuthRequiredModal() {
    let modal = document.getElementById('bypassAuthModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bypassAuthModal';
      modal.className = 'bypass-modal-backdrop';
      modal.innerHTML = `
        <div class="bypass-modal-card" role="dialog" aria-labelledby="authModalTitle" aria-modal="true">
          <div class="bypass-modal-icon lock">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <span class="bypass-modal-badge">Access Required</span>
          <h3 id="authModalTitle">Please login to use BYPASSFX</h3>
          <p>Please log in or create an account to access the converter and explore currency routing intelligence.</p>
          <div class="bypass-modal-actions">
            <a href="login.html" class="btn-primary modal-btn">Log In</a>
            <a href="signup.html" class="btn-secondary modal-btn">Create Account</a>
          </div>
          <button type="button" class="bypass-modal-close" id="btnCloseAuthModal" aria-label="Close modal">✕</button>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnCloseAuthModal').addEventListener('click', () => {
        modal.classList.remove('active');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
    modal.classList.add('active');
  }

  // ============================================================
  // 3. Coming Soon --- Converter API will be attached soon
  // ============================================================

  function showConversionComingSoonModal() {
    let modal = document.getElementById('bypassComingSoonModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bypassComingSoonModal';
      modal.className = 'bypass-modal-backdrop';
      modal.innerHTML = `
        <div class="bypass-modal-card" role="dialog" aria-labelledby="csModalTitle" aria-modal="true">
          <div class="bypass-modal-icon rocket">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
            </svg>
          </div>
          <span class="bypass-modal-badge coming-soon">Version 2.0 In Progress</span>
          <h3 id="csModalTitle">Conversion Coming Soon</h3>
          <p>We're currently building the <strong>BYPASSFX conversion engine</strong>. Live multi-hop currency conversion and Dijkstra-optimized pathfinding will be available in the next version.</p>
          <div class="bypass-modal-actions single">
            <button type="button" class="btn-primary modal-btn" id="btnGotIt">Got it</button>
          </div>
          <button type="button" class="bypass-modal-close" id="btnCloseCSModal" aria-label="Close modal">✕</button>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnGotIt').addEventListener('click', () => {
        modal.classList.remove('active');
      });
      modal.querySelector('#btnCloseCSModal').addEventListener('click', () => {
        modal.classList.remove('active');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
    modal.classList.add('active');
  }

  // ============================================================
  // 4. Custom Currency Dropdown Component
  // ============================================================
  class CustomCurrencyDropdown {
    constructor(containerId, triggerId, menuId, searchInputId, listId, hiddenInputId, flagId, codeId, nameId, defaultCode) {
      this.container = document.getElementById(containerId);
      this.trigger = document.getElementById(triggerId);
      this.menu = document.getElementById(menuId);
      this.searchInput = document.getElementById(searchInputId);
      this.list = document.getElementById(listId);
      this.hiddenInput = document.getElementById(hiddenInputId);
      this.flagEl = document.getElementById(flagId);
      this.codeEl = document.getElementById(codeId);
      this.nameEl = document.getElementById(nameId);

      this.selectedCode = defaultCode || 'USD';
      this.searchTerm = '';
      this.isOpen = false;

      if (this.container && this.trigger && this.menu) {
        this.init();
      }
    }

    init() {
      this.setValue(this.selectedCode, false);

      this.trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });

      if (this.searchInput) {
        this.searchInput.addEventListener('click', (e) => e.stopPropagation());
        this.searchInput.addEventListener('input', (e) => {
          this.searchTerm = e.target.value.toLowerCase().trim();
          this.renderList();
        });
      }

      this.menu.querySelectorAll('.quick-hub-btn').forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const code = pill.dataset.code;
          if (code) {
            this.setValue(code, true);
            this.close();
          }
        });
      });

      document.addEventListener('click', (e) => {
        if (this.isOpen && !this.container.contains(e.target)) {
          this.close();
        }
      });

      this.trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.open();
        }
      });
    }

    renderList() {
      const term = this.searchTerm;
      const filtered = CURRENCIES.filter(c => {
        if (!term) return true;
        return c.code.toLowerCase().includes(term) ||
               c.name.toLowerCase().includes(term) ||
               (c.country && c.country.toLowerCase().includes(term));
      });

      if (filtered.length === 0) {
        this.list.innerHTML = `
          <div class="dropdown-no-results">
            <span>No matching currency found</span>
          </div>
        `;
        return;
      }

      this.list.innerHTML = filtered.map(c => {
        const isSelected = c.code === this.selectedCode;
        return `
          <div class="dropdown-currency-item ${isSelected ? 'selected' : ''}" data-code="${c.code}" role="option" aria-selected="${isSelected}">
            <div class="item-left">
              <span class="item-flag">${getFlagHtml(c)}</span>
              <div class="item-text-wrap">
                <span class="item-code">${c.code}</span>
                <span class="item-name"> — ${escapeHtml(c.name)}</span>
              </div>
            </div>
            <div class="item-right">
              <span class="item-symbol">${c.symbol}</span>
              <span class="item-check">✓</span>
            </div>
          </div>
        `;
      }).join('');

      this.list.querySelectorAll('.dropdown-currency-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const code = item.dataset.code;
          if (code) {
            this.setValue(code, true);
            this.close();
          }
        });
      });
    }

    setValue(code, triggerEvent = true) {
      const meta = getCurrencyMeta(code);
      this.selectedCode = meta.code;

      if (this.hiddenInput) this.hiddenInput.value = meta.code;
      if (this.flagEl) this.flagEl.innerHTML = getFlagHtml(meta);
      if (this.codeEl) this.codeEl.textContent = meta.code;
      if (this.nameEl) this.nameEl.textContent = `— ${meta.name}`;

      if (this.list) {
        this.list.querySelectorAll('.dropdown-currency-item').forEach(el => {
          const isMatch = el.dataset.code === meta.code;
          el.classList.toggle('selected', isMatch);
          el.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        });
      }

      if (triggerEvent) {
        const event = new CustomEvent('currencychange', { detail: { code: meta.code } });
        this.container.dispatchEvent(event);
      }
    }

    getValue() {
      return this.selectedCode;
    }

    open() {
      document.querySelectorAll('.custom-currency-dropdown.active').forEach(d => {
        if (d !== this.container) d.classList.remove('active');
      });

      this.isOpen = true;
      this.container.classList.add('active');
      this.trigger.setAttribute('aria-expanded', 'true');
      this.searchTerm = '';
      if (this.searchInput) {
        this.searchInput.value = '';
        setTimeout(() => this.searchInput.focus(), 50);
      }
      this.renderList();
    }

    close() {
      this.isOpen = false;
      this.container.classList.remove('active');
      this.trigger.setAttribute('aria-expanded', 'false');
    }

    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    }
  }

  // ============================================================
  // 5. Converter Controller (Auth Gated)
  // ============================================================
  let fromDropdownInstance = null;
  let toDropdownInstance = null;

  function initConverter() {
    const form = document.getElementById('converterFormMain');
    if (!form) return;

    fromDropdownInstance = new CustomCurrencyDropdown(
      'fromDropdownContainer',
      'fromCurrencyTrigger',
      'fromDropdownMenu',
      'fromSearchInput',
      'fromCurrencyList',
      'fromCurrency',
      'fromFlag',
      'fromCode',
      'fromName',
      'INR'
    );

    toDropdownInstance = new CustomCurrencyDropdown(
      'toDropdownContainer',
      'toCurrencyTrigger',
      'toDropdownMenu',
      'toSearchInput',
      'toCurrencyList',
      'toCurrency',
      'toFlag',
      'toCode',
      'toName',
      'EUR'
    );

    // Currency Swap Button
    const btnSwap = document.getElementById('btnSwapCurrencies');
    if (btnSwap) {
      btnSwap.addEventListener('click', () => {
        const currentFrom = fromDropdownInstance.getValue();
        const currentTo = toDropdownInstance.getValue();

        fromDropdownInstance.setValue(currentTo, true);
        toDropdownInstance.setValue(currentFrom, true);

        btnSwap.style.transform = 'rotate(180deg) scale(1.1)';
        setTimeout(() => {
          btnSwap.style.transform = '';
        }, 300);
      });
    }

    // Quick Amount Preset Chips
    document.querySelectorAll('.quick-chips .chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amountInput = document.getElementById('convertAmount');
        if (amountInput) {
          amountInput.value = btn.dataset.value;
        }
      });
    });

    // Converter Form Submit (Auth Gated)
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const session = getAuthSession();
      if (!session) {
        showAuthRequiredModal();
        return;
      }

      showConversionComingSoonModal();
    });
  }

  // ============================================================
  // 6. Supported Currencies Showcase Grid
  // ============================================================
  function initCurrenciesGrid() {
    const grid = document.getElementById('currenciesGrid');
    if (!grid) return;

    grid.innerHTML = CURRENCIES.map(curr => `
      <div class="currency-grid-tile" data-code="${curr.code}">
        <span class="flag">${getFlagHtml(curr, 'large')}</span>
        <div class="info">
          <span class="code">${curr.code}</span>
          <span class="name">${escapeHtml(curr.name)}</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.currency-grid-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const code = tile.dataset.code;
        if (fromDropdownInstance && toDropdownInstance) {
          if (fromDropdownInstance.getValue() !== code) {
            toDropdownInstance.setValue(code, true);
          } else {
            toDropdownInstance.setValue('USD', true);
          }
          const converterSec = document.getElementById('converterSection');
          if (converterSec) {
            converterSec.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });

    const searchInput = document.getElementById('currencySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        grid.querySelectorAll('.currency-grid-tile').forEach(tile => {
          const code = tile.getAttribute('data-code').toLowerCase();
          const text = tile.textContent.toLowerCase();
          const match = code.includes(term) || text.includes(term);
          tile.style.display = match ? 'flex' : 'none';
        });
      });
    }
  }

  // ============================================================
  // 7. Static Clean Ticker Section (No External APIs)
  // ============================================================
  const STATIC_TICKER_ITEMS = [
    { label: 'USD/INR', status: 'Active Corridor' },
    { label: 'EUR/USD', status: 'Active Corridor' },
    { label: 'GBP/INR', status: 'Active Corridor' },
    { label: 'USD/JPY', status: 'Active Corridor' },
    { label: 'EUR/GBP', status: 'Active Corridor' },
    { label: 'AUD/USD', status: 'Active Corridor' },
    { label: 'USD/AED', status: 'Active Corridor' },
    { label: 'USD/CAD', status: 'Active Corridor' },
    { label: 'USD/SAR', status: 'Active Corridor' },
    { label: 'EUR/INR', status: 'Active Corridor' }
  ];

  function initTicker() {
    const track = document.getElementById('tickerTrackHome');
    if (!track) return;

    const items = STATIC_TICKER_ITEMS.map(pair => `
      <span class="tick-item up">
        <b>${pair.label}</b>
        <span class="rate">${pair.status}</span>
        <span>●</span>
      </span>
    `).join('');

    track.innerHTML = items + items;
  }

  // ============================================================
  // 8. Conversion History Placeholder
  // ============================================================
  function renderHistorySection() {
    const container = document.getElementById('historyContainer');
    const clearBtn = document.getElementById('btnClearHistory');
    if (!container) return;

    container.innerHTML = `
      <div class="history-empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <p>Conversion logging and multi-hop route history will be enabled in the next version of BYPASSFX.</p>
      </div>
    `;
    if (clearBtn) clearBtn.style.display = 'none';
  }

  // ============================================================
  // 9. Navbar Session & Auth State Manager
  // ============================================================
  function updateNavbarAuth() {
    const navRight = document.getElementById('navRightContainer');
    const mobileAuth = document.getElementById('mobileNavAuthContainer');
    const session = getAuthSession();

    if (session) {
      const firstName = session.name ? session.name.split(' ')[0] : 'Account';

      if (navRight) {
        navRight.innerHTML = `
          <a href="profile.html" class="user-badge-pill" title="View Account Profile">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>${escapeHtml(firstName)}</span>
          </a>
        `;
      }

      if (mobileAuth) {
        mobileAuth.innerHTML = `
          <a href="profile.html" class="btn-primary" style="text-align:center;">${escapeHtml(firstName)}</a>
        `;
      }
    } else {
      if (navRight) {
        navRight.innerHTML = `
          <a href="login.html" class="btn-nav-login" id="navBtnLogin">Log in</a>
          <a href="signup.html" class="btn-nav-signup" id="navBtnSignup">Sign up</a>
        `;
      }

      if (mobileAuth) {
        mobileAuth.innerHTML = `
          <a href="login.html" class="btn-secondary" style="text-align: center;">Log in</a>
          <a href="signup.html" class="btn-primary" style="text-align: center;">Sign up</a>
        `;
      }
    }
  }

  function initNavigation() {
    const menuBtn = document.getElementById('menuToggleBtn');
    const mobileNav = document.getElementById('mobileNavDrawer');

    if (menuBtn && mobileNav) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileNav.classList.toggle('open');
      });

      mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileNav.classList.remove('open');
        });
      });

      document.addEventListener('click', (e) => {
        if (mobileNav.classList.contains('open') && !mobileNav.contains(e.target) && !menuBtn.contains(e.target)) {
          mobileNav.classList.remove('open');
        }
      });
    }
  }

  // ============================================================
  // 10. Page Bootstrap
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    updateNavbarAuth();
    initConverter();
    initCurrenciesGrid();
    renderHistorySection();
    initTicker();
    initNavigation();
  });
})();

