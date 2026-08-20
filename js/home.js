/**
 * BypassFX — Homepage Engine (Pure Vanilla JS)
 * Graph Arbitrage Calculator, Multi-Hop Pathfinder & Interactive UI Controller
 * With Custom Searchable Currency Dropdowns, Auth Protection & LTR Ticker
 */

// ============================================================
// 1. Currency Definitions & Metadata
// ============================================================
const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', symbol: '¥' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', symbol: 'S$' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿', symbol: 'NZ$' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰', symbol: 'HK$' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', symbol: 'AED' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪', symbol: 'kr' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽', symbol: 'Mex$' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦', symbol: 'R' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱', symbol: 'zł' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭', symbol: '฿' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷', symbol: '₩' }
];

const HUB_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD'];

// Realistic provider fee configurations
const PROVIDERS = [
  { name: 'Wise (Optimal)', feePercent: 0.0045, feeFixed: 0 },
  { name: 'Revolut FX', feePercent: 0.0050, feeFixed: 0 },
  { name: 'Bank Wire', feePercent: 0.0180, feeFixed: 15 },
  { name: 'PayPal FX', feePercent: 0.0380, feeFixed: 0 }
];

// Baseline Mid-Market Rates (per 1 USD) for offline resilience & immediate calculations
const USD_BASELINE_RATES = {
  USD: 1.0,
  INR: 86.8500,
  EUR: 0.9250,
  GBP: 0.7920,
  JPY: 153.40,
  AUD: 1.5420,
  CAD: 1.3850,
  CHF: 0.8850,
  CNY: 7.2450,
  SGD: 1.3480,
  NZD: 1.6950,
  HKD: 7.7800,
  AED: 3.6720,
  SEK: 10.6500,
  BRL: 5.6200,
  MXN: 20.1500,
  ZAR: 18.2500,
  NOK: 10.8500,
  DKK: 6.9000,
  PLN: 3.9800,
  THB: 34.6000,
  KRW: 1395.0
};

const STORAGE_KEYS = {
  HISTORY: 'bypassfx_history',
  SESSION: 'bypassfx_session',
  RATES_CACHE: 'bypassfx_rates_cache'
};

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW']);

// ============================================================
// 2. Auth Session Management & Helpers
// ============================================================
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
  window.location.reload();
}

function showAuthModal() {
  const modal = document.getElementById('authRequiredModal');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function hideAuthModal() {
  const modal = document.getElementById('authRequiredModal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function getCurrencyMeta(code) {
  return CURRENCIES.find(c => c.code === code) || { code, name: code, flag: '🌐', symbol: code };
}

function formatCurrencyAmount(amount, currencyCode) {
  if (amount == null || isNaN(amount)) return '0.00';
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currencyCode) ? 0 : 2;
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// 3. Custom Searchable Currency Dropdowns
// ============================================================
let currentFromCurrency = 'INR';
let currentToCurrency = 'EUR';

function setFromCurrency(code) {
  const meta = getCurrencyMeta(code);
  currentFromCurrency = meta.code;

  const hiddenInput = document.getElementById('fromCurrency');
  const flagEl = document.getElementById('fromFlag');
  const codeEl = document.getElementById('fromCode');
  const nameEl = document.getElementById('fromName');
  const container = document.getElementById('fromDropdownContainer');

  if (hiddenInput) hiddenInput.value = meta.code;
  if (flagEl) flagEl.textContent = meta.flag;
  if (codeEl) codeEl.textContent = meta.code;
  if (nameEl) nameEl.textContent = `- ${meta.name}`;
  if (container) container.classList.remove('active');

  renderDropdownList('from');
}

function setToCurrency(code) {
  const meta = getCurrencyMeta(code);
  currentToCurrency = meta.code;

  const hiddenInput = document.getElementById('toCurrency');
  const flagEl = document.getElementById('toFlag');
  const codeEl = document.getElementById('toCode');
  const nameEl = document.getElementById('toName');
  const container = document.getElementById('toDropdownContainer');

  if (hiddenInput) hiddenInput.value = meta.code;
  if (flagEl) flagEl.textContent = meta.flag;
  if (codeEl) codeEl.textContent = meta.code;
  if (nameEl) nameEl.textContent = `- ${meta.name}`;
  if (container) container.classList.remove('active');

  renderDropdownList('to');
}

function renderDropdownList(type, searchTerm = '') {
  const listEl = document.getElementById(type === 'from' ? 'fromCurrencyList' : 'toCurrencyList');
  if (!listEl) return;

  const activeCode = type === 'from' ? currentFromCurrency : currentToCurrency;
  const term = searchTerm.toLowerCase().trim();

  const filtered = CURRENCIES.filter(c => {
    if (!term) return true;
    return c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term);
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="dropdown-no-results">No currencies found matching "${escapeHtml(searchTerm)}"</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(c => {
    const isSelected = c.code === activeCode;
    return `
      <div class="dropdown-currency-item ${isSelected ? 'selected' : ''}" data-code="${c.code}" data-target="${type}">
        <div class="item-left">
          <span class="item-flag">${c.flag}</span>
          <div>
            <span class="item-code">${c.code}</span>
            <span class="item-name">- ${c.name}</span>
          </div>
        </div>
        <div class="item-right">
          <span class="item-symbol">${c.symbol}</span>
          <svg class="item-check" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listeners to items
  listEl.querySelectorAll('.dropdown-currency-item').forEach(item => {
    item.addEventListener('click', () => {
      const code = item.getAttribute('data-code');
      const target = item.getAttribute('data-target');
      if (target === 'from') {
        setFromCurrency(code);
      } else {
        setToCurrency(code);
      }
    });
  });
}

function initCustomDropdowns() {
  const fromContainer = document.getElementById('fromDropdownContainer');
  const toContainer = document.getElementById('toDropdownContainer');
  const fromTrigger = document.getElementById('fromCurrencyTrigger');
  const toTrigger = document.getElementById('toCurrencyTrigger');
  const fromSearch = document.getElementById('fromSearchInput');
  const toSearch = document.getElementById('toSearchInput');

  // Initial list population
  setFromCurrency(currentFromCurrency);
  setToCurrency(currentToCurrency);

  // Trigger toggle for FROM
  if (fromTrigger && fromContainer) {
    fromTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = fromContainer.classList.contains('active');
      if (toContainer) toContainer.classList.remove('active');
      fromContainer.classList.toggle('active');
      if (!isOpen && fromSearch) {
        fromSearch.value = '';
        renderDropdownList('from', '');
        setTimeout(() => fromSearch.focus(), 50);
      }
    });
  }

  // Trigger toggle for TO
  if (toTrigger && toContainer) {
    toTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = toContainer.classList.contains('active');
      if (fromContainer) fromContainer.classList.remove('active');
      toContainer.classList.toggle('active');
      if (!isOpen && toSearch) {
        toSearch.value = '';
        renderDropdownList('to', '');
        setTimeout(() => toSearch.focus(), 50);
      }
    });
  }

  // Search input typing filters
  if (fromSearch) {
    fromSearch.addEventListener('input', (e) => {
      renderDropdownList('from', e.target.value);
    });
    fromSearch.addEventListener('click', (e) => e.stopPropagation());
  }

  if (toSearch) {
    toSearch.addEventListener('input', (e) => {
      renderDropdownList('to', e.target.value);
    });
    toSearch.addEventListener('click', (e) => e.stopPropagation());
  }

  // Popular Hub Quick Pills
  document.querySelectorAll('.hub-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = pill.getAttribute('data-code');
      const target = pill.getAttribute('data-target');
      if (target === 'from') {
        setFromCurrency(code);
      } else {
        setToCurrency(code);
      }
    });
  });

  // Click outside to close both dropdowns
  document.addEventListener('click', (e) => {
    if (fromContainer && !fromContainer.contains(e.target)) {
      fromContainer.classList.remove('active');
    }
    if (toContainer && !toContainer.contains(e.target)) {
      toContainer.classList.remove('active');
    }
  });

  // Escape key closes open dropdowns
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (fromContainer) fromContainer.classList.remove('active');
      if (toContainer) toContainer.classList.remove('active');
    }
  });
}

// ============================================================
// 4. Exchange Rate Service (Fetch API + Local Cache + Fallback)
// ============================================================
async function fetchExchangeRates(baseCurrency) {
  const cacheKey = `${STORAGE_KEYS.RATES_CACHE}_${baseCurrency}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
        return parsed.rates;
      }
    } catch (e) {}
  }

  // Live fetch from Frankfurter API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const liveRates = { ...data.rates, [baseCurrency]: 1.0 };
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        rates: liveRates
      }));
      return liveRates;
    }
  } catch (err) {
    // Graceful fallback to cross rates
  }

  // Cross-rate fallback model
  const baseRateToUSD = USD_BASELINE_RATES[baseCurrency] || 1.0;
  const rates = {};
  for (const [code, rateInUSD] of Object.entries(USD_BASELINE_RATES)) {
    rates[code] = rateInUSD / baseRateToUSD;
  }
  return rates;
}

// ============================================================
// 5. Graph Construction & Dijkstra Arbitrage Pathfinder
// ============================================================
function buildCurrencyGraph(ratesByBase, allowedNodes) {
  const allowed = new Set(allowedNodes);
  const graph = {};

  for (const base of Object.keys(ratesByBase)) {
    graph[base] = [];
    const quotes = ratesByBase[base];

    for (const quote of Object.keys(quotes)) {
      if (!allowed.has(quote) || quote === base) continue;
      const rate = quotes[quote];
      if (!rate || rate <= 0) continue;

      for (const provider of PROVIDERS) {
        graph[base].push({
          from: base,
          to: quote,
          provider: provider.name,
          rate,
          feePercent: provider.feePercent,
          feeFixed: provider.feeFixed
        });
      }
    }
  }
  return graph;
}

function findBestPath(graph, from, to, initialAmount, maxHops = 3) {
  if (from === to || initialAmount <= 0) {
    return { best: null, alternatives: [], direct: null };
  }

  const allFoundRoutes = [];

  function explore(currentNode, currentCapital, currentPath, visitedNodes) {
    if (currentNode === to) {
      allFoundRoutes.push({
        finalAmount: currentCapital,
        path: [...currentPath],
        hops: currentPath.length,
        totalFeesPaid: currentPath.reduce((acc, leg) => acc + leg.feePaidInSource, 0)
      });
    }

    if (currentPath.length >= maxHops) return;

    const edges = graph[currentNode] || [];
    for (const edge of edges) {
      if (visitedNodes.has(edge.to)) continue;

      const feeInSource = (currentCapital * edge.feePercent) + (edge.feeFixed / (edge.rate || 1));
      const capitalAfterFee = currentCapital - feeInSource;

      if (capitalAfterFee <= 0) continue;

      const convertedAmount = capitalAfterFee * edge.rate;

      visitedNodes.add(edge.to);
      currentPath.push({
        from: edge.from,
        to: edge.to,
        provider: edge.provider,
        rate: edge.rate,
        feePercent: edge.feePercent,
        feeFixed: edge.feeFixed,
        feePaidInSource: feeInSource,
        amountBefore: currentCapital,
        amountAfter: convertedAmount
      });

      explore(edge.to, convertedAmount, currentPath, visitedNodes);

      currentPath.pop();
      visitedNodes.delete(edge.to);
    }
  }

  explore(from, initialAmount, [], new Set([from]));

  if (allFoundRoutes.length === 0) {
    return { best: null, alternatives: [], direct: null };
  }

  allFoundRoutes.sort((a, b) => b.finalAmount - a.finalAmount);

  const best = allFoundRoutes[0];
  const direct = allFoundRoutes.find(r => r.hops === 1) || null;

  const seenSignatures = new Set();
  const alternatives = [];

  for (const r of allFoundRoutes) {
    const sig = r.path.map(p => `${p.from}->${p.to}`).join('|');
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      alternatives.push(r);
    }
    if (alternatives.length >= 4) break;
  }

  return { best, alternatives, direct };
}

// ============================================================
// 6. History Storage & Auth-Gated Rendering
// ============================================================
function saveToHistory(entry) {
  const session = getAuthSession();
  if (!session) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: 'bfx_' + Date.now(),
      userId: session.id,
      date: new Date().toISOString(),
      ...entry
    });
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(list.slice(0, 20)));
    renderHistory();
  } catch (err) {
    console.error('Failed to save to history:', err);
  }
}

function loadHistoryList() {
  const session = getAuthSession();
  if (!session) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const list = raw ? JSON.parse(raw) : [];
    return list.filter(item => !item.userId || item.userId === session.id);
  } catch (err) {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('historyContainer');
  const clearBtn = document.getElementById('btnClearHistory');
  if (!container) return;

  const session = getAuthSession();

  // LOCKED STATE: If user is NOT logged in
  if (!session) {
    if (clearBtn) clearBtn.style.display = 'none';
    container.innerHTML = `
      <div class="history-locked-card">
        <div class="lock-icon-circle">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3>Login Required to View History</h3>
        <p>Your multi-hop conversion history and saved route logs are protected and linked to your BypassFX account. Sign in to view and re-run your previous calculations.</p>
        <div class="history-locked-actions">
          <a href="login.html" class="btn-primary">Log in to Access History</a>
          <a href="signup.html" class="btn-secondary">Create Account</a>
        </div>
      </div>
    `;
    return;
  }

  // UNLOCKED STATE: Logged-in user
  if (clearBtn) clearBtn.style.display = 'inline-block';
  const history = loadHistoryList();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="history-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="12 7 12 12 15 15"/>
        </svg>
        <p>No conversions calculated yet. Use the converter above to discover optimal arbitrage paths.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map(item => {
    const fromMeta = getCurrencyMeta(item.from);
    const toMeta = getCurrencyMeta(item.to);
    const formattedDate = new Date(item.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const routeStr = item.pathStr || `${item.from} → ${item.to}`;

    return `
      <div class="history-row-item">
        <div class="history-item-left">
          <div>
            <div class="history-path-badge">${fromMeta.flag} ${formatCurrencyAmount(item.amount, item.from)} ${item.from} → ${toMeta.flag} ${routeStr}</div>
            <div class="history-date">${formattedDate} · Savings: +${toMeta.symbol}${formatCurrencyAmount(item.savings, item.to)}</div>
          </div>
        </div>
        <div class="history-item-right">
          <span class="history-final-val">${toMeta.symbol}${formatCurrencyAmount(item.finalAmount, item.to)} ${item.to}</span>
          <button class="btn-rerun" onclick="window.rerunConversion('${item.from}', '${item.to}', ${item.amount})">Re-run</button>
        </div>
      </div>
    `;
  }).join('');
}

// Global hook to re-run an entry from history
window.rerunConversion = function(from, to, amount) {
  const session = getAuthSession();
  if (!session) {
    showAuthModal();
    return;
  }

  setFromCurrency(from);
  setToCurrency(to);

  const amountInput = document.getElementById('convertAmount');
  if (amountInput) {
    amountInput.value = amount;
    document.getElementById('converterSection').scrollIntoView({ behavior: 'smooth' });
    triggerConversionCalculation();
  }
};

// ============================================================
// 7. UI Rendering & Event Initializers
// ============================================================
function updateNavbarAuth() {
  const navRight = document.querySelector('.nav-right');
  const mobileAuth = document.querySelector('.mobile-nav-auth');
  const session = getAuthSession();

  if (session && navRight) {
    const firstName = session.name ? session.name.split(' ')[0] : 'Member';
    navRight.innerHTML = `
      <div class="user-nav-profile">
        <a href="profile.html" class="user-badge-pill" title="View Account Profile">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>${escapeHtml(firstName)}</span>
        </a>
        <button type="button" class="btn-nav-logout" id="btnLogoutNav">Log out</button>
      </div>
    `;

    const logoutBtn = document.getElementById('btnLogoutNav');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', clearAuthSession);
    }
  }

  if (session && mobileAuth) {
    const firstName = session.name ? session.name.split(' ')[0] : 'Member';
    mobileAuth.innerHTML = `
      <a href="profile.html" class="btn-primary" style="text-align:center;">👤 ${escapeHtml(firstName)} (Profile)</a>
      <button type="button" class="btn-secondary" id="btnLogoutMobile" style="text-align:center;">Log out</button>
    `;
    const logoutMobile = document.getElementById('btnLogoutMobile');
    if (logoutMobile) {
      logoutMobile.addEventListener('click', clearAuthSession);
    }
  }
}

function initCurrenciesGrid() {
  const grid = document.getElementById('currenciesGrid');
  if (!grid) return;

  grid.innerHTML = CURRENCIES.map(curr => `
    <div class="currency-grid-tile" data-code="${curr.code}">
      <span class="flag">${curr.flag}</span>
      <div class="info">
        <span class="code">${curr.code}</span>
        <span class="name">${curr.name}</span>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.currency-grid-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const code = tile.getAttribute('data-code');
      setToCurrency(code);
      document.getElementById('converterSection').scrollIntoView({ behavior: 'smooth' });

      const session = getAuthSession();
      if (session) {
        triggerConversionCalculation();
      } else {
        showAuthModal();
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

function initQuickChips() {
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-value');
      const input = document.getElementById('convertAmount');
      if (input && val) {
        input.value = val;
      }
    });
  });
}

function initSwapButton() {
  const swapBtn = document.getElementById('btnSwapCurrencies');

  if (swapBtn) {
    let rotation = 0;
    swapBtn.addEventListener('click', () => {
      rotation += 180;
      swapBtn.style.transform = `rotate(${rotation}deg)`;

      const temp = currentFromCurrency;
      setFromCurrency(currentToCurrency);
      setToCurrency(temp);
    });
  }
}

// ============================================================
// 8. Core Conversion Flow & Visualizer Output
// ============================================================
async function triggerConversionCalculation() {
  const session = getAuthSession();
  if (!session) {
    showAuthModal();
    return;
  }

  const amountInput = document.getElementById('convertAmount');
  const hopSelect = document.getElementById('maxHopsSelect');
  const submitBtn = document.getElementById('btnSubmitConvert');
  const resultWrapper = document.getElementById('resultSection');

  if (!amountInput || !resultWrapper) return;

  const from = currentFromCurrency;
  const to = currentToCurrency;
  const amount = parseFloat(amountInput.value);
  const maxHops = parseInt(hopSelect ? hopSelect.value : '3', 10);

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid conversion amount greater than 0.');
    return;
  }

  if (from === to) {
    alert('Please select two different currencies to calculate arbitrage.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="animation: spin 1s linear infinite;">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>Calculating Best Route…</span>
    `;
  }

  try {
    const nodes = Array.from(new Set([from, to, ...HUB_CURRENCIES]));
    const ratesMap = {};
    await Promise.all(nodes.map(async (node) => {
      ratesMap[node] = await fetchExchangeRates(node);
    }));

    const graph = buildCurrencyGraph(ratesMap, nodes);
    const { best, alternatives, direct } = findBestPath(graph, from, to, amount, maxHops);

    if (!best) {
      alert(`No valid route found between ${from} and ${to}. Try increasing the max hops.`);
      return;
    }

    renderBestResult(from, to, amount, best, direct, alternatives);

    const directAmt = direct ? direct.finalAmount : best.finalAmount;
    const savings = Math.max(0, best.finalAmount - directAmt);
    const pathStr = best.path.length === 1
      ? `${from} → ${to}`
      : `${from} → ` + best.path.map(p => p.to).join(' → ');

    saveToHistory({
      from,
      to,
      amount,
      finalAmount: best.finalAmount,
      savings,
      pathStr
    });

    resultWrapper.classList.add('show');
    resultWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error('Arbitrage calculation error:', err);
    alert('Failed to calculate conversion rates. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Find Best Route</span>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M4.167 10h11.666M10.833 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
  }
}

function renderBestResult(from, to, amount, best, direct, alternatives) {
  const fromMeta = getCurrencyMeta(from);
  const toMeta = getCurrencyMeta(to);

  const directAmt = direct ? direct.finalAmount : (amount * (USD_BASELINE_RATES[to] / USD_BASELINE_RATES[from]));
  const savings = Math.max(0, best.finalAmount - directAmt);
  const isMultiHop = best.path.length > 1;

  const summaryEl = document.getElementById('resultSummaryHeading');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="input-ref">Converting ${fromMeta.symbol}${formatCurrencyAmount(amount, from)} ${from}</div>
      <div class="output-hero">${toMeta.symbol}${formatCurrencyAmount(best.finalAmount, to)} <span>${to}</span></div>
    `;
  }

  const savingsBadgeEl = document.getElementById('resultSavingsBadge');
  if (savingsBadgeEl) {
    if (savings > 0 && isMultiHop) {
      savingsBadgeEl.style.display = 'inline-flex';
      savingsBadgeEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11v4h3l-4 5v-4H7l4-5z" fill="currentColor"/></svg>
        +${toMeta.symbol}${formatCurrencyAmount(savings, to)} ${to} vs Direct Route
      `;
    } else {
      savingsBadgeEl.style.display = 'inline-flex';
      savingsBadgeEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/></svg>
        Optimal Route Confirmed
      `;
    }
  }

  const visualizerEl = document.getElementById('routeChainNodes');
  if (visualizerEl) {
    let nodesHtml = '';

    nodesHtml += `
      <div class="route-node">
        <div class="node-flag">${fromMeta.flag}</div>
        <span class="node-amount">${fromMeta.symbol}${formatCurrencyAmount(amount, from)}</span>
        <span class="node-code">${from}</span>
      </div>
    `;

    best.path.forEach(leg => {
      const legToMeta = getCurrencyMeta(leg.to);
      const feePct = (leg.feePercent * 100).toFixed(1);

      nodesHtml += `
        <div class="route-edge">
          <span class="edge-provider-badge">${escapeHtml(leg.provider)}</span>
          <div class="edge-arrow">
            <div class="edge-line"></div>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </div>
          <span class="edge-fee-info">${feePct}% fee</span>
        </div>

        <div class="route-node">
          <div class="node-flag">${legToMeta.flag}</div>
          <span class="node-amount">${legToMeta.symbol}${formatCurrencyAmount(leg.amountAfter, leg.to)}</span>
          <span class="node-code">${leg.to}</span>
        </div>
      `;
    });

    visualizerEl.innerHTML = nodesHtml;
  }

  const metricFinalEl = document.getElementById('metricFinalAmount');
  const metricFeeEl = document.getElementById('metricTotalFee');
  const metricSavingsEl = document.getElementById('metricSavings');

  if (metricFinalEl) metricFinalEl.textContent = `${toMeta.symbol}${formatCurrencyAmount(best.finalAmount, to)}`;
  if (metricFeeEl) metricFeeEl.textContent = `${fromMeta.symbol}${formatCurrencyAmount(best.totalFeesPaid, from)}`;
  if (metricSavingsEl) {
    if (savings > 0) {
      metricSavingsEl.textContent = `+${toMeta.symbol}${formatCurrencyAmount(savings, to)}`;
      metricSavingsEl.className = 'metric-val green';
    } else {
      metricSavingsEl.textContent = 'Direct was optimal';
      metricSavingsEl.className = 'metric-val';
    }
  }

  const compareListEl = document.getElementById('alternativeRoutesList');
  if (compareListEl) {
    compareListEl.innerHTML = alternatives.map((route, idx) => {
      const isBest = idx === 0;
      const pathLabel = [from, ...route.path.map(p => p.to)].join(' → ');
      const diff = route.finalAmount - directAmt;
      const diffStr = diff > 0
        ? `+${toMeta.symbol}${formatCurrencyAmount(diff, to)}`
        : diff < 0
          ? `-${toMeta.symbol}${formatCurrencyAmount(Math.abs(diff), to)}`
          : 'Baseline';

      return `
        <div class="route-compare-item ${isBest ? 'best' : ''}">
          <div class="route-path-str">
            <span class="user-route">${pathLabel}</span>
            ${isBest ? '<span class="badge-mini-best">BEST ROUTE</span>' : ''}
            ${route.hops === 1 ? '<span style="font-size: 0.72rem; color: var(--text-secondary);">(Direct)</span>' : ''}
          </div>
          <div class="route-outcome">
            <div class="outcome-amt">${toMeta.symbol}${formatCurrencyAmount(route.finalAmount, to)} ${to}</div>
            <div class="outcome-diff ${diff > 0 ? 'positive' : ''}">
              ${diff > 0 ? 'Savings: ' + diffStr : diffStr === 'Baseline' ? 'Direct rate' : 'Yield: ' + diffStr}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ============================================================
// 9. Trends Marquee (Left-to-Right Animated Bar)
// ============================================================
const TICKER_PAIRS = [
  { base: 'USD', quote: 'INR', label: 'USD/INR', decimals: 4, up: true },
  { base: 'EUR', quote: 'USD', label: 'EUR/USD', decimals: 4, up: false },
  { base: 'GBP', quote: 'INR', label: 'GBP/INR', decimals: 4, up: true },
  { base: 'USD', quote: 'JPY', label: 'USD/JPY', decimals: 2, up: false },
  { base: 'EUR', quote: 'GBP', label: 'EUR/GBP', decimals: 4, up: true },
  { base: 'AUD', quote: 'USD', label: 'AUD/USD', decimals: 4, up: false },
  { base: 'USD', quote: 'AED', label: 'USD/AED', decimals: 4, up: true },
  { base: 'USD', quote: 'CAD', label: 'USD/CAD', decimals: 4, up: false }
];

async function initTicker() {
  const track = document.getElementById('tickerTrackHome');
  if (!track) return;

  try {
    const usdRates = await fetchExchangeRates('USD');
    const eurRates = await fetchExchangeRates('EUR');
    const gbpRates = await fetchExchangeRates('GBP');
    const audRates = await fetchExchangeRates('AUD');

    const ratesByBase = { USD: usdRates, EUR: eurRates, GBP: gbpRates, AUD: audRates };

    const items = TICKER_PAIRS.map(pair => {
      const r = ratesByBase[pair.base] ? ratesByBase[pair.base][pair.quote] : USD_BASELINE_RATES[pair.quote];
      const rateVal = r != null ? Number(r).toFixed(pair.decimals) : '--';
      const isUp = pair.up;
      return `
        <span class="tick-item ${isUp ? 'up' : 'down'}">
          <b>${pair.label}</b>
          <span class="rate">${rateVal}</span>
          <span>${isUp ? '▲' : '▼'}</span>
        </span>
      `;
    }).join('');

    track.innerHTML = items + items;
  } catch (e) {
    console.error('Ticker error:', e);
  }
}

// ============================================================
// 10. Page Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  initCustomDropdowns();
  initCurrenciesGrid();
  initQuickChips();
  initSwapButton();
  initTicker();
  renderHistory();

  // Converter Form Submit — requires auth
  const convertForm = document.getElementById('converterFormMain');
  if (convertForm) {
    convertForm.addEventListener('submit', (e) => {
      e.preventDefault();
      triggerConversionCalculation();
    });
  }

  // Clear History Button
  const clearHistBtn = document.getElementById('btnClearHistory');
  if (clearHistBtn) {
    clearHistBtn.addEventListener('click', () => {
      if (confirm('Clear all stored conversion history?')) {
        clearHistory();
      }
    });
  }

  // Auth Modal Close Buttons
  const closeAuthBtn = document.getElementById('btnCloseAuthModal');
  const authModal = document.getElementById('authRequiredModal');
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', hideAuthModal);
  }
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) hideAuthModal();
    });
  }

  // Mobile Menu Toggle
  const menuBtn = document.getElementById('menuToggleBtn');
  const mobileNav = document.getElementById('mobileNavDrawer');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
      });
    });
  }

  // If user is already logged in, run initial route calculation
  const session = getAuthSession();
  if (session) {
    setTimeout(() => {
      triggerConversionCalculation();
    }, 300);
  }
});
