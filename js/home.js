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
// 3. Exchange Rate Service (Fetch API + Local Cache + Fallback)
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
// 4. UI Rendering & Event Initializers
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
      </div>
    `;
  }

  if (session && mobileAuth) {
    const firstName = session.name ? session.name.split(' ')[0] : 'Member';
    mobileAuth.innerHTML = `
      <a href="profile.html" class="btn-primary" style="text-align:center;">👤 ${escapeHtml(firstName)} (Profile)</a>
    `;
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
// 5. Trends Marquee (Left-to-Right Animated Bar)
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
// 6. Page Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  initCurrenciesGrid();
  initTicker();

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
});
