// ticker.js — Static top marquee ticker for auth pages without external API calls

const STATIC_PAIRS = [
  { label: 'USD/INR', status: 'Active Corridor' },
  { label: 'EUR/USD', status: 'Active Corridor' },
  { label: 'GBP/INR', status: 'Active Corridor' },
  { label: 'USD/JPY', status: 'Active Corridor' },
  { label: 'AUD/USD', status: 'Active Corridor' },
  { label: 'EUR/GBP', status: 'Active Corridor' },
  { label: 'USD/AED', status: 'Active Corridor' },
  { label: 'USD/CAD', status: 'Active Corridor' }
];

(function init() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  const set = STATIC_PAIRS.map((p) => {
    return `<span class="tick up"><b>${p.label}</b> ${p.status} ●</span>`;
  }).join('');

  track.innerHTML = set + set;
})();

