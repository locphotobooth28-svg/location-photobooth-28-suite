const BOOTHS = [
  { id: "LOLA", label: "Lola", material: "Borne Photobooth Miroir Lola", color: "#c084fc" },
  { id: "NINA", label: "Nina", material: "Borne Photobooth Nina", color: "#38bdf8" },
  { id: "GABIN", label: "Gabin", material: "Borne Photobooth Gabin", color: "#fb923c" }
];

function parseEventDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function emptyRows() {
  return Object.fromEntries(BOOTHS.map(booth => [booth.id, { week: 0, month: 0, year: 0 }]));
}

function countUsage(events) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 12, 0, 0, 0);
  const yearStart = new Date(now.getFullYear(), 0, 1, 12, 0, 0, 0);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1, 12, 0, 0, 0);
  const rows = emptyRows();

  for (const event of events || []) {
    const booking = String(event?.bookingStatus || "").toUpperCase();
    if (booking === "CANCELLED" || booking === "DECLINED") continue;
    const date = parseEventDate(event?.date);
    if (!date) continue;
    const materials = Array.isArray(event?.materials) ? event.materials : [];
    for (const booth of BOOTHS) {
      if (!materials.includes(booth.material)) continue;
      if (date >= weekStart && date < weekEnd) rows[booth.id].week += 1;
      if (date >= monthStart && date < monthEnd) rows[booth.id].month += 1;
      if (date >= yearStart && date < yearEnd) rows[booth.id].year += 1;
    }
  }

  return rows;
}

function ensureStyles() {
  if (document.getElementById("lp28-booth-usage-styles")) return;
  const style = document.createElement("style");
  style.id = "lp28-booth-usage-styles";
  style.textContent = `
    #lp28-booth-usage-panel{margin:18px 0;padding:0;overflow:hidden;border:1px solid rgba(214,185,79,.42);border-radius:16px;background:rgba(17,24,39,.58);box-shadow:0 10px 28px rgba(0,0,0,.14)}
    #lp28-booth-usage-panel .booth-usage-head{padding:18px 20px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;border-bottom:1px solid rgba(148,163,184,.16)}
    #lp28-booth-usage-panel .booth-usage-head h2{margin:4px 0 4px}
    #lp28-booth-usage-panel .booth-usage-head p{margin:0}
    #lp28-booth-usage-panel .booth-usage-badge{padding:7px 10px;border-radius:999px;border:1px solid rgba(96,165,250,.28);background:rgba(59,130,246,.08);font-size:12px;font-weight:800;color:#93c5fd}
    #lp28-booth-usage-panel .booth-usage-table-wrap{overflow-x:auto}
    #lp28-booth-usage-panel table{width:100%;border-collapse:collapse;min-width:620px}
    #lp28-booth-usage-panel th{padding:12px 16px;background:rgba(148,163,184,.08);font-size:12px;text-transform:uppercase;letter-spacing:.03em;text-align:center}
    #lp28-booth-usage-panel th:first-child{text-align:left}
    #lp28-booth-usage-panel td{padding:14px 16px;border-top:1px solid rgba(148,163,184,.12);font-weight:800;text-align:center}
    #lp28-booth-usage-panel td:first-child{text-align:left}
    #lp28-booth-usage-panel .booth-name{font-weight:950}
    #lp28-booth-usage-panel .booth-total-row td{border-top:1px solid rgba(214,185,79,.38);background:rgba(214,185,79,.06);font-weight:950}
    #lp28-booth-usage-panel .booth-status{padding:9px 16px;font-size:12px;color:#94a3b8;border-top:1px solid rgba(148,163,184,.12)}
    #lp28-booth-usage-panel .booth-status.error{color:#fca5a5}
    html[data-lp28-theme="light"] #lp28-booth-usage-panel{background:#fff;color:#171717;border-color:#d8cda8}
    html[data-lp28-theme="light"] #lp28-booth-usage-panel .booth-usage-badge{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}
    html[data-lp28-theme="light"] #lp28-booth-usage-panel th{background:#f7f5ef}
    @media(max-width:760px){#lp28-booth-usage-panel .booth-usage-head{padding:14px}#lp28-booth-usage-panel th,#lp28-booth-usage-panel td{padding:11px 12px}}
  `;
  document.head.appendChild(style);
}

function createPanel(rows, status = "Chargement des événements…", isError = false) {
  const panel = document.createElement("section");
  panel.id = "lp28-booth-usage-panel";
  panel.className = "panel";
  const totals = BOOTHS.reduce((acc, booth) => ({
    week: acc.week + rows[booth.id].week,
    month: acc.month + rows[booth.id].month,
    year: acc.year + rows[booth.id].year
  }), { week: 0, month: 0, year: 0 });
  const rowHtml = BOOTHS.map(booth => {
    const row = rows[booth.id];
    return `<tr><td class="booth-name" style="color:${booth.color}">🖥️ ${booth.label}</td><td>${row.week}</td><td>${row.month}</td><td>${row.year}</td></tr>`;
  }).join("");

  panel.innerHTML = `
    <div class="booth-usage-head">
      <div><div class="panel-kicker">SUIVI DU MATÉRIEL</div><h2>📸 Utilisation des bornes</h2><p class="muted">Nombre de prestations réservées avec chaque borne.</p></div>
      <div class="booth-usage-badge">Hors événements annulés / refusés</div>
    </div>
    <div class="booth-usage-table-wrap"><table><thead><tr><th>Borne</th><th>Cette semaine</th><th>Ce mois-ci</th><th>Cette année</th></tr></thead><tbody>${rowHtml}<tr class="booth-total-row"><td>Total utilisations</td><td>${totals.week}</td><td>${totals.month}</td><td>${totals.year}</td></tr></tbody></table></div>
    <div class="booth-status ${isError ? "error" : ""}">${status}</div>`;

  return panel;
}

function placePanel(panel, statsGrid) {
  const current = document.getElementById("lp28-booth-usage-panel");
  if (current) current.replaceWith(panel);
  else statsGrid.insertAdjacentElement("afterend", panel);
}

export function startBoothUsageWidget() {
  ensureStyles();
  let loading = false;
  let refreshTimer = null;

  const refresh = async () => {
    const statsGrid = document.querySelector("main.content .stats-grid");
    if (!statsGrid) {
      document.getElementById("lp28-booth-usage-panel")?.remove();
      return;
    }

    if (!document.getElementById("lp28-booth-usage-panel")) {
      placePanel(createPanel(emptyRows()), statsGrid);
    }

    if (loading) return;
    loading = true;

    try {
      const response = await fetch("/api/events", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(`API événements : ${response.status}`);
      const data = await response.json().catch(() => ({}));
      const events = Array.isArray(data?.events) ? data.events : [];
      placePanel(createPanel(countUsage(events), `${events.length} événement(s) analysé(s) · mise à jour automatique`), statsGrid);
    } catch (error) {
      console.warn("LP28 utilisation des bornes :", error);
      placePanel(createPanel(emptyRows(), "Impossible de charger les compteurs pour le moment.", true), statsGrid);
    } finally {
      loading = false;
    }
  };

  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 50);
  };

  const root = document.getElementById("root");
  if (root) {
    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  setTimeout(refresh, 50);
  setTimeout(refresh, 300);
  setTimeout(refresh, 1000);
  setInterval(refresh, 30000);
}
