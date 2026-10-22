const HUB_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AED', 'AUD', 'CAD', 'CHF'];

// Transfer provider fee specifications (percentage commission + fixed transfer fee)
const PROVIDERS = [
  { id: 'wise', name: 'Wise (Optimal)', feePercent: 0.0045, feeFixedUSD: 0 },
  { id: 'revolut', name: 'Revolut FX', feePercent: 0.0050, feeFixedUSD: 0 },
  { id: 'bank', name: 'Bank Wire', feePercent: 0.0180, feeFixedUSD: 15 },
  { id: 'paypal', name: 'PayPal FX', feePercent: 0.0380, feeFixedUSD: 0 }
];

// Robust Baseline Mid-Market Rates (relative to 1 USD) for offline resilience & immediate bootstrap
const USD_BASELINE_RATES = {
  USD: 1.0,
  INR: 86.8520,
  EUR: 0.9245,
  GBP: 0.7915,
  JPY: 153.42,
  AUD: 1.5425,
  CAD: 1.3850,
  CHF: 0.8850,
  CNY: 7.2450,
  SGD: 1.3480,
  NZD: 1.6950,
  HKD: 7.7800,
  AED: 3.6725,
  SAR: 3.7505,
  QAR: 3.6410,
  THB: 34.6200,
  MYR: 4.4350,
  IDR: 16250.0,
  PHP: 57.8500,
  ZAR: 18.2500,
  RUB: 91.5000,
  BRL: 5.6200,
  MXN: 20.1500,
  SEK: 10.6500,
  NOK: 10.8500,
  DKK: 6.9000,
  PLN: 3.9800,
  TRY: 34.2500,
  KRW: 1395.0,
  CZK: 23.4500,
  HUF: 368.50,
  ILS: 3.7250,
  BGN: 1.8080,
  RON: 4.6020,
  CLP: 945.0,
  COP: 4120.0
};

const STORAGE_KEYS = {
  HISTORY: 'bypassfx_history',
  SESSION: 'bypassfx_session',
  RATES_CACHE: 'bypassfx_rates_cache'
};

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'CLP', 'IDR', 'HUF']);

// ============================================================
// 2. Helper Functions & Utilities
// ============================================================
function getCurrencyMeta(code) {
  return CURRENCIES.find(c => c.code === code) || {
    code: code,
    name: code,
    iso: code.slice(0, 2).toLowerCase(),
    flag: '≡ƒîÉ',
    symbol: code,
    country: ''
  };
}

/**
 * Generates crisp, universally visible SVG/PNG country flag images
 * with native emoji fallback for 100% cross-platform PC/Mobile compatibility
 */
function getFlagHtml(currencyMeta, size = 'normal') {
  if (!currencyMeta) return '';
  const iso = (currencyMeta.iso || 'un').toLowerCase();
  const width = size === 'large' ? 26 : 22;
  const height = size === 'large' ? 18 : 15;
  const code = currencyMeta.code || 'Currency';
  const emoji = currencyMeta.flag || '≡ƒîÉ';

  return `<img src="https://flagcdn.com/w40/${iso}.png" srcset="https://flagcdn.com/w80/${iso}.png 2x" width="${width}" height="${height}" alt="${code} flag" class="currency-flag-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"><span class="flag-fallback" style="display:none;">${emoji}</span>`;
}

function formatCurrencyAmount(amount, currencyCode, maximumFractionDigits) {
  if (amount == null || isNaN(amount)) return '0.00';
  const isZeroDec = ZERO_DECIMAL_CURRENCIES.has(currencyCode);
  const maxDec = maximumFractionDigits !== undefined
    ? maximumFractionDigits
    : (isZeroDec ? 0 : 2);
  const minDec = isZeroDec ? 0 : 2;

  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec
  });
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

// ============================================================
// 3. Exchange Rate Service (Fetch API + LocalStorage Cache + Fallbacks)
// ============================================================
async function fetchExchangeRates(baseCurrency) {
  const cacheKey = `${STORAGE_KEYS.RATES_CACHE}_${baseCurrency}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 15 * 60 * 1000 && parsed.rates) {
        return parsed.rates;
      }
    } catch (e) {
      // Ignore parse errors and proceed to live fetch
    }
  }

  // Attempt live fetch from Frankfurter API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const liveRates = { ...data.rates, [baseCurrency]: 1.0 };
      
      // Augment with baseline cross-rates for currencies not directly indexed by Frankfurter
      for (const [code, rateToUSD] of Object.entries(USD_BASELINE_RATES)) {
        if (!liveRates[code]) {
          const baseToUSD = liveRates['USD'] || (USD_BASELINE_RATES[baseCurrency] ? 1 / USD_BASELINE_RATES[baseCurrency] : 1.0);
          liveRates[code] = baseToUSD * rateToUSD;
        }
      }

      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          rates: liveRates
        }));
      } catch (err) {}

      return liveRates;
    }
  } catch (err) {
    // Gracefully handle network timeouts / offline mode
  }

  // Fallback: check stale cache
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.rates) return parsed.rates;
    } catch (e) {}
  }

  // Fallback: calculate synthetic cross-rates from baseline
  const baseRateToUSD = USD_BASELINE_RATES[baseCurrency] || 1.0;
  const fallbackRates = {};
  for (const [code, rateInUSD] of Object.entries(USD_BASELINE_RATES)) {
    fallbackRates[code] = rateInUSD / baseRateToUSD;
  }
  fallbackRates[baseCurrency] = 1.0;
  return fallbackRates;
}

// Compute pairwise exchange rate between two currencies using available rates map
function getPairRate(fromCur, toCur, ratesMap) {
  if (fromCur === toCur) return 1.0;
  if (ratesMap && ratesMap[toCur]) {
    return ratesMap[toCur];
  }
  const fromToUSD = USD_BASELINE_RATES[fromCur] || 1.0;
  const toToUSD = USD_BASELINE_RATES[toCur] || 1.0;
  return toToUSD / fromToUSD;
}

// ============================================================
// 4. Graph Arbitrage Engine & Multi-Hop Pathfinding
// ============================================================
/**
 * Forward-simulates conversion of an amount across candidate routes
 * accounting for exchange rates, provider commission percentages, and fixed fees.
 */
async function findBestArbitrageRoute(fromCur, toCur, amount, maxHops = 3) {
  // Fetch rates for source currency
  const fromRates = await fetchExchangeRates(fromCur);

  // Pre-fetch hub rates if needed for multi-hop
  const hubRatesMap = { [fromCur]: fromRates };
  const relevantHubs = HUB_CURRENCIES.filter(h => h !== fromCur && h !== toCur);

  // Direct Route Calculation across all providers
  const directRoutes = PROVIDERS.map(provider => {
    const rate = getPairRate(fromCur, toCur, fromRates);
    const feePercentAmount = amount * provider.feePercent;
    const fixedFeeSource = (provider.feeFixedUSD / (USD_BASELINE_RATES[fromCur] || 1.0));
    const totalFeeSource = feePercentAmount + fixedFeeSource;
    const netAmountSource = Math.max(0, amount - totalFeeSource);
    const finalAmount = netAmountSource * rate;

    return {
      hops: [fromCur, toCur],
      legs: [
        {
          from: fromCur,
          to: toCur,
          rate: rate,
          provider: provider.name,
          feePercent: provider.feePercent,
          feeFixed: fixedFeeSource,
          feeSourceAmount: totalFeeSource,
          inputAmount: amount,
          outputAmount: finalAmount
        }
      ],
      finalAmount: finalAmount,
      totalFeeSource: totalFeeSource,
      isDirect: true,
      providerSummary: provider.name
    };
  });

  directRoutes.sort((a, b) => b.finalAmount - a.finalAmount);
  const bestDirectRoute = directRoutes[0];

  // If user selected Direct Only (1 hop), return immediately
  if (maxHops <= 1 || fromCur === toCur) {
    return {
      best: bestDirectRoute,
      direct: bestDirectRoute,
      alternatives: directRoutes.slice(1, 4),
      savings: 0,
      savingsPct: 0
    };
  }

  // Explore Multi-Hop Paths (2-hop and 3-hop)
  const candidatePaths = [...directRoutes];

  // 2-Hop Routes: fromCur -> Hub -> toCur
  for (const hub of relevantHubs) {
    const rateLeg1 = getPairRate(fromCur, hub, fromRates);
    if (!rateLeg1 || rateLeg1 <= 0) continue;

    // Use Wise as default optimal corridor provider for hops
    const p1 = PROVIDERS[0]; // Wise
    const fee1Source = amount * p1.feePercent;
    const net1Source = amount - fee1Source;
    const amountAtHub = net1Source * rateLeg1;

    // Leg 2: Hub -> toCur
    const hubRates = hubRatesMap[hub] || await fetchExchangeRates(hub).catch(() => null);
    if (hubRates) hubRatesMap[hub] = hubRates;

    const rateLeg2 = hubRates ? getPairRate(hub, toCur, hubRates) : getPairRate(hub, toCur);
    const p2 = PROVIDERS[0]; // Wise
    const fee2Hub = amountAtHub * p2.feePercent;
    const net2Hub = amountAtHub - fee2Hub;
    const finalAmount = net2Hub * rateLeg2;

    const fee2InSource = fee2Hub / rateLeg1;
    const totalFeeSource = fee1Source + fee2InSource;

    candidatePaths.push({
      hops: [fromCur, hub, toCur],
      legs: [
        {
          from: fromCur,
          to: hub,
          rate: rateLeg1,
          provider: p1.name,
          feePercent: p1.feePercent,
          feeSourceAmount: fee1Source,
          inputAmount: amount,
          outputAmount: amountAtHub
        },
        {
          from: hub,
          to: toCur,
          rate: rateLeg2,
          provider: p2.name,
          feePercent: p2.feePercent,
          feeSourceAmount: fee2InSource,
          inputAmount: amountAtHub,
          outputAmount: finalAmount
        }
      ],
      finalAmount: finalAmount,
      totalFeeSource: totalFeeSource,
      isDirect: false,
      providerSummary: 'Wise Multi-Hop'
    });
  }

  // 3-Hop Routes if maxHops >= 3
  if (maxHops >= 3) {
    const hubPairs = [
      ['USD', 'EUR'],
      ['EUR', 'USD'],
      ['GBP', 'USD'],
      ['USD', 'SGD'],
      ['USD', 'JPY'],
      ['AED', 'USD']
    ];

    for (const [h1, h2] of hubPairs) {
      if (h1 === fromCur || h1 === toCur || h2 === fromCur || h2 === toCur) continue;

      const rate1 = getPairRate(fromCur, h1, fromRates);
      const fee1 = amount * 0.0045;
      const amtH1 = (amount - fee1) * rate1;

      const h1Rates = hubRatesMap[h1] || await fetchExchangeRates(h1).catch(() => null);
      if (h1Rates) hubRatesMap[h1] = h1Rates;

      const rate2 = h1Rates ? getPairRate(h1, h2, h1Rates) : getPairRate(h1, h2);
      const fee2 = amtH1 * 0.0045;
      const amtH2 = (amtH1 - fee2) * rate2;

      const h2Rates = hubRatesMap[h2] || await fetchExchangeRates(h2).catch(() => null);
      if (h2Rates) hubRatesMap[h2] = h2Rates;

      const rate3 = h2Rates ? getPairRate(h2, toCur, h2Rates) : getPairRate(h2, toCur);
      const fee3 = amtH2 * 0.0045;
      const finalAmt = (amtH2 - fee3) * rate3;

      const totalFeeSource = fee1 + (fee2 / rate1) + (fee3 / (rate1 * rate2));

      candidatePaths.push({
        hops: [fromCur, h1, h2, toCur],
        legs: [
          { from: fromCur, to: h1, rate: rate1, provider: 'Wise', inputAmount: amount, outputAmount: amtH1 },
          { from: h1, to: h2, rate: rate2, provider: 'Wise', inputAmount: amtH1, outputAmount: amtH2 },
          { from: h2, to: toCur, rate: rate3, provider: 'Wise', inputAmount: amtH2, outputAmount: finalAmt }
        ],
        finalAmount: finalAmt,
        totalFeeSource: totalFeeSource,
        isDirect: false,
        providerSummary: 'Wise 3-Hop Arbitrage'
      });
    }
  }

  // Sort candidate paths by highest final net amount
  candidatePaths.sort((a, b) => b.finalAmount - a.finalAmount);

  // Filter unique hop chains
  const uniquePaths = [];
  const seenHops = new Set();
  for (const path of candidatePaths) {
    const key = path.hops.join('->') + ':' + path.providerSummary;
    if (!seenHops.has(key)) {
      seenHops.add(key);
      uniquePaths.push(path);
    }
  }

  const best = uniquePaths[0];
  const direct = bestDirectRoute;
  const savings = Math.max(0, best.finalAmount - direct.finalAmount);
  const savingsPct = direct.finalAmount > 0 ? (savings / direct.finalAmount) * 100 : 0;

  return {
    best: best,
    direct: direct,
    alternatives: uniquePaths.slice(1, 5),
    savings: savings,
    savingsPct: savingsPct
  };
}

// ============================================================
// 5. Custom Searchable Currency Dropdown Component
// ============================================================
class CustomCurrencyDropdown {
  constructor(containerId, triggerId, menuId, searchInputId, listId, hiddenInputId, flagId, codeId, nameId, initialCode) {
    this.container = document.getElementById(containerId);
    this.trigger = document.getElementById(triggerId);
    this.menu = document.getElementById(menuId);
    this.searchInput = document.getElementById(searchInputId);
    this.list = document.getElementById(listId);
    this.hiddenInput = document.getElementById(hiddenInputId);
    this.flagEl = document.getElementById(flagId);
    this.codeEl = document.getElementById(codeId);
    this.nameEl = document.getElementById(nameId);

    this.selectedCode = initialCode || 'USD';
    this.isOpen = false;
    this.searchTerm = '';

    this.init();
  }

  init() {
    if (!this.container || !this.trigger || !this.menu || !this.list) return;

    this.renderList();
    this.setValue(this.selectedCode, false);

    // Toggle dropdown open/close on trigger click
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Search filter input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this.renderList();
      });

      this.searchInput.addEventListener('click', (e) => e.stopPropagation());
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });
    }

    // Quick Popular Hub Pills inside popover
    this.menu.querySelectorAll('.hub-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = pill.dataset.code;
        if (code) {
          this.setValue(code, true);
          this.close();
        }
      });
    });

    // Close when clicking anywhere outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.container.contains(e.target)) {
        this.close();
      }
    });

    // Accessibility keyboard navigation
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
              <span class="item-name"> ΓÇö ${escapeHtml(c.name)}</span>
            </div>
          </div>
          <div class="item-right">
            <span class="item-symbol">${c.symbol}</span>
            <span class="item-check">Γ£ô</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to options
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
    if (this.nameEl) this.nameEl.textContent = `ΓÇö ${meta.name}`;

    // Highlight active in list
    this.list.querySelectorAll('.dropdown-currency-item').forEach(el => {
      const isMatch = el.dataset.code === meta.code;
      el.classList.toggle('selected', isMatch);
      el.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    if (triggerEvent) {
      const event = new CustomEvent('currencychange', { detail: { code: meta.code } });
      this.container.dispatchEvent(event);
    }
  }

  getValue() {
    return this.selectedCode;
  }

  open() {
    // Close any other open dropdowns first
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
// 6. Converter Controller & Result Visualization
// ============================================================
let fromDropdownInstance = null;
let toDropdownInstance = null;

function initConverter() {
  const form = document.getElementById('converterFormMain');
  if (!form) return;

  // Initialize Custom Dropdowns with initial pairs
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

      // Trigger animation
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

  // Handle Form Submit (Calculate Route)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amountInput = document.getElementById('convertAmount');
    const hopsSelect = document.getElementById('maxHopsSelect');
    const btnSubmit = document.getElementById('btnSubmitConvert');

    const amount = parseFloat(amountInput ? amountInput.value : 10000);
    const fromCur = fromDropdownInstance.getValue();
    const toCur = toDropdownInstance.getValue();
    const maxHops = parseInt(hopsSelect ? hopsSelect.value : '3', 10);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid conversion amount greater than 0.');
      if (amountInput) amountInput.focus();
      return;
    }

    if (fromCur === toCur) {
      alert('Source and destination currencies are the same. Please choose different currencies.');
      return;
    }

    // Set UI loading state
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `
        <span style="display:inline-block; width:16px; height:16px; border:2px solid #FFFFFF; border-top-color:transparent; border-radius:50%; animation:spin-loader 0.8s linear infinite;"></span>
        <span>Finding Best PathΓÇª</span>
      `;
    }

    try {
      const result = await findBestArbitrageRoute(fromCur, toCur, amount, maxHops);
      renderConversionResult(fromCur, toCur, amount, result);
      saveConversionToHistory(fromCur, toCur, amount, result);
    } catch (err) {
      console.error('Conversion calculation error:', err);
      alert('Unable to calculate optimal route at this moment. Please check your connection and try again.');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `
          <span>Find Best Route</span>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M4.167 10h11.666M10.833 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      }
    }
  });

  // Check if preset from profile/other pages was stored
  const presetFrom = localStorage.getItem('bypassfx_preset_from');
  const presetTo = localStorage.getItem('bypassfx_preset_to');
  const presetAmount = localStorage.getItem('bypassfx_preset_amount');

  if (presetFrom) {
    fromDropdownInstance.setValue(presetFrom, false);
    localStorage.removeItem('bypassfx_preset_from');
  }
  if (presetTo) {
    toDropdownInstance.setValue(presetTo, false);
    localStorage.removeItem('bypassfx_preset_to');
  }
  if (presetAmount) {
    const amtEl = document.getElementById('convertAmount');
    if (amtEl) amtEl.value = presetAmount;
    localStorage.removeItem('bypassfx_preset_amount');
  }
}

// Render dynamic path node visualization and metrics
function renderConversionResult(fromCur, toCur, amount, result) {
  const resultWrapper = document.getElementById('resultSection');
  if (!resultWrapper) return;
