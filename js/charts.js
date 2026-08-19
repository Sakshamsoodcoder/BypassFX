// charts.js — Live rate charts, historical timeseries, and multi-currency comparison
// Uses Chart.js (loaded via CDN) and the Frankfurter API

const API = 'https://api.frankfurter.app';
const POLL_INTERVAL = 30_000; // 30 seconds
const CURRENCIES = ['USD','EUR','GBP','INR','JPY','CAD','AUD','CHF','SGD','AED'];

// ── State ──────────────────────────────────────────────────────
let liveData     = [];          // { time, rate }
let sessionHigh  = -Infinity;
let sessionLow   = Infinity;
let previousRate = null;
let liveChart    = null;
let historyChart = null;
let multiChart   = null;
let pollTimer    = null;

// ── DOM refs ───────────────────────────────────────────────────
const $base        = document.getElementById('baseCurrency');
const $target      = document.getElementById('targetCurrency');
const $ratePair    = document.getElementById('ratePair');
const $rateValue   = document.getElementById('rateValue');
const $rateChange  = document.getElementById('rateChange');
const $lastUpdated = document.getElementById('lastUpdated');
const $sessionHigh = document.getElementById('sessionHigh');
const $sessionLow  = document.getElementById('sessionLow');
const $dataPoints  = document.getElementById('dataPoints');
const $histStats   = document.getElementById('historyStats');
const $ratesTable  = document.getElementById('ratesTable');
const $liveBadge   = document.getElementById('liveBadge');

// ── Helpers ────────────────────────────────────────────────────
function fmt(n, decimals = 4) {
  if (n == null) return '—';
  return Number(n).toFixed(decimals);
}

function timeLabel(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function dateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Chart.js shared styling ────────────────────────────────────
const CHART_GREEN      = '#16A34A';
const CHART_GREEN_BG   = 'rgba(22, 163, 74, 0.12)';
const CHART_RED        = '#DC2626';
const CHART_RED_BG     = 'rgba(220, 38, 38, 0.10)';
const CHART_GRAY       = '#55705F';
const GRID_COLOR       = 'rgba(11, 59, 42, 0.08)';

const commonScales = {
  x: {
    grid: { color: GRID_COLOR, drawBorder: false },
    ticks: { color: CHART_GRAY, font: { family: 'Inter', size: 11 }, maxRotation: 0 }
  },
  y: {
    grid: { color: GRID_COLOR, drawBorder: false },
    ticks: { color: CHART_GRAY, font: { family: 'Inter', size: 11 } }
  }
};

// ── 1. LIVE CHART ──────────────────────────────────────────────
function initLiveChart() {
  const ctx = document.getElementById('liveChart').getContext('2d');
  liveChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Rate',
        data: [],
        borderColor: CHART_GREEN,
        backgroundColor: CHART_GREEN_BG,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: CHART_GREEN,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0B3B2A',
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'IBM Plex Mono' },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => `Rate: ${fmt(ctx.parsed.y, 6)}`
          }
        }
      },
      scales: {
        ...commonScales,
        x: { ...commonScales.x, ticks: { ...commonScales.x.ticks, maxTicksLimit: 10 } }
      }
    }
  });
}

function updateLiveChart(rate) {
  const now = new Date();
  const entry = { time: now, rate };
  liveData.push(entry);

  // Track session high / low
  if (rate > sessionHigh) sessionHigh = rate;
  if (rate < sessionLow) sessionLow = rate;

  // Rate change indicator
  if (previousRate !== null) {
    const diff = rate - previousRate;
    const pct  = ((diff / previousRate) * 100).toFixed(4);
    const sign = diff >= 0 ? '+' : '';
    $rateChange.textContent = `${sign}${fmt(diff, 6)} (${sign}${pct}%)`;
    $rateChange.className = `rate-change ${diff >= 0 ? 'up' : 'down'}`;
  }
  previousRate = rate;

  // Update hero stats
  $rateValue.textContent   = fmt(rate, 6);
  $ratePair.textContent    = `${$base.value} / ${$target.value}`;
  $lastUpdated.textContent = timeLabel(now);
  $sessionHigh.textContent = fmt(sessionHigh, 6);
  $sessionLow.textContent  = fmt(sessionLow, 6);
  $dataPoints.textContent  = liveData.length;

  // Push to chart
  liveChart.data.labels.push(timeLabel(now));
  liveChart.data.datasets[0].data.push(rate);

  // Keep last 60 data points (30 min at 30s intervals)
  if (liveChart.data.labels.length > 60) {
    liveChart.data.labels.shift();
    liveChart.data.datasets[0].data.shift();
  }

  liveChart.update('none');
}

async function pollLiveRate() {
  const base = $base.value;
  const target = $target.value;
  try {
    const res = await fetch(`${API}/latest?from=${base}&to=${target}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const rate = data.rates[target];
    if (rate != null) updateLiveChart(rate);
    $liveBadge.classList.remove('error');
  } catch (err) {
    console.warn('Live poll failed:', err);
    $liveBadge.classList.add('error');
  }
}

function startPolling() {
  clearInterval(pollTimer);
  liveData = [];
  sessionHigh = -Infinity;
  sessionLow = Infinity;
  previousRate = null;

  // Reset chart data
  if (liveChart) {
    liveChart.data.labels = [];
    liveChart.data.datasets[0].data = [];
    liveChart.update('none');
  }

  // Immediate first fetch, then every 30s
  pollLiveRate();
  pollTimer = setInterval(pollLiveRate, POLL_INTERVAL);
}

// ── 2. HISTORICAL CHART ────────────────────────────────────────
function initHistoryChart() {
  const ctx = document.getElementById('historyChart').getContext('2d');
  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Daily Rate',
        data: [],
        borderColor: CHART_GREEN,
        backgroundColor: CHART_GREEN_BG,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: CHART_GREEN,
        tension: 0.25,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0B3B2A',
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'IBM Plex Mono' },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => `Rate: ${fmt(ctx.parsed.y, 6)}`
          }
        }
      },
      scales: commonScales
    }
  });
}

async function fetchHistorical(days) {
  const base   = $base.value;
  const target = $target.value;
  const start  = daysAgo(days);
  const end    = today();

  try {
    const res = await fetch(`${API}/${start}..${end}?from=${base}&to=${target}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    const dates = Object.keys(data.rates).sort();
    const rates = dates.map(d => data.rates[d][target]);

    // Update chart
    historyChart.data.labels = dates.map(dateLabel);
    historyChart.data.datasets[0].data = rates;
    historyChart.data.datasets[0].label = `${base}/${target}`;
    historyChart.update();

    // Stats
    if (rates.length > 1) {
      const high    = Math.max(...rates);
      const low     = Math.min(...rates);
      const avg     = rates.reduce((a, b) => a + b, 0) / rates.length;
      const first   = rates[0];
      const last    = rates[rates.length - 1];
      const change  = last - first;
      const changePct = ((change / first) * 100).toFixed(2);
      const sign    = change >= 0 ? '+' : '';
      const color   = change >= 0 ? 'up' : 'down';

      $histStats.innerHTML = `
        <div class="hist-stat">
          <span class="stat-label">Period High</span>
          <span class="stat-value">${fmt(high, 4)}</span>
        </div>
        <div class="hist-stat">
          <span class="stat-label">Period Low</span>
          <span class="stat-value">${fmt(low, 4)}</span>
        </div>
        <div class="hist-stat">
          <span class="stat-label">Average</span>
          <span class="stat-value">${fmt(avg, 4)}</span>
        </div>
        <div class="hist-stat">
          <span class="stat-label">Change</span>
          <span class="stat-value ${color}">${sign}${fmt(change, 4)} (${sign}${changePct}%)</span>
        </div>
        <div class="hist-stat">
          <span class="stat-label">Data Points</span>
          <span class="stat-value">${rates.length} days</span>
        </div>
      `;
    }
  } catch (err) {
    console.error('Historical fetch failed:', err);
    $histStats.innerHTML = '<p class="error-msg">⚠️ Failed to load historical data. Please try again.</p>';
  }
}

// ── 3. MULTI-CURRENCY BAR CHART ────────────────────────────────
function initMultiChart() {
  const ctx = document.getElementById('multiChart').getContext('2d');
  multiChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Exchange Rate',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0B3B2A',
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'IBM Plex Mono' },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => `1 ${$base.value} = ${fmt(ctx.parsed.x, 4)} ${ctx.label}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: GRID_COLOR, drawBorder: false },
          ticks: { color: CHART_GRAY, font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#0B1F17', font: { family: 'Space Grotesk', size: 13, weight: '600' } }
        }
      }
    }
  });
}

async function fetchMultiRates() {
  const base    = $base.value;
  const targets = CURRENCIES.filter(c => c !== base);

  try {
    const res = await fetch(`${API}/latest?from=${base}&to=${targets.join(',')}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    const labels = [];
    const rates  = [];
    const bgColors = [];
    const borderColors = [];

    const FLAG_MAP = { USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', INR:'🇮🇳', JPY:'🇯🇵', CAD:'🇨🇦', AUD:'🇦🇺', CHF:'🇨🇭', SGD:'🇸🇬', AED:'🇦🇪' };
    const PALETTE = [
      'rgba(22, 163, 74, 0.75)', 'rgba(14, 165, 233, 0.75)', 'rgba(168, 85, 247, 0.75)',
      'rgba(245, 158, 11, 0.75)', 'rgba(239, 68, 68, 0.75)',  'rgba(20, 184, 166, 0.75)',
      'rgba(99, 102, 241, 0.75)', 'rgba(236, 72, 153, 0.75)', 'rgba(107, 114, 128, 0.75)'
    ];
    const BORDER_PALETTE = [
      '#16A34A', '#0EA5E9', '#A855F7', '#F59E0B', '#EF4444',
      '#14B8A6', '#6366F1', '#EC4899', '#6B7280'
    ];

    targets.forEach((cur, i) => {
      if (data.rates[cur] != null) {
        labels.push(`${FLAG_MAP[cur] || ''} ${cur}`);
        rates.push(data.rates[cur]);
        bgColors.push(PALETTE[i % PALETTE.length]);
        borderColors.push(BORDER_PALETTE[i % BORDER_PALETTE.length]);
      }
    });

    multiChart.data.labels = labels;
    multiChart.data.datasets[0].data = rates;
    multiChart.data.datasets[0].backgroundColor = bgColors;
    multiChart.data.datasets[0].borderColor = borderColors;
    multiChart.data.datasets[0].label = `1 ${base} =`;
    multiChart.update();

    // Rates table
    let tableHTML = `<table>
      <thead><tr><th>Currency</th><th>Rate</th><th>Inverse</th></tr></thead><tbody>`;
    targets.forEach(cur => {
      if (data.rates[cur] != null) {
        tableHTML += `<tr>
          <td>${FLAG_MAP[cur] || ''} ${cur}</td>
          <td class="mono">${fmt(data.rates[cur], 4)}</td>
          <td class="mono">${fmt(1 / data.rates[cur], 6)}</td>
        </tr>`;
      }
    });
    tableHTML += '</tbody></table>';
    $ratesTable.innerHTML = tableHTML;

  } catch (err) {
    console.error('Multi-rate fetch failed:', err);
    $ratesTable.innerHTML = '<p class="error-msg">⚠️ Failed to load rates. Please try again.</p>';
  }
}

// ── Tab handling ───────────────────────────────────────────────
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      fetchHistorical(Number(tab.dataset.range));
    });
  });
}

// ── Currency change handler ────────────────────────────────────
function onCurrencyChange() {
  // Restart everything when the user picks a different pair
  startPolling();
  const activeTab = document.querySelector('.tab-btn.active');
  fetchHistorical(Number(activeTab.dataset.range));
  fetchMultiRates();
}

// ── Init ───────────────────────────────────────────────────────
initLiveChart();
initHistoryChart();
initMultiChart();
initTabs();

$base.addEventListener('change', onCurrencyChange);
$target.addEventListener('change', onCurrencyChange);

// Kick off
startPolling();
fetchHistorical(7);
<<<<<<< HEAD
fetchMultiRates();
=======
fetchMultiRates();
>>>>>>> faf694213d43a1dcc476fbbb79e09ebe585cc5af
