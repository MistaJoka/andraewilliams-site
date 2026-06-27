const KIND = { health: "panel-health", deploys: "panel-deploys", repo: "panel-repo" };

let pollingStarted = false;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function render(state) {
  const banner = document.getElementById("banner");
  banner.className = "banner state-" + state.overall;
  document.getElementById("banner-text").textContent = state.banner;
  const hb = state.heartbeat
    ? "last cycle " + new Date(state.heartbeat * 1000).toLocaleTimeString()
    : "no telemetry yet";
  document.getElementById("heartbeat").textContent = hb;

  for (const id of Object.values(KIND)) {
    document.querySelector(`#${id} .rows`).innerHTML = "";
  }
  for (const c of state.checks) {
    const kind = c.key.split(".")[0];
    const panel = document.getElementById(KIND[kind]);
    if (!panel) continue;
    const row = document.createElement("div");
    row.className = "row";
    const val = c.value == null ? "" : Math.round(c.value);
    row.innerHTML =
      `<span class="dot ${esc(c.state)}"></span>` +
      `<span class="label">${esc(c.label)}</span>` +
      `<span class="detail">${esc(c.detail)}</span>` +
      `<span class="val">${val}</span>`;
    panel.querySelector(".rows").appendChild(row);
  }

  const inc = document.querySelector("#panel-incidents .rows");
  inc.innerHTML = "";
  for (const i of state.incidents) {
    const row = document.createElement("div");
    row.className = "row";
    const open = i.resolved_at ? "resolved" : "OPEN";
    row.innerHTML =
      `<span class="dot ${i.resolved_at ? "ok" : "crit"}"></span>` +
      `<span class="label">${esc(i.label)}</span>` +
      `<span class="detail">${esc(open)} · ${new Date(i.opened_at * 1000).toLocaleString()}</span>`;
    inc.appendChild(row);
  }

  const open = (state.open_incidents || []).length;
  document.title = (state.overall === "ok" ? "🟢" : "🔴") +
    " OPS" + (open ? ` (${open})` : "");
}

function start() {
  try {
    const es = new EventSource("/events");
    es.onmessage = (e) => render(JSON.parse(e.data));
    es.onerror = () => { es.close(); pollFallback(); };
  } catch (_) {
    pollFallback();
  }
}

function pollFallback() {
  if (pollingStarted) return; pollingStarted = true;
  const tick = () =>
    fetch("/api/state").then((r) => r.json()).then(render).catch(() => {});
  tick();
  setInterval(tick, 5000);
}

start();
