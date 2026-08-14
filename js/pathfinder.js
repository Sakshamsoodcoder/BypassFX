// pathfinder.js — (graph, from, to, amount, maxHops) → best path. Pure.
//
// Simulates the amount through each candidate path rather than using a
// -log(rate) Dijkstra, because Bank wire's fixed fee makes an edge's cost
// depend on the amount arriving at it — a fixed fee isn't scale-invariant
// the way a percentage fee is. Exact, and fast enough given maxHops is
// capped and the graph is restricted to a handful of hub currencies.

export function findBestPath(graph, from, to, amount, maxHops = 3) {
  if (from === to) {
    return { best: null, runnerUp: null, direct: null };
  }

  const results = [];

  function dfs(node, currentAmount, path, visited) {
    if (node === to) {
      results.push({ amount: currentAmount, path: [...path] });
    }
    if (path.length >= maxHops) return;

    const edges = graph[node] || [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      const nextAmount = currentAmount * edge.rate * (1 - edge.feePercent) - edge.feeFixed;
      if (nextAmount <= 0) continue;

      visited.add(edge.to);
      path.push({ ...edge, amountAfter: nextAmount });
      dfs(edge.to, nextAmount, path, visited);
      path.pop();
      visited.delete(edge.to);
    }
  }

  dfs(from, amount, [], new Set([from]));

  if (results.length === 0) {
    return { best: null, runnerUp: null, direct: null };
  }

  results.sort((a, b) => b.amount - a.amount);
  const direct = results.find((r) => r.path.length === 1) || null;

  return { best: results[0], runnerUp: results[1] || null, direct };
}
