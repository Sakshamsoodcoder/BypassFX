// rateService.js — cache-aware fetch wrapper (impure: touches localStorage + network)

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const API_BASE = 'https://api.frankfurter.app';

function cacheKey(base) {
  return `bypassfx:rates:${base}`;
}

function readCache(base) {
  try {
    const raw = localStorage.getItem(cacheKey(base));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null; // e.g. Safari private mode throws instead of returning null
  }
}

function writeCache(base, rates) {
  try {
    localStorage.setItem(cacheKey(base), JSON.stringify({ base, rates, fetchedAt: Date.now() }));
  } catch (err) {
    // Fail silently — worst case the app just re-fetches more often.
  }
}

function isFresh(entry) {
  return Boolean(entry) && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

async function fetchRatesFor(base) {
  const res = await fetch(`${API_BASE}/latest?from=${base}`);
  if (!res.ok) throw new Error(`Rate lookup failed for ${base} (${res.status})`);
  const data = await res.json();
  return data.rates || {};
}

// Returns { rates: { INR: {...}, USD: {...} }, staleBases: ['INR'] }
export async function getRates(bases) {
  const rates = {};
  const staleBases = [];

  await Promise.all(
    bases.map(async (base) => {
      const cached = readCache(base);
      if (isFresh(cached)) {
        rates[base] = cached.rates;
        return;
      }

      try {
        const fresh = await fetchRatesFor(base);
        writeCache(base, fresh);
        rates[base] = fresh;
      } catch (err) {
        if (cached) {
          rates[base] = cached.rates;
          staleBases.push(base);
        } else {
          throw new Error(`Could not get rates for ${base}, and no cache available.`);
        }
      }
    })
  );

  return { rates, staleBases };
}
