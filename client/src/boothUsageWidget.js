const BOOTH_MATERIALS = {
  LOLA: "Borne Photobooth Miroir Lola",
  NINA: "Borne Photobooth Nina",
  GABIN: "Borne Photobooth Gabin"
};

const BOOTH_LABELS = {
  LOLA: "Lola",
  NINA: "Nina",
  GABIN: "Gabin"
};

function parseEventDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function countUsage(events) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);

  const rows = Object.fromEntries(
    Object.keys(BOOTH_MATERIALS).map(key => [key, { week: 0, month: 0, year: 0 }])
  );

  for (const event of events || []) {
    if (event?.archived) continue;
    const booking = String(event?.bookingStatus || "").toUpperCase();
    if (booking === "CANCELLED" || booking === "DECLINED") continue;

    const date = parseEventDate(event?.date);
    if (!date) continue;

    const materials = Array.isArray(event?.materials) ? event.materials : [];

    for (const [booth, material] of Object.entries(BOOTH_MATERIALS)) {
      if (!materials.includes(material)) continue;
      if (date >= weekStart && date < weekEnd) rows[booth].week += 1;
      if (date >= monthStart && date < monthEnd) rows[booth].month += 1;
      if (date >= yearStart && date < yearEnd) rows[booth].year += 1;
    }
  }

  return rows;
}

function ensureStyles() {
  if (document.getElementById("lp28-booth-usage-styles")) return;

  const style = document.createElement("style");
  style.id = "lp28-booth-usage-styles";
  style.textContent = `
    #lp28-booth-usage-panel{margin:16px 0;padding:0;overflow:hidden}
    #lp28-booth-usage-panel .booth-usage-head{padding:18px 20px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;border-bottom:1px solid rgba(148,163,184,.16)}
    #lp28-booth-usage-panel .booth-usage-badge{padding:7px 10px;border-radius:999px;border:1px solid rgba(96,165,250,.28);background:rgba(59,130,246,.08);font-size:12px;font-weight:800;color:#93c5fd}
    #lp28-booth-usage-panel .booth-usage-table-wrap{overflow-x:auto}
    #lp28-booth-usage-panel table{width:100%;border-collapse:collapse;min-width:620px}
    #lp28-booth-usage-panel th{padding:12px 16px;background:rgba(148,163,184,.08);font-size:12px;text-transform:uppercase;letter-spacing:.03em}
    #lp28-booth-usage-panel td{padding:14px 16px;border-top:1px solid rgba(148,163,184,.12);font-weight:800}
    #lp28-booth-usage-panel th:not(:first-child),#lp28-booth-usage-panel td:not(:first-child){text-align:center}
    #lp28-booth-usage-panel .booth-name{font-weight:950}
    #lp28-booth-usage-panel .booth-name.lola{color:#f472b6}
    #lp28-booth-usage-panel .booth-name.nina{color:#38bdf8}
    #lp28-booth-usage-panel .booth-name.gabin{color:#fb923c}
    #lp28-booth-usage-panel .booth-total-row td{border-top:1px solid rgba(214,185,79,.38);background:rgba(214,185,79,.06);font-weight:950}
    #lp28-booth-usage-panel .booth-total-row td:last-child{color:#f4c542}
    html[data-lp28-theme="light"] #lp28-booth-usage-panel .booth-usage-badge{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}
    html[data-lp28-theme="light"] #lp28-booth-usage-panel th{background:#f7f5ef}
    @media(max-width:760px){#lp28-booth-usage-panel .booth-usage-head{padding:14px}#lp28-booth-usage-panel th,#lp28-booth-usage-panel td{padding:11px 12px}}
  `;

  document.head.appendChild(style);
}

function createPanel(rows) {
  const panel = document.createElement("section");
  panel.id = "lp28-booth-usage-panel";
  panel.className = "panel";

  const totals = Object.values(rows).reduce(
    (acc, row) => ({
      week: acc.week + row.week,
      month: acc.month + row.month,
      year: acc.year + row.year
    }),
    { week: 0, month: 0, year: 0 }
  );

  const rowHtml = Object.keys(BOOTH_MATERIALS).map(booth => {
    const row = rows[booth];
    return `
      <tr>
        <td class="booth-name ${booth.toLowerCase()}">🖥️ ${BOOTH_LABELS[booth]}</td>
        <td>${row.week}</td>
        <td>${row.month}</td>
        <td>${row.year}</td>
      </tr>
    `;
  }).join("");

  panel.innerHTML = `
    <div class="booth-usage-head">
      <div>
        <div class="panel-kicker">SUIVI DU MATÉRIEL</div>
        <h2 style="margin:4px 0">📸 Utilisation des bornes</h2>
        <p class="muted" style="margin:0">Nombre de prestations prévues avec chaque borne.</p>
      </div>
      <div class="booth-usage-badge">Hors événements annulés / refusés</div>
    </div>
    <div class="booth-usage-table-wrap">
      <table>
        <thead>
          <tr>
            <th style="text-align:left">Borne</th>
            <th>Cette semaine</th>
            <th>Ce mois-ci</th>
            <th>Cette année</th>
          </tr>
        </thead>
        <tbody>
          ${rowHtml}
          <tr class="booth-total-row">
            <td>Total utilisations</td>
            <td>${totals.week}</td>
            <td>${totals.month}</td>
            <td>${totals.year}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  return panel;
}

async function loadAdminEvents() {
  const sessionResponse = await fetch("/api/session", { credentials: "include" });
  if (!sessionResponse.ok) return null;
  const session = await sessionResponse.json().catch(() => ({}));
  if (!session?.authenticated || session?.user?.role !== "ADMIN") return null;

  const response = await fetch("/api/events", { credentials: "include" });
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return data.events || [];
}

export function startBoothUsageWidget() {
  ensureStyles();

  let loading = false;
  let lastRefresh = 0;

  const refresh = async () => {
    const statsGrid = document.querySelector("main.content .stats-grid");
    const dashboardPanel = document.querySelector("main.content .dashboard-panel");

    if (!statsGrid || !dashboardPanel) {
      document.getElementById("lp28-booth-usage-panel")?.remove();
      return;
    }

    if (loading) return;
    const now = Date.now();
    if (now - lastRefresh < 15000 && document.getElementById("lp28-booth-usage-panel")) return;

    loading = true;
    try {
      const events = await loadAdminEvents();
      if (!events) {
        document.getElementById("lp28-booth-usage-panel")?.remove();
        return;
      }

      const rows = countUsage(events);
      const current = document.getElementById("lp28-booth-usage-panel");
      const panel = createPanel(rows);

      if (current) current.replaceWith(panel);
      else dashboardPanel.parentNode.insertBefore(panel, dashboardPanel);

      lastRefresh = Date.now();
    } catch (error) {
      console.warn("LP28 utilisation des bornes :", error);
    } finally {
      loading = false;
    }
  };

  const observer = new MutationObserver(() => {
    window.clearTimeout(observer._lp28Timer);
    observer._lp28Timer = window.setTimeout(refresh, 120);
  });

  observer.observe(document.getElementById("root"), { childList: true, subtree: true });
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });

  refresh();
  window.setInterval(refresh, 60000);
}
