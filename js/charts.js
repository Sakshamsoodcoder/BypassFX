/**
 * BypassFX — Live Market Intelligence & Chart Studio Engine
 * High-performance real-time exchange rates, multi-curve benchmarking,
 * live simulated tick stream, custom crosshair plugin, frosted glass tooltips,
 * and corridor arbitrage matrix with inline SVG sparklines.
 * Directly connected to Frankfurter API & European Central Bank benchmarks.
 */

(function () {
  'use strict';

  // ============================================================
  // 1. Constants & Baseline Configuration
  // ============================================================
  const API_BASE = 'https://api.frankfurter.app';
  const LIVE_TICK_INTERVAL_MS = 2500; // 2.5s live micro-ticks
  const LIVE_POLL_INTERVAL_MS = 20000; // 20s background API sync

  const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', iso: 'us', flag: '🇺🇸', symbol: '$', country: 'United States' },
    { code: 'EUR', name: 'Euro', iso: 'eu', flag: '🇪🇺', symbol: '€', country: 'European Union' },
    { code: 'GBP', name: 'British Pound', iso: 'gb', flag: '🇬🇧', symbol: '£', country: 'United Kingdom' },
    { code: 'INR', name: 'Indian Rupee', iso: 'in', flag: '🇮🇳', symbol: '₹', country: 'India' },
    { code: 'JPY', name: 'Japanese Yen', iso: 'jp', flag: '🇯🇵', symbol: '¥', country: 'Japan' },
    { code: 'CAD', name: 'Canadian Dollar', iso: 'ca', flag: '🇨🇦', symbol: 'C$', country: 'Canada' },
    { code: 'AUD', name: 'Australian Dollar', iso: 'au', flag: '🇦🇺', symbol: 'A$', country: 'Australia' },
    { code: 'CHF', name: 'Swiss Franc', iso: 'ch', flag: '🇨🇭', symbol: 'CHF', country: 'Switzerland' },
    { code: 'SGD', name: 'Singapore Dollar', iso: 'sg', flag: '🇸🇬', symbol: 'S$', country: 'Singapore' },
    { code: 'AED', name: 'UAE Dirham', iso: 'ae', flag: '🇦🇪', symbol: 'AED', country: 'United Arab Emirates' },
    { code: 'CNY', name: 'Chinese Yuan', iso: 'cn', flag: '🇨🇳', symbol: '¥', country: 'China' },
    { code: 'NZD', name: 'New Zealand Dollar', iso: 'nz', flag: '🇳🇿', symbol: 'NZ$', country: 'New Zealand' },
    { code: 'HKD', name: 'Hong Kong Dollar', iso: 'hk', flag: '🇭🇰', symbol: 'HK$', country: 'Hong Kong' },
    { code: 'KRW', name: 'South Korean Won', iso: 'kr', flag: '🇰🇷', symbol: '₩', country: 'South Korea' },
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

  const CURRENCY_NAMES = Object.fromEntries(CURRENCIES.map(c => [c.code, c.name]));

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

  function getFlagHtml(code) {
    const meta = getCurrencyMeta(code);
    const iso = (meta.iso || code.slice(0, 2)).toLowerCase();
    const emoji = meta.flag || '🌐';
    return `<img src="https://flagcdn.com/w40/${iso}.png" srcset="https://flagcdn.com/w80/${iso}.png 2x" width="22" height="16" alt="${code} flag" class="currency-flag-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"><span class="flag-fallback" style="display:none;">${emoji}</span>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const ZERO_DECIMALS = new Set(['JPY', 'KRW', 'IDR', 'CLP', 'COP', 'HUF']);

  // Baseline Mid-Market Rates per 1 USD (for instant bootstrap & offline resilience)
  const USD_BASE_RATES = {
    USD: 1.0,
    INR: 86.8520,
    EUR: 0.9245,
    GBP: 0.7915,
    JPY: 153.42,
    CAD: 1.3850,
    AUD: 1.5425,
    CHF: 0.8850,
    SGD: 1.3480,
    AED: 3.6725,
    CNY: 7.2450,
    NZD: 1.6950,
    HKD: 7.7800,
    KRW: 1385.50,
    SAR: 3.7510,
    QAR: 3.6410,
    THB: 35.8500,
    MYR: 4.4250,
    IDR: 15850.0,
    PHP: 57.2500,
    ZAR: 18.2500,
    RUB: 91.5000,
    BRL: 5.6500,
    MXN: 18.9500,
    SEK: 10.4500,
    NOK: 10.7500,
    DKK: 6.8900,
    PLN: 3.9650,
    TRY: 34.2500,
    CZK: 23.2500,
    HUF: 368.50,
    ILS: 3.7250,
    BGN: 1.8080,
    RON: 4.6050,
    CLP: 945.00,
    COP: 4125.00
  };

  // Pre-configured Corridor Matrix Dataset
  const CORRIDORS = [
    { base: 'USD', target: 'INR', category: 'apac', bestRoute: 'Wise (0.45%)', sparklineType: 'up' },
    { base: 'EUR', target: 'USD', category: 'majors', bestRoute: 'Wise (0.40%)', sparklineType: 'down' },
    { base: 'GBP', target: 'INR', category: 'apac', bestRoute: 'Wise (0.45%)', sparklineType: 'up' },
    { base: 'USD', target: 'JPY', category: 'apac', bestRoute: 'Wise (0.50%)', sparklineType: 'down' },
    { base: 'EUR', target: 'GBP', category: 'majors', bestRoute: 'Revolut (0.40%)', sparklineType: 'up' },
    { base: 'AUD', target: 'USD', category: 'apac', bestRoute: 'Wise (0.45%)', sparklineType: 'down' },
    { base: 'USD', target: 'CAD', category: 'americas', bestRoute: 'Wise (0.45%)', sparklineType: 'up' },
    { base: 'USD', target: 'AED', category: 'majors', bestRoute: 'Bank Bypass (0.50%)', sparklineType: 'up' },
    { base: 'USD', target: 'CHF', category: 'majors', bestRoute: 'Wise (0.40%)', sparklineType: 'down' },
    { base: 'EUR', target: 'JPY', category: 'apac', bestRoute: 'Wise (0.50%)', sparklineType: 'up' },
    { base: 'USD', target: 'SGD', category: 'apac', bestRoute: 'Wise (0.40%)', sparklineType: 'up' },
    { base: 'NZD', target: 'USD', category: 'apac', bestRoute: 'Wise (0.45%)', sparklineType: 'down' }
  ];

  // ============================================================
  // 2. Application State
  // ============================================================
  const state = {
    base: 'USD',
    target: 'INR',
    timeframe: '1H', // '1H' | '24H' | '7D' | '1M' | '1Y'
    currentRate: 86.8520,
    previousRate: 86.8400,
    dayOpenRate: 86.7320,
    sessionHigh: 86.9450,
    sessionLow: 86.6810,
    chartData: {
      labels: [],
      midRates: [],
      wiseRates: [],
      bankRates: []
    },
    visibleCurves: {
      mid: true,
      wise: true,
      bank: false
    },
    activeFilter: 'all',
    liveTickTimer: null,
    apiPollTimer: null,
    chartInstance: null,
    corridorLiveRates: {}
  };

  // ============================================================
  // 3. Custom Currency Dropdown Component (Converter-Style)
  // ============================================================
  class CustomCurrencyDropdown {
    constructor(containerId, triggerId, menuId, searchInputId, listId, hiddenInputId, flagId, codeId, nameId, defaultCode, onSelect) {
      this.container = document.getElementById(containerId);
      this.trigger = document.getElementById(triggerId);
      this.menu = document.getElementById(menuId);
      this.searchInput = document.getElementById(searchInputId);
      this.list = document.getElementById(listId);
      this.hiddenInput = document.getElementById(hiddenInputId);
      this.flagEl = document.getElementById(flagId);
      this.codeEl = document.getElementById(codeId);
      this.nameEl = document.getElementById(nameId);
      this.onSelect = onSelect;

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

      this.menu.querySelectorAll('.hub-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const code = pill.dataset.code || pill.textContent.trim();
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
              <span class="item-flag">${getFlagHtml(c.code)}</span>
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

    setValue(code, triggerCallback = true) {
      const meta = getCurrencyMeta(code);
      this.selectedCode = meta.code;

      if (this.hiddenInput) this.hiddenInput.value = meta.code;
      if (this.flagEl) this.flagEl.innerHTML = getFlagHtml(meta.code);
      if (this.codeEl) this.codeEl.textContent = meta.code;
      if (this.nameEl) this.nameEl.textContent = `— ${meta.name}`;

      if (this.menu) {
        this.menu.querySelectorAll('.hub-pill').forEach(pill => {
          const pillCode = pill.dataset.code || pill.textContent.trim();
          pill.classList.toggle('active', pillCode === meta.code);
        });
      }

      if (triggerCallback && typeof this.onSelect === 'function') {
        this.onSelect(meta.code);
      }
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
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  let baseDropdown = null;
  let targetDropdown = null;

  function initDropdowns() {
    baseDropdown = new CustomCurrencyDropdown(
      'baseDropdownContainer',
      'baseCurrencyTrigger',
      'baseDropdownMenu',
      'baseSearchInput',
      'baseCurrencyList',
      'baseCurrencySelect',
      'baseFlag',
      'baseCode',
      'baseName',
      state.base,
      (newBase) => {
        applyPairAndTimeframe(newBase, state.target);
      }
    );

    targetDropdown = new CustomCurrencyDropdown(
      'targetDropdownContainer',
      'targetCurrencyTrigger',
      'targetDropdownMenu',
      'targetSearchInput',
      'targetCurrencyList',
      'targetCurrencySelect',
      'targetFlag',
      'targetCode',
      'targetName',
      state.target,
      (newTarget) => {
        applyPairAndTimeframe(state.base, newTarget);
      }
    );
  }

  // ============================================================
  // 4. Helper Functions
  // ============================================================
  function $(id) {
    return document.getElementById(id);
  }

  function getDecimals(cur) {
    return ZERO_DECIMALS.has(cur) ? 2 : 4;
  }

  function formatRate(n, cur = state.target, precision = null) {
    if (n == null || isNaN(n)) return '—';
    const dec = precision != null ? precision : getDecimals(cur);
    return Number(n).toFixed(dec);
  }

  function formatTimestamp(date, tf) {
    if (tf === '1H') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else if (tf === '24H') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (tf === '7D' || tf === '1M') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
    }
  }

  function calculateCrossRate(from, to) {
    if (!from || !to || from === to) return 1.0;
    if (state.corridorLiveRates[`${from}_${to}`]) {
      return state.corridorLiveRates[`${from}_${to}`];
    }
    const fromUSD = USD_BASE_RATES[from] || 1.0;
    const toUSD = USD_BASE_RATES[to] || 1.0;
    return toUSD / fromUSD;
  }

  // ============================================================
  // 4. Custom Chart.js Crosshair Plugin
  // ============================================================
  const customCrosshairPlugin = {
    id: 'customCrosshairPlugin',
    afterDraw: (chart) => {
      try {
        const activeElements = (chart.tooltip && typeof chart.tooltip.getActiveElements === 'function')
          ? chart.tooltip.getActiveElements()
          : chart.tooltip?._active;

        if (activeElements && activeElements.length > 0 && activeElements[0]?.element) {
          const activePoint = activeElements[0];
          const { ctx } = chart;
          const x = activePoint.element.x;
          const y = activePoint.element.y;
          if (x == null || y == null || !chart.scales?.y) return;

          const topY = chart.scales.y.top;
          const bottomY = chart.scales.y.bottom;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x, topY);
          ctx.lineTo(x, bottomY);
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(22, 163, 74, 0.45)';
          ctx.stroke();

          // Glowing node on intersection
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#16A34A';
          ctx.shadowColor = '#22C55E';
          ctx.shadowBlur = 10;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, 10, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      } catch (err) {
        // Defensive safeguard against unexpected render errors
      }
    }
  };

  // ============================================================
  // 5. Chart.js Initialization & Gradient Management
  // ============================================================
  function createGradients(ctx) {
    try {
      const gradientMid = ctx.createLinearGradient(0, 0, 0, 380);
      gradientMid.addColorStop(0, 'rgba(22, 163, 74, 0.22)');
      gradientMid.addColorStop(0.5, 'rgba(22, 163, 74, 0.06)');
      gradientMid.addColorStop(1, 'rgba(22, 163, 74, 0.0)');

      const gradientWise = ctx.createLinearGradient(0, 0, 0, 380);
      gradientWise.addColorStop(0, 'rgba(2, 132, 199, 0.15)');
      gradientWise.addColorStop(1, 'rgba(2, 132, 199, 0.0)');

      return { gradientMid, gradientWise };
    } catch (e) {
      return { gradientMid: 'rgba(22, 163, 74, 0.1)', gradientWise: 'transparent' };
    }
  }

  function initChart() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet, retrying in 100ms...');
      setTimeout(initChart, 100);
      return;
    }

    const canvas = $('mainRateChart');
    if (!canvas) return;

    if (state.chartInstance) {
      try {
        state.chartInstance.destroy();
      } catch (e) {}
      state.chartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    const { gradientMid, gradientWise } = createGradients(ctx);

    const config = {
      type: 'line',
      data: {
        labels: state.chartData.labels || [],
        datasets: [
          {
            label: 'Mid-Market Rate',
            data: state.chartData.midRates || [],
            borderColor: '#16A34A',
            borderWidth: 2.8,
            backgroundColor: gradientMid,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#16A34A',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2,
            hidden: !state.visibleCurves.mid,
            order: 1
          },
          {
            label: 'Wise Optimal Route',
            data: state.chartData.wiseRates || [],
            borderColor: '#0284C7',
            borderWidth: 2,
            backgroundColor: gradientWise,
            borderDash: [5, 5],
            fill: false,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#0284C7',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2,
            hidden: !state.visibleCurves.wise,
            order: 2
          },
          {
            label: 'Bank Wire Spread',
            data: state.chartData.bankRates || [],
            borderColor: '#DC2626',
            borderWidth: 1.8,
            borderDash: [3, 3],
            fill: false,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#DC2626',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2,
            hidden: !state.visibleCurves.bank,
            order: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        animation: {
          duration: 400,
          easing: 'easeOutCubic'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: handleCustomTooltip
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(11, 59, 42, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#55705F',
              font: { family: 'Inter', size: 11, weight: '500' },
              maxRotation: 0,
              maxTicksLimit: 8
            }
          },
          y: {
            grid: {
              color: 'rgba(11, 59, 42, 0.06)',
              drawBorder: false
            },
            ticks: {
              color: '#55705F',
              font: { family: 'IBM Plex Mono', size: 11 },
              callback: (value) => formatRate(value, state.target)
            }
          }
        }
      },
      plugins: [customCrosshairPlugin]
    };

    try {
      state.chartInstance = new Chart(ctx, config);
    } catch (err) {
      console.error('Failed to instantiate Chart.js:', err);
    }
  }

  // ============================================================
  // 6. Custom Frosted Glass Tooltip Renderer
  // ============================================================
  function handleCustomTooltip(context) {
    try {
      const tooltipEl = $('chartCustomTooltip');
      if (!tooltipEl) return;
      const { tooltip } = context;

      if (!tooltip || tooltip.opacity === 0) {
        tooltipEl.style.opacity = '0';
        return;
      }

      if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
        const dataIndex = tooltip.dataPoints[0].dataIndex;
        if (dataIndex == null || !state.chartData.midRates || state.chartData.midRates[dataIndex] == null) return;

        const timeLabel = state.chartData.labels[dataIndex] || '';
        const midVal = state.chartData.midRates[dataIndex];
        const wiseVal = state.chartData.wiseRates[dataIndex] || (midVal * 0.9955);
        const bankVal = state.chartData.bankRates[dataIndex] || (midVal * 0.9700);

        const startRate = state.chartData.midRates[0] || midVal;
        const delta = midVal - startRate;
        const deltaPct = startRate > 0 ? ((delta / startRate) * 100).toFixed(2) : '0.00';
        const sign = delta >= 0 ? '+' : '';
        const isUp = delta >= 0;

        // Populate tooltip elements
        if ($('ttTime')) $('ttTime').textContent = timeLabel;
        if ($('ttPair')) $('ttPair').textContent = `${state.base}/${state.target}`;
        if ($('ttRate')) $('ttRate').textContent = formatRate(midVal, state.target);
        
        const ttDelta = $('ttDelta');
        if (ttDelta) {
          ttDelta.textContent = `${sign}${deltaPct}%`;
          ttDelta.className = `tooltip-delta ${isUp ? 'up' : 'down'}`;
        }

        if ($('ttWise')) $('ttWise').textContent = formatRate(wiseVal, state.target);
        if ($('ttBank')) $('ttBank').textContent = formatRate(bankVal, state.target);

        // Positioning tooltip
        const left = tooltip.caretX;
        const top = tooltip.caretY;

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
        tooltipEl.style.opacity = '1';
      }
    } catch (err) {
      // Ignore tooltip render glitches
    }
  }

  // ============================================================
  // 7. Live API & Historical Timeseries Data Fetching
  // ============================================================
  async function fetchLiveExchangeRate(base, target) {
    if (base === target) return 1.0;
    try {
      const res = await fetch(`${API_BASE}/latest?from=${base}&to=${target}`);
      if (res.ok) {
        const data = await res.json();
        const rate = data.rates?.[target];
        if (rate != null && !isNaN(rate) && Number(rate) > 0) {
          state.corridorLiveRates[`${base}_${target}`] = Number(rate);
          return Number(rate);
        }
      }
    } catch (e) {
      console.warn(`Live rate fetch failed for ${base}/${target}, using baseline.`);
    }
    return calculateCrossRate(base, target) || 1.0;
  }

  function generateIntradaySeries(baseRate, count, tf) {
    const labels = [];
    const midRates = [];
    const wiseRates = [];
    const bankRates = [];

    const now = new Date();
    const rate = Number(baseRate) > 0 ? Number(baseRate) : 1.0;
    let current = rate;
    const volatility = 0.0006;

    for (let i = count - 1; i >= 0; i--) {
      let pointTime = new Date(now.getTime());
      if (tf === '1H') {
        pointTime.setMinutes(now.getMinutes() - i);
      } else if (tf === '24H') {
        pointTime.setHours(now.getHours() - i);
      } else if (tf === '7D' || tf === '1M' || tf === '1Y') {
        pointTime.setDate(now.getDate() - i);
      }

      const shock = (Math.random() - 0.495) * (current * volatility);
      current = Math.max(current * 0.85, current + shock);

      labels.push(formatTimestamp(pointTime, tf));
      midRates.push(Number(current.toFixed(6)));
      wiseRates.push(Number((current * 0.9955).toFixed(6)));
      bankRates.push(Number((current * 0.9700).toFixed(6)));
    }

    return { labels, midRates, wiseRates, bankRates };
  }

  async function loadHistoricalData(base, target, tf) {
    // 1. For 1H and 24H: Fetch the live API rate first to anchor current data
    if (tf === '1H' || tf === '24H') {
      const liveRate = await fetchLiveExchangeRate(base, target);
      const count = tf === '1H' ? 60 : 24;
      return generateIntradaySeries(liveRate, count, tf);
    }

    // 2. For 7D, 1M, 1Y: Fetch real historical daily timeseries from Frankfurter API
    const daysMap = { '7D': 7, '1M': 30, '1Y': 365 };
    const days = daysMap[tf] || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = new Date().toISOString().slice(0, 10);

    try {
      const res = await fetch(`${API_BASE}/${startStr}..${endStr}?from=${base}&to=${target}`);
      if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
      const data = await res.json();

      const dates = Object.keys(data.rates || {}).sort();
      if (dates.length < 2) throw new Error('Insufficient historical points');

      const labels = [];
      const midRates = [];
      const wiseRates = [];
      const bankRates = [];

      dates.forEach(d => {
        const val = data.rates[d][target];
        if (val != null && !isNaN(val)) {
          const dateObj = new Date(d + 'T00:00:00');
          labels.push(formatTimestamp(dateObj, tf));
          midRates.push(Number(val));
          wiseRates.push(Number((val * 0.9955).toFixed(6)));
          bankRates.push(Number((val * 0.9700).toFixed(6)));
        }
      });

      if (midRates.length === 0) throw new Error('Empty historical rates array');
      return { labels, midRates, wiseRates, bankRates };
    } catch (err) {
      console.warn(`Falling back to simulated historical series for ${base}/${target} (${tf}):`, err);
      const fallbackRate = await fetchLiveExchangeRate(base, target);
      const count = tf === '7D' ? 7 : tf === '1M' ? 30 : 52;
      return generateIntradaySeries(fallbackRate, count, tf);
    }
  }

  // ============================================================
  // 8. Live Tick Simulation & Background API Sync
  // ============================================================
  function pushLiveTick() {
    if (!state.chartInstance || state.timeframe !== '1H') return;

    // Small random Brownian fluctuation around current rate
    const delta = (Math.random() - 0.495) * (state.currentRate * 0.00025);
    const newRate = state.currentRate + delta;
    state.previousRate = state.currentRate;
    state.currentRate = newRate;

    // Update High / Low
    if (newRate > state.sessionHigh) state.sessionHigh = newRate;
    if (newRate < state.sessionLow) state.sessionLow = newRate;

    const now = new Date();
    const timeLabel = formatTimestamp(now, '1H');

    // Add point to chart
    state.chartData.labels.push(timeLabel);
    state.chartData.midRates.push(newRate);
    state.chartData.wiseRates.push(newRate * 0.9955);
    state.chartData.bankRates.push(newRate * 0.9700);

    // Keep last 60 points for 1H view
    if (state.chartData.labels.length > 60) {
      state.chartData.labels.shift();
      state.chartData.midRates.shift();
      state.chartData.wiseRates.shift();
      state.chartData.bankRates.shift();
    }

    state.chartInstance.update('none'); // Silent live update
    updateUIElements();
  }

  async function pollLiveRateFromAPI() {
    try {
      const res = await fetch(`${API_BASE}/latest?from=${state.base}&to=${state.target}`);
      if (res.ok) {
        const data = await res.json();
        const apiRate = data.rates?.[state.target];
        if (apiRate != null) {
          state.previousRate = state.currentRate;
          state.currentRate = apiRate;
          updateUIElements();
        }
      }
    } catch (e) {
      // Graceful degradation - keep simulated stream running
    }
  }

  // ============================================================
  // 9. UI Updaters & DOM Synchronization
  // ============================================================
  function updateUIElements() {
    const cur = state.target;
    const rate = state.currentRate;
    const dayOpen = state.dayOpenRate || rate;
    const delta = rate - dayOpen;
    const deltaPct = ((delta / dayOpen) * 100).toFixed(2);
    const sign = delta >= 0 ? '+' : '';
    const isUp = delta >= 0;

    // 1. Top Deck Cards
    if ($('deckLiveRate')) $('deckLiveRate').textContent = formatRate(rate, cur);
    if ($('deckTargetCode')) $('deckTargetCode').textContent = cur;

    const deckChange = $('deckLiveChange');
    if (deckChange) {
      deckChange.textContent = `${sign}${deltaPct}%`;
      deckChange.className = `change-pill ${isUp ? 'up' : 'down'}`;
    }

    if ($('deckHighRate')) $('deckHighRate').textContent = formatRate(state.sessionHigh, cur);
    if ($('deckLowRate')) $('deckLowRate').textContent = formatRate(state.sessionLow, cur);

    const volatility = (((state.sessionHigh - state.sessionLow) / rate) * 100).toFixed(2);
    if ($('deckVolatility')) $('deckVolatility').textContent = `${volatility}%`;

    const arbitrageGain = ((0.9955 - 0.9700) / 0.9700 * 100).toFixed(2);
    if ($('deckArbitrageYield')) $('deckArbitrageYield').textContent = `+${arbitrageGain}%`;

    // 2. Chart Overlay Stats
    if ($('studioPairTitle')) $('studioPairTitle').textContent = `${state.base} / ${state.target} Mid-Market Live Stream`;
    if ($('chartMainRate')) $('chartMainRate').textContent = formatRate(rate, cur);
    if ($('chartTargetCode')) $('chartTargetCode').textContent = cur;

    const chartBadge = $('chartDeltaBadge');
    if (chartBadge) {
      chartBadge.className = `overlay-delta-badge ${isUp ? 'up' : 'down'}`;
    }
    if ($('chartDeltaValue')) $('chartDeltaValue').textContent = `${sign}${formatRate(delta, cur, 4)} (${sign}${deltaPct}%)`;

    if ($('benchMidVal')) $('benchMidVal').textContent = formatRate(rate, cur);
    if ($('benchWiseVal')) $('benchWiseVal').textContent = formatRate(rate * 0.9955, cur);
    if ($('benchBankVal')) $('benchBankVal').textContent = formatRate(rate * 0.9700, cur);

    // 3. Flags & Custom Dropdowns
    if ($('baseFlag')) $('baseFlag').innerHTML = getFlagHtml(state.base);
    if ($('targetFlag')) $('targetFlag').innerHTML = getFlagHtml(state.target);
    if ($('baseCurrencySelect')) $('baseCurrencySelect').value = state.base;
    if ($('targetCurrencySelect')) $('targetCurrencySelect').value = state.target;
    if (baseDropdown) baseDropdown.setValue(state.base, false);
    if (targetDropdown) targetDropdown.setValue(state.target, false);

    // 4. Footer info
    if ($('statDataPoints')) $('statDataPoints').textContent = state.chartData.labels.length;
    if ($('lastSyncedTime')) $('lastSyncedTime').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  async function applyPairAndTimeframe(newBase, newTarget, newTf = state.timeframe) {
    if (newBase === newTarget) {
      alert('Base and target currencies must be different.');
      return;
    }

    state.base = newBase;
    state.target = newTarget;
    state.timeframe = newTf;

    // Fetch live or historical data from API
    const dataset = await loadHistoricalData(state.base, state.target, state.timeframe);
    state.chartData = dataset;

    const rates = dataset.midRates;
    if (rates.length > 0) {
      state.currentRate = rates[rates.length - 1];
      state.dayOpenRate = rates[0];
      state.sessionHigh = Math.max(...rates);
      state.sessionLow = Math.min(...rates);
    }

    // Update active quick chip
    document.querySelectorAll('.quick-pair-chip').forEach(chip => {
      const match = chip.dataset.base === state.base && chip.dataset.target === state.target;
      chip.classList.toggle('active', match);
    });

    // Update active timeframe pill
    document.querySelectorAll('.tf-btn').forEach(btn => {
      const match = btn.dataset.tf === state.timeframe;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    // Update Chart
    if (state.chartInstance) {
      state.chartInstance.data.labels = state.chartData.labels;
      state.chartInstance.data.datasets[0].data = state.chartData.midRates;
      state.chartInstance.data.datasets[1].data = state.chartData.wiseRates;
      state.chartInstance.data.datasets[2].data = state.chartData.bankRates;
      state.chartInstance.update();
    }

    updateUIElements();
  }

  // ============================================================
  // 10. Corridor Performance Matrix (Table with SVG Sparklines & Live Rates)
  // ============================================================
  async function fetchAllCorridorLiveRates() {
    const bases = Array.from(new Set(CORRIDORS.map(c => c.base)));
    await Promise.all(
      bases.map(async (base) => {
        try {
          const res = await fetch(`${API_BASE}/latest?from=${base}`);
          if (res.ok) {
            const data = await res.json();
            const rates = data.rates || {};
            CORRIDORS.filter(c => c.base === base).forEach(c => {
              if (rates[c.target] != null) {
                state.corridorLiveRates[`${c.base}_${c.target}`] = rates[c.target];
              }
            });
          }
        } catch (e) {}
      })
    );
    renderCorridorTable(state.activeFilter);
  }

  function generateSvgSparkline(points, type) {
    const width = 100;
    const height = 28;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const isUp = type === 'up';
    const strokeColor = isUp ? '#16A34A' : '#DC2626';
    const fillColor = isUp ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)';

    const pathData = `M ${coords.join(' L ')}`;
    const areaData = `M ${coords[0]} L ${coords.join(' L ')} L ${width},${height} L 0,${height} Z`;

    return `
      <svg class="sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <path d="${areaData}" fill="${fillColor}" />
        <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  function renderCorridorTable(filter = 'all') {
    const tbody = $('corridorTableBody');
    if (!tbody) return;

    const filtered = CORRIDORS.filter(c => {
      if (filter === 'all') return true;
      return c.category === filter;
    });

    tbody.innerHTML = filtered.map(item => {
      const rate = calculateCrossRate(item.base, item.target);
      const isUp = item.sparklineType === 'up';
      const changeVal = (isUp ? 1 : -1) * (0.05 + Math.random() * 0.45);
      const changeSign = changeVal >= 0 ? '+' : '';
      const changeClass = changeVal >= 0 ? 'up' : 'down';

      const sparkPoints = [
        rate * (1 - 0.008),
        rate * (1 - 0.004),
        rate * (1 + 0.002),
        rate * (1 - 0.001),
        rate * (1 + (isUp ? 0.005 : -0.005)),
        rate * (1 + (isUp ? 0.009 : -0.009)),
        rate
      ];

      const lowRange = formatRate(rate * 0.992, item.target);
      const highRange = formatRate(rate * 1.008, item.target);
      const fillPct = isUp ? 68 : 34;

      return `
        <tr data-base="${item.base}" data-target="${item.target}">
          <td class="col-pair">
            <div class="corridor-pair-cell">
              <div class="pair-flags">
                <span>${getFlagHtml(item.base)}</span>
                <span>${getFlagHtml(item.target)}</span>
              </div>
              <div class="pair-names">
                <span class="pair-symbol">${item.base} / ${item.target}</span>
                <span class="pair-fullname">${CURRENCY_NAMES[item.base] || item.base} → ${CURRENCY_NAMES[item.target] || item.target}</span>
              </div>
            </div>
          </td>
          <td class="col-rate">
            <span class="mono-rate">${formatRate(rate, item.target)}</span>
          </td>
          <td class="col-change">
            <span class="change-pill ${changeClass}">${changeSign}${changeVal.toFixed(2)}%</span>
          </td>
          <td class="col-range">
            <div class="range-bar-cell">
              <div class="range-labels">
                <span>${lowRange}</span>
                <span>${highRange}</span>
              </div>
              <div class="range-track">
                <div class="range-fill" style="width: ${fillPct}%;"></div>
              </div>
            </div>
          </td>
          <td class="col-route">
            <span class="badge-cheapest-path">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
              </svg>
              ${item.bestRoute}
            </span>
          </td>
          <td class="col-sparkline">
            ${generateSvgSparkline(sparkPoints, item.sparklineType)}
          </td>
          <td class="col-action" style="text-align: right;">
            <button type="button" class="btn-table-action" data-base="${item.base}" data-target="${item.target}">
              <span>Analyze</span>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path d="M4.167 10h11.666M10.833 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row click listeners for instant pair switching
    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', (e) => {
        const b = row.dataset.base;
        const t = row.dataset.target;
        if (b && t) {
          applyPairAndTimeframe(b, t);
          window.scrollTo({ top: $('chartStudio').offsetTop - 90, behavior: 'smooth' });
        }
      });
    });
  }

  // ============================================================
  // 11. Event Listeners & Initialization
  // ============================================================
  function setupEventListeners() {
    // 1. Dropdown Selectors
    $('baseCurrencySelect')?.addEventListener('change', (e) => {
      applyPairAndTimeframe(e.target.value, state.target);
    });

    $('targetCurrencySelect')?.addEventListener('change', (e) => {
      applyPairAndTimeframe(state.base, e.target.value);
    });

    // 2. Swap Button
    $('btnSwapPairs')?.addEventListener('click', () => {
      applyPairAndTimeframe(state.target, state.base);
    });

    // 3. Quick Chips
    document.querySelectorAll('.quick-pair-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        applyPairAndTimeframe(chip.dataset.base, chip.dataset.target);
      });
    });

    // 4. Timeframe Tabs
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyPairAndTimeframe(state.base, state.target, btn.dataset.tf);
      });
    });

    // 5. Curve Toggles
    $('toggleMidCurve')?.addEventListener('click', function () {
      state.visibleCurves.mid = !state.visibleCurves.mid;
      this.classList.toggle('active', state.visibleCurves.mid);
      if (state.chartInstance) {
        state.chartInstance.setDatasetVisibility(0, state.visibleCurves.mid);
        state.chartInstance.update();
      }
    });

    $('toggleWiseCurve')?.addEventListener('click', function () {
      state.visibleCurves.wise = !state.visibleCurves.wise;
      this.classList.toggle('active', state.visibleCurves.wise);
      if (state.chartInstance) {
        state.chartInstance.setDatasetVisibility(1, state.visibleCurves.wise);
        state.chartInstance.update();
      }
    });

    $('toggleBankCurve')?.addEventListener('click', function () {
      state.visibleCurves.bank = !state.visibleCurves.bank;
      this.classList.toggle('active', state.visibleCurves.bank);
      if (state.chartInstance) {
        state.chartInstance.setDatasetVisibility(2, state.visibleCurves.bank);
        state.chartInstance.update();
      }
    });

    // 6. Corridor Filter Tabs
    document.querySelectorAll('.matrix-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.matrix-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeFilter = btn.dataset.filter;
        renderCorridorTable(state.activeFilter);
      });
    });

    // 7. Manual Refresh Button
    $('btnManualRefresh')?.addEventListener('click', () => {
      applyPairAndTimeframe(state.base, state.target);
      fetchAllCorridorLiveRates();
    });

    // 8. Mobile Menu Toggle
    const menuBtn = $('menuToggleBtn');
    const mobileNav = $('mobileNavDrawer');
    if (menuBtn && mobileNav) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
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

    // 9. Theme Toggle
    $('btnNavThemeToggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('bypassfx_theme', next);
    });

    // 10. Auth Session Status in Nav
    function updateNavbarAuth() {
      const session = localStorage.getItem('bypassfx_session') || sessionStorage.getItem('bypassfx_session');
      const navAuth = $('navRightContainer') || $('navAuthContainer');
      const mobAuth = $('mobileNavAuthContainer');

      if (session) {
        try {
          const user = JSON.parse(session);
          const firstName = user.name ? user.name.split(' ')[0] : 'Account';
          if (navAuth) {
            navAuth.innerHTML = `
              <a href="profile.html" class="user-badge-pill" title="View Account Profile">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>${firstName}</span>
              </a>
            `;
          }
          if (mobAuth) {
            mobAuth.innerHTML = `
              <a href="profile.html" class="btn-primary" style="text-align: center;">${firstName}</a>
            `;
          }
        } catch (e) {}
      } else {
        if (navAuth) {
          navAuth.innerHTML = `
            <a href="login.html" class="btn-nav-login">Log in</a>
            <a href="signup.html" class="btn-nav-signup">Sign up</a>
          `;
        }
        if (mobAuth) {
          mobAuth.innerHTML = `
            <a href="login.html" class="btn-secondary" style="text-align: center;">Log in</a>
            <a href="signup.html" class="btn-primary" style="text-align: center;">Sign up</a>
          `;
        }
      }
    }

    updateNavbarAuth();
  }

  // ============================================================
  // 12. Back to Top Button
  // ============================================================
  function initBackToTop() {
    const btn = document.getElementById('btnBackToTop');
    if (!btn) return;

    const toggleVisibility = () => {
      if (window.scrollY > 350) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ============================================================
  // 13. Main Bootstrap
  // ============================================================
  async function init() {
    initDropdowns();
    setupEventListeners();

    // Seed baseline intraday series synchronously so Chart initializes with valid data immediately
    const fallbackRate = calculateCrossRate(state.base, state.target);
    state.currentRate = fallbackRate;
    state.chartData = generateIntradaySeries(fallbackRate, 60, '1H');
    state.dayOpenRate = state.chartData.midRates[0] || fallbackRate;
    state.sessionHigh = Math.max(...state.chartData.midRates);
    state.sessionLow = Math.min(...state.chartData.midRates);

    initChart();
    renderCorridorTable('all');
    initBackToTop();
    updateUIElements();

    // Load initial live API connection asynchronously and update chart
    try {
      await applyPairAndTimeframe(state.base, state.target, '1H');
    } catch (e) {
      console.warn('Initial live API pair fetch failed, continuing with live stream.');
    }

    // Fetch live rates for all corridors in background
    fetchAllCorridorLiveRates();

    // Start live continuous micro-ticks
    clearInterval(state.liveTickTimer);
    state.liveTickTimer = setInterval(pushLiveTick, LIVE_TICK_INTERVAL_MS);

    // Start periodic background API sync every 20 seconds
    clearInterval(state.apiPollTimer);
    state.apiPollTimer = setInterval(pollLiveRateFromAPI, LIVE_POLL_INTERVAL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
