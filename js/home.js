/**
 * BypassFX — Homepage Engine (Pure Vanilla JS)
 * Graph Arbitrage Calculator, Multi-Hop Pathfinder & Interactive UI Controller
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

// Robust Baseline Mid-Market Rates (per 1 USD) for offline resilience & immediate calculations
const USD_BASELINE_RATES = {
  USD: 1.0,
  INR: 86.85,
  EUR: 0.925,
  GBP: 0.792,
  JPY: 153.40,
  AUD: 1.542,
  CAD: 1.385,
  CHF: 0.885,
  CNY: 7.245,
  SGD: 1.348,
  NZD: 1.695,
  HKD: 7.780,
  AED: 3.672,
  SEK: 10.65,
  BRL: 5.620,
  MXN: 20.15,
  ZAR: 18.25,
  NOK: 10.85,
  DKK: 6.900,
  PLN: 3.980,
  THB: 34.60,
  KRW: 1395.0
};

const STORAGE_KEYS = {
  HISTORY: 'bypassfx_history',
  SESSION: 'bypassfx_session',
  RATES_CACHE: 'bypassfx_rates_cache'
};

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW']);

// ============================================================
// 2. Helpers & Formatting
// ============================================================
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
      if (Date.now() - parsed.timestamp < 15 * 60 * 1000) { // 15 mins fresh
        return parsed.rates;
      }
    } catch (e) {
      console.warn('Cache parse error:', e);
    }
  }

  // Attempt live fetch from Frankfurter API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    // Frankfurter works best with EUR or USD as base
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
    console.log(`Live rates fetch for ${baseCurrency} timed out or offline, using cross-rate model.`);
  }

  // Resilient Cross-Rate Calculation Model
  const baseRateToUSD = USD_BASELINE_RATES[baseCurrency] || 1.0;
  const rates = {};
  for (const [code, rateInUSD] of Object.entries(USD_BASELINE_RATES)) {
    rates[code] = rateInUSD / baseRateToUSD;
  }
  return rates;
}

// ============================================================
// 4. Graph Construction & Dijkstra-Style Arbitrage Pathfinder
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

  // DFS search simulating real net capital flow including fee structures
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

      // Fee deduction model: Amount arriving is after variable fee and fixed fee
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

  // Sort descending by highest received amount
  allFoundRoutes.sort((a, b) => b.finalAmount - a.finalAmount);

  const best = allFoundRoutes[0];
  const direct = allFoundRoutes.find(r => r.hops === 1) || null;

  // Filter distinct interesting alternative routes
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
// 5. Local Storage & History Management
// ============================================================
function saveToHistory(entry) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: 'bfx_' + Date.now(),
      date: new Date().toISOString(),
      ...entry
    });
    // Keep last 20 entries
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(list.slice(0, 20)));
    renderHistory();
  } catch (err) {
    console.error('Failed to save to history:', err);
  }
}

function loadHistoryList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  renderHistory();
}

// ============================================================
// 6. UI Rendering & DOM Controllers
// ============================================================
function initCurrencySelects() {
  const fromSelect = document.getElementById('fromCurrency');
  const toSelect = document.getElementById('toCurrency');
  if (!fromSelect || !toSelect) return;

  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';

  CURRENCIES.forEach(curr => {
    const optFrom = document.createElement('option');
    optFrom.value = curr.code;
    optFrom.textContent = `${curr.flag} ${curr.code} - ${curr.name}`;
    if (curr.code === 'INR') optFrom.selected = true;
    fromSelect.appendChild(optFrom);

    const optTo = document.createElement('option');
    optTo.value = curr.code;
    optTo.textContent = `${curr.flag} ${curr.code} - ${curr.name}`;
    if (curr.code === 'EUR') optTo.selected = true;
    toSelect.appendChild(optTo);
  });
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

  // Click on currency tile to auto-select as "To" currency and scroll to converter
  grid.querySelectorAll('.currency-grid-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const code = tile.getAttribute('data-code');
      const toSelect = document.getElementById('toCurrency');
      if (toSelect) {
        toSelect.value = code;
        document.getElementById('converterSection').scrollIntoView({ behavior: 'smooth' });
        triggerConversionCalculation();
      }
    });
  });

  // Search filter
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
        triggerConversionCalculation();
      }
    });
  });
}

function initSwapButton() {
  const swapBtn = document.getElementById('btnSwapCurrencies');
  const fromSelect = document.getElementById('fromCurrency');
  const toSelect = document.getElementById('toCurrency');

  if (swapBtn && fromSelect && toSelect) {
    let rotation = 0;
    swapBtn.addEventListener('click', () => {
      rotation += 180;
      swapBtn.style.transform = `rotate(${rotation}deg)`;

      const temp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = temp;

      triggerConversionCalculation();
    });
  }
}

function renderHistory() {
  const container = document.getElementById('historyContainer');
  if (!container) return;

  const history = loadHistoryList();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="history-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="12 7 12 12 15 15"/>
        </svg>
        <p>No conversions calculated yet. Use the converter above to discover the best routes.</p>
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
            <div class="history-date">${formattedDate} · Saved ${toMeta.symbol}${formatCurrencyAmount(item.savings, item.to)}</div>
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
  const fromSelect = document.getElementById('fromCurrency');
  const toSelect = document.getElementById('toCurrency');
  const amountInput = document.getElementById('convertAmount');

  if (fromSelect && toSelect && amountInput) {
    fromSelect.value = from;
    toSelect.value = to;
    amountInput.value = amount;
    document.getElementById('converterSection').scrollIntoView({ behavior: 'smooth' });
    triggerConversionCalculation();
  }
};

// ============================================================
// 7. Core Conversion Flow & Visualizer Output
// ============================================================
async function triggerConversionCalculation() {
  const amountInput = document.getElementById('convertAmount');
  const fromSelect = document.getElementById('fromCurrency');
  const toSelect = document.getElementById('toCurrency');
  const hopSelect = document.getElementById('maxHopsSelect');
  const submitBtn = document.getElementById('btnSubmitConvert');
  const resultWrapper = document.getElementById('resultSection');

  if (!amountInput || !fromSelect || !toSelect || !resultWrapper) return;

  const from = fromSelect.value;
  const to = toSelect.value;
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

  // Button loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="animation: spin 1s linear infinite;">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Finding Optimal Path…
    `;
  }

  try {
    // 1. Gather all nodes needed
    const nodes = Array.from(new Set([from, to, ...HUB_CURRENCIES]));

    // 2. Fetch rates for all hubs
    const ratesMap = {};
    await Promise.all(nodes.map(async (node) => {
      ratesMap[node] = await fetchExchangeRates(node);
    }));

    // 3. Build graph & compute paths
    const graph = buildCurrencyGraph(ratesMap, nodes);
    const { best, alternatives, direct } = findBestPath(graph, from, to, amount, maxHops);

    if (!best) {
      alert(`No valid route found between ${from} and ${to}. Try increasing the max hops.`);
      return;
    }

    // 4. Render results to DOM
    renderBestResult(from, to, amount, best, direct, alternatives);

    // 5. Save to history
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
    console.error('Arbitrage calculation failed:', err);
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

  // 1. Output summary headline
  const summaryEl = document.getElementById('resultSummaryHeading');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="input-ref">Converting ${fromMeta.symbol}${formatCurrencyAmount(amount, from)} ${from}</div>
      <div class="output-hero">${toMeta.symbol}${formatCurrencyAmount(best.finalAmount, to)} <span>${to}</span></div>
    `;
  }

  // 2. Savings badge
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

  // 3. Render Visual Node Chain: [ INR ] ──→ [ USD ] ──→ [ EUR ]
  const visualizerEl = document.getElementById('routeChainNodes');
  if (visualizerEl) {
    let nodesHtml = '';

    // First node (Source)
    nodesHtml += `
      <div class="route-node">
        <div class="node-flag">${fromMeta.flag}</div>
        <span class="node-amount">${fromMeta.symbol}${formatCurrencyAmount(amount, from)}</span>
        <span class="node-code">${from}</span>
      </div>
    `;

    // Edge & subsequent nodes
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

  // 4. Metrics Grid (Final Amount, Total Fee, Savings)
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

  // 5. Compare Alternative Routes Table
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
            <span>${pathLabel}</span>
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
// 8. Ticker Animation & Data Loading
// ============================================================
const TICKER_PAIRS = [
  { base: 'USD', quote: 'INR', label: 'USD/INR' },
  { base: 'EUR', quote: 'USD', label: 'EUR/USD' },
  { base: 'GBP', quote: 'INR', label: 'GBP/INR' },
  { base: 'USD', quote: 'JPY', label: 'USD/JPY' },
  { base: 'EUR', quote: 'GBP', label: 'EUR/GBP' },
  { base: 'AUD', quote: 'USD', label: 'AUD/USD' },
  { base: 'USD', quote: 'AED', label: 'USD/AED' },
  { base: 'USD', quote: 'CAD', label: 'USD/CAD' }
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

    const items = TICKER_PAIRS.map((pair, idx) => {
      const r = ratesByBase[pair.base] ? ratesByBase[pair.base][pair.quote] : USD_BASELINE_RATES[pair.quote];
      const rateVal = r != null ? Number(r).toFixed(pair.quote === 'JPY' ? 2 : 4) : '--';
      const isUp = idx % 2 === 0;
      return `
        <span class="tick-item ${isUp ? 'up' : 'down'}">
          <b>${pair.label}</b>
          <span class="rate">${rateVal}</span>
          <span>${isUp ? '▲' : '▼'}</span>
        </span>
      `;
    }).join('');

    // Double for seamless marquee loop
    track.innerHTML = items + items;
  } catch (e) {
    console.error('Ticker populate failed:', e);
  }
}

// ============================================================
// 9. Page Initialization & Event Listeners
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initCurrencySelects();
  initCurrenciesGrid();
  initQuickChips();
  initSwapButton();
  initTicker();
  renderHistory();

  // Converter Form Submit
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

  // Auto-calculate initial demonstration on page load for immediate delight
  setTimeout(() => {
    triggerConversionCalculation();
  }, 400);
});
