// graphBuilder.js — (rates, providers) → adjacency list. Pure. No DOM, no
// fetch, no localStorage — safe to unit test with plain objects.

export function nodesNeeded(from, to, hubCurrencies) {
  return Array.from(new Set([from, to, ...hubCurrencies]));
}

export function buildGraph(ratesByBase, providers, allowedNodes) {
  const allowed = allowedNodes ? new Set(allowedNodes) : null;
  const graph = {};

  for (const base of Object.keys(ratesByBase)) {
    graph[base] = [];
    const quotes = ratesByBase[base];

    for (const quote of Object.keys(quotes)) {
      if (allowed && !allowed.has(quote)) continue;
      const rate = quotes[quote];
      if (!rate || rate <= 0) continue;

      for (const provider of providers) {
        graph[base].push({
          to: quote,
          provider: provider.name,
          rate,
          feePercent: provider.feePercent,
          feeFixed: provider.feeFixed,
        });
      }
    }
  }

  return graph;
}
