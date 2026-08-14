// ticker.js — fills the same #tickerTrack marquee as before, but with
// real rates via rateService.js instead of a hardcoded array. Converted
// to a module (it needs the import below) — see the <script type="module">
// tag in index.html / login.html / signup.html.

import { getRates } from './rateService.js';

const PAIRS = [
  { base: 'USD', quote: 'INR', label: 'USD/INR', decimals: 2 },
  { base: 'EUR', quote: 'USD', label: 'EUR/USD', decimals: 3 },
  { base: 'GBP', quote: 'INR', label: 'GBP/INR', decimals: 2 },
  { base: 'USD', quote: 'JPY', label: 'USD/JPY', decimals: 2 },
  { base: 'AUD', quote: 'USD', label: 'AUD/USD', decimals: 3 },
  { base: 'EUR', quote: 'GBP', label: 'EUR/GBP', decimals: 3 },
];

const POLL_INTERVAL_MS = 3 * 60 * 1000; // matches rateService's own cache TTL
const previousValues = {};

function uniqueBases() {
  return Array.from(new Set(PAIRS.map((p) => p.base)));
}

function renderSet(values) {
  return PAIRS.map((p) => {
    const value = values[p.label];
    if (value == null) return '';
    const up = previousValues[p.label] == null ? true : value >= previousValues[p.label];
    const arrow = up ? '▲' : '▼';
    return `<span class="tick ${up ? 'up' : 'down'}"><b>${p.label}</b> ${value.toFixed(p.decimals)} ${arrow}</span>`;
  }).join('');
}

async function refresh(track) {
  try {
    const { rates } = await getRates(uniqueBases());
    const values = {};

    for (const pair of PAIRS) {
      const value = rates[pair.base] ? rates[pair.base][pair.quote] : null;
      if (value != null) values[pair.label] = value;
    }

    const set = renderSet(values);
    track.innerHTML = set + set; // duplicated so the scroll loop is seamless

    for (const pair of PAIRS) {
      if (values[pair.label] != null) previousValues[pair.label] = values[pair.label];
    }
  } catch (err) {
    // Leave whatever was already rendered in place rather than blanking it.
    console.error('Ticker refresh failed:', err);
  }
}

(function init() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  refresh(track);
  setInterval(() => refresh(track), POLL_INTERVAL_MS);
})();
