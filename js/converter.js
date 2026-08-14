// converter.js — orchestration only: wires dashboard.html's form to the
// pathfinder, and (optionally) saves each result to json-server's
// /conversions collection, the same way js/auth.js talks to /users.

import { getRates } from './rateService.js';
import { buildGraph, nodesNeeded } from './graphBuilder.js';
import { findBestPath } from './pathfinder.js';
import { PROVIDERS, HUB_CURRENCIES, SUPPORTED_CURRENCIES } from './providers.js';

const API_BASE = 'http://localhost:3000';
const SESSION_KEY = 'bypassfx_session';
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY']);

function $(id) {
  return document.getElementById(id);
}

function readSession() {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function formatAmount(amount, currency) {
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function populateCurrencyOptions(selectEl, defaultValue) {
  selectEl.innerHTML = '';
  for (const code of SUPPORTED_CURRENCIES) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = code;
    if (code === defaultValue) option.selected = true;
    selectEl.appendChild(option);
  }
}

function renderLoading(resultEl) {
  resultEl.innerHTML = '<p class="status">Finding the cheapest path…</p>';
}

function renderError(resultEl, message) {
  resultEl.innerHTML = `<p class="status error">${escapeHtml(message)}</p>`;
}

function renderResult(resultEl, { from, to, amount, best, direct, stale }) {
  const hopCount = best.path.length;
  const isDirect = hopCount === 1;
  const savings = direct && !isDirect ? best.amount - direct.amount : 0;

  const savingsBadge = savings > 0
    ? `<span class="savings-badge">+${formatAmount(savings, to)} ${to} vs direct</span>`
    : '';

  const startHop = `
    <div class="hop">
      <span class="hop-amount">${formatAmount(amount, from)}</span>
      <span class="hop-currency">${from}</span>
    </div>
  `;

  const laterHops = best.path
    .map(
      (edge) => `
        <span class="arrow">→</span>
        <div class="hop">
          <span class="hop-amount">${formatAmount(edge.amountAfter, edge.to)}</span>
          <span class="hop-currency">${edge.to}</span>
          <span class="hop-provider">${escapeHtml(edge.provider)} · ${(edge.feePercent * 100).toFixed(1)}%${edge.feeFixed ? ' + fixed fee' : ''}</span>
        </div>
      `
    )
    .join('');

  const comparisonLine = direct && !isDirect
    ? `<p class="comparison">Direct ${from} to ${to} would give ${formatAmount(direct.amount, to)} ${to} — this path gets you ${formatAmount(savings, to)} ${to} more.</p>`
    : isDirect
      ? '<p class="comparison">The direct route is already the cheapest option found.</p>'
      : '';

  const staleNotice = stale
    ? '<p class="notice">Showing cached rates — live rates were unavailable.</p>'
    : '';

  resultEl.innerHTML = `
    <div class="result-header">
      <span class="hop-count">Best path · ${hopCount} hop${hopCount > 1 ? 's' : ''}</span>
      ${savingsBadge}
    </div>
    <div class="path">${startHop}${laterHops}</div>
    ${comparisonLine}
    ${staleNotice}
  `;
}

async function saveConversion(session, payload) {
  if (!session) return; // history is only saved for logged-in users
  try {
    await fetch(`${API_BASE}/conversions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.id, ...payload, createdAt: new Date().toISOString() }),
    });
    loadHistory(session);
  } catch (err) {
    console.error('Could not save conversion history:', err);
  }
}

async function loadHistory(session) {
  const historyEl = $('history-list');
  if (!historyEl || !session) return;

  try {
    const rows = await fetch(
      `${API_BASE}/conversions?userId=${session.id}&_sort=createdAt&_order=desc&_limit=5`
    ).then((r) => r.json());

    if (rows.length === 0) {
      historyEl.innerHTML = '<p class="status">No conversions saved yet.</p>';
      return;
    }

    historyEl.innerHTML = rows
      .map(
        (row) => `
          <div class="history-row">
            <span>${row.from} → ${row.to}</span>
            <span class="history-amount">${formatAmount(row.finalAmount, row.to)} ${row.to}</span>
          </div>
        `
      )
      .join('');
  } catch (err) {
    historyEl.innerHTML = '<p class="status">Could not load history — is json-server running?</p>';
  }
}

function validate(from, to, amount) {
  if (from === to) return 'Source and target currency must be different.';
  if (!amount || amount <= 0 || Number.isNaN(amount)) return 'Enter an amount greater than zero.';
  return null;
}

function init() {
  const form = $('convertForm');
  if (!form) return; // not on this page

  const fromSelect = $('fromCurrency');
  const toSelect = $('toCurrency');
  const resultEl = $('convertResult');
  const session = readSession();

  populateCurrencyOptions(fromSelect, 'INR');
  populateCurrencyOptions(toSelect, 'EUR');
  loadHistory(session);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const from = fromSelect.value;
    const to = toSelect.value;
    const amount = Number($('amount').value);
    const maxHops = Number($('maxHops').value);

    const validationError = validate(from, to, amount);
    if (validationError) {
      renderError(resultEl, validationError);
      return;
    }

    renderLoading(resultEl);

    try {
      const nodes = nodesNeeded(from, to, HUB_CURRENCIES);
      const { rates, staleBases } = await getRates(nodes);
      const graph = buildGraph(rates, PROVIDERS, nodes);
      const { best, direct } = findBestPath(graph, from, to, amount, maxHops);

      if (!best) {
        renderError(resultEl, `No path found from ${from} to ${to} within ${maxHops} hop(s). Try increasing the hop limit.`);
        return;
      }

      renderResult(resultEl, { from, to, amount, best, direct, stale: staleBases.length > 0 });

      saveConversion(session, {
        from,
        to,
        amount,
        bestPath: best.path,
        finalAmount: best.amount,
      });
    } catch (err) {
      renderError(resultEl, err.message || 'Something went wrong fetching rates. Please try again.');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
