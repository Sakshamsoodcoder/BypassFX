// Purely decorative — illustrative rates for the brand panel, not live data.
(function () {
  const pairs = [
    { pair: "USD/INR", rate: "83.12", dir: "up" },
    { pair: "EUR/USD", rate: "1.087", dir: "down" },
    { pair: "GBP/INR", rate: "105.4", dir: "up" },
    { pair: "USD/JPY", rate: "148.9", dir: "down" },
    { pair: "AUD/USD", rate: "0.663", dir: "up" },
    { pair: "EUR/GBP", rate: "0.855", dir: "down" },
  ];

  const track = document.getElementById("tickerTrack");
  if (!track) return;

  function renderSet() {
    return pairs
      .map((p) => {
        const arrow = p.dir === "up" ? "▲" : "▼";
        return `<span class="tick ${p.dir}"><b>${p.pair}</b> ${p.rate} ${arrow}</span>`;
      })
      .join("");
  }

  // duplicate the set so the scroll loop is seamless
  track.innerHTML = renderSet() + renderSet();
})();
