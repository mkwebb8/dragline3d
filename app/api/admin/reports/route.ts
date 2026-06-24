// app/api/admin/reports/route.ts
// POST { type: "weekly" | "monthly" } → generates analytics summary and emails it
// Called by Cloudflare cron or manually from admin
import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const RESEND_KEY = process.env.RESEND_API_KEY!;
const REPORT_EMAIL = process.env.REPORT_EMAIL || "mkwebb8@gmail.com";

const SQUARE_PCT = 0.029;
const SQUARE_FIXED = 0.30;
const ELECTRICITY_RATE = 0.12;
const AVG_PRINTER_WATTS = 300;
const COST_PER_KG: Record<string, number> = {
  PLA: 16, PETG: 18, TPU: 24, ABS: 20, ASA: 22, "PET-GF15": 30,
  "PETG-ESD": 66, PA: 35, "ASA-CF": 40, "PETG-CF": 40, "PA-CF": 80, PCTG: 29.95,
};

function fc(n: number) { return `$${n.toFixed(2)}`; }
function pct(n: number, total: number) { return total > 0 ? `${((n / total) * 100).toFixed(0)}%` : "0%"; }

async function fetchOrders(since: string): Promise<any[]> {
  const r = await fetch(
    `${SB_URL}/rest/v1/orders?created_at=gte.${since}&status=neq.pending&status=neq.cancelled&select=*,order_items(*)&order=created_at.desc`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  if (!r.ok) return [];
  return r.json();
}

function calcMetrics(orders: any[]) {
  const completed = orders.filter(o => !["pending", "cancelled"].includes(o.status));
  const revenue = completed.reduce((s, o) => s + Number(o.total || 0), 0);
  const sqFees = completed.reduce((s, o) => s + (o.square_fee != null
    ? Number(o.square_fee)
    : Math.round((Number(o.total || 0) * SQUARE_PCT + SQUARE_FIXED) * 100) / 100), 0);
  const refunds = completed.reduce((s, o) => s + Number(o.refunded_amount || 0), 0);
  const shipping = completed.reduce((s, o) => s + Number(o.shipping_cost || 0), 0);
  const paidOut = revenue - sqFees - refunds;

  let filamentCost = 0, printHours = 0, totalItems = 0;
  const matRev: Record<string, number> = {};
  for (const o of completed) {
    for (const i of (o.order_items || [])) {
      const qty = i.qty || 1;
      const mat = i.material || "PLA";
      filamentCost += ((i.grams || 0) * qty / 1000) * (COST_PER_KG[mat] || 16);
      printHours += (i.print_hours || i.hours || 0) * qty;
      totalItems += qty;
      matRev[mat] = (matRev[mat] || 0) + (i.price || 0) * qty;
    }
  }
  const elec = (printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
  const grossProfit = revenue - filamentCost - elec - sqFees;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const avgOrderValue = completed.length > 0 ? revenue / completed.length : 0;

  // Top materials by revenue
  const topMats = Object.entries(matRev).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Customer repeat
  const custMap: Record<string, number> = {};
  for (const o of completed) custMap[o.customer_email || o.customer_name] = (custMap[o.customer_email || o.customer_name] || 0) + 1;
  const repeatCount = Object.values(custMap).filter(n => n > 1).length;
  const totalCusts = Object.keys(custMap).length;

  return {
    revenue, sqFees, refunds, shipping, paidOut, filamentCost, elec, grossProfit,
    grossMarginPct, avgOrderValue, printHours, totalItems, topMats,
    repeatCount, totalCusts, orderCount: completed.length,
  };
}

function buildEmailHtml(type: string, period: string, m: ReturnType<typeof calcMetrics>, prevM: ReturnType<typeof calcMetrics> | null) {
  const revDelta = prevM ? m.revenue - prevM.revenue : null;
  const profitDelta = prevM ? m.grossProfit - prevM.grossProfit : null;

  function delta(val: number | null) {
    if (val === null) return "";
    const color = val >= 0 ? "#22c55e" : "#ef4444";
    const sign = val >= 0 ? "▲" : "▼";
    return `<span style="color:${color};font-size:11px;margin-left:6px">${sign} ${fc(Math.abs(val))}</span>`;
  }

  const statBox = (label: string, value: string, sub: string, color = "#f59e0b") =>
    `<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px;flex:1;min-width:120px">
      <div style="font-family:monospace;font-size:10px;color:#6b7280;margin-bottom:6px;letter-spacing:0.08em">${label}</div>
      <div style="font-family:sans-serif;font-weight:800;font-size:20px;color:${color}">${value}</div>
      <div style="font-family:monospace;font-size:10px;color:#6b7280;margin-top:4px">${sub}</div>
    </div>`;

  const flagRows: string[] = [];
  if (m.grossMarginPct < 40) flagRows.push(`⚠️ Gross margin is ${m.grossMarginPct.toFixed(0)}% — below 40% target`);
  if (m.orderCount === 0) flagRows.push(`⚠️ No completed orders this period`);
  if (m.repeatCount === 0 && m.totalCusts > 2) flagRows.push(`⚠️ 0% repeat customer rate — consider follow-up outreach`);

  return `<!DOCTYPE html><html><body style="background:#0d0d1a;margin:0;padding:20px;font-family:sans-serif;color:#e5e5e5">
  <div style="max-width:580px;margin:0 auto">
    <div style="margin-bottom:24px">
      <div style="font-family:monospace;font-size:11px;color:#6b7280;letter-spacing:0.12em">DRAGLINE 3D</div>
      <div style="font-size:22px;font-weight:800;color:#f59e0b;margin-top:4px">${type === "weekly" ? "Weekly" : "Monthly"} Report</div>
      <div style="font-family:monospace;font-size:11px;color:#6b7280;margin-top:2px">${period}</div>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      ${statBox("COLLECTED", fc(m.revenue) + delta(revDelta), `${m.orderCount} orders`)}
      ${statBox("PAID OUT", fc(m.paidOut), "after fees & refunds", "#34d399")}
      ${statBox("GROSS PROFIT", fc(m.grossProfit) + delta(profitDelta), `${m.grossMarginPct.toFixed(0)}% margin`, m.grossMarginPct > 40 ? "#22c55e" : "#ef4444")}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
      ${statBox("SQ FEES", fc(m.sqFees), pct(m.sqFees, m.revenue) + " of revenue", "#f97316")}
      ${statBox("FILAMENT", fc(m.filamentCost), pct(m.filamentCost, m.revenue) + " of revenue", "#ef4444")}
      ${statBox("ELECTRICITY", fc(m.elec), `${m.printHours.toFixed(0)}h printed`, "#eab308")}
      ${statBox("AVG ORDER", fc(m.avgOrderValue), `${m.totalItems} parts`, "#a78bfa")}
    </div>

    ${m.topMats.length > 0 ? `
    <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="font-family:monospace;font-size:10px;color:#6b7280;margin-bottom:10px;letter-spacing:0.08em">TOP MATERIALS BY REVENUE</div>
      ${m.topMats.map(([mat, rev]) => `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-family:monospace;font-size:12px;color:#e5e5e5">${mat}</span>
          <span style="font-family:monospace;font-size:12px;color:#f59e0b;font-weight:700">${fc(rev)}</span>
        </div>`).join("")}
    </div>` : ""}

    ${m.totalCusts > 0 ? `
    <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="font-family:monospace;font-size:10px;color:#6b7280;margin-bottom:10px;letter-spacing:0.08em">CUSTOMERS</div>
      <div style="display:flex;gap:24px">
        <div><span style="font-family:monospace;font-size:11px;color:#6b7280">Total: </span><span style="font-family:monospace;font-size:12px;font-weight:700">${m.totalCusts}</span></div>
        <div><span style="font-family:monospace;font-size:11px;color:#6b7280">Repeat: </span><span style="font-family:monospace;font-size:12px;font-weight:700;color:${m.repeatCount > 0 ? "#22c55e" : "#6b7280"}">${m.repeatCount}</span></div>
        <div><span style="font-family:monospace;font-size:11px;color:#6b7280">Shipping P&L: </span><span style="font-family:monospace;font-size:12px;font-weight:700;color:${m.shipping > 0 ? "#f59e0b" : "#6b7280"}">${fc(m.shipping)}</span></div>
      </div>
    </div>` : ""}

    ${flagRows.length > 0 ? `
    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="font-family:monospace;font-size:10px;color:#ef4444;margin-bottom:8px;letter-spacing:0.08em">FLAGS</div>
      ${flagRows.map(f => `<div style="font-family:monospace;font-size:12px;color:#fca5a5;margin-bottom:4px">${f}</div>`).join("")}
    </div>` : `
    <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.20);border-radius:10px;padding:12px 16px;margin-bottom:16px">
      <div style="font-family:monospace;font-size:12px;color:#86efac">✓ No flags — looking good this period</div>
    </div>`}

    <div style="font-family:monospace;font-size:10px;color:#374151;text-align:center;margin-top:24px">
      DRAGLINE 3D · <a href="https://dragline3d.com/admin/analytics" style="color:#f59e0b">View Full Analytics</a>
    </div>
  </div>
</body></html>`;
}

export async function POST(request: Request) {
  // Allow both admin token and internal cron calls
  const isCron = request.headers.get("x-cron-secret") === process.env.CRON_SECRET;
  if (!isCron && !await verifyAdminToken(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type = "weekly" } = await request.json().catch(() => ({}));

  // Determine date range
  const now = new Date();
  let since: string;
  let periodLabel: string;

  if (type === "monthly") {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    since = firstOfMonth.toISOString();
    periodLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    // For comparison, go 2 months back
    const prevFirst = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    var prevSince = prevFirst.toISOString();
    var prevUntil = firstOfMonth.toISOString();
  } else {
    // Weekly: last 7 days
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    since = weekAgo.toISOString();
    periodLabel = `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    const prevWeekAgo = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    var prevSince = prevWeekAgo.toISOString();
    var prevUntil = weekAgo.toISOString();
  }

  const [orders, prevOrdersRaw] = await Promise.all([
    fetchOrders(since),
    fetchOrders(prevSince!),
  ]);

  // Filter prev orders to the correct window
  const prevOrders = prevOrdersRaw.filter(o => o.created_at < prevUntil!);

  const metrics = calcMetrics(orders);
  const prevMetrics = prevOrders.length > 0 ? calcMetrics(prevOrders) : null;

  const html = buildEmailHtml(type, periodLabel, metrics, prevMetrics);
  const subject = type === "weekly"
    ? `Dragline 3D Weekly Report · ${periodLabel}`
    : `Dragline 3D Monthly Report · ${periodLabel}`;

  if (!RESEND_KEY) {
    return Response.json({ ok: true, preview: true, subject, metrics });
  }

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Dragline 3D Reports <reports@dragline3d.com>",
      to: [REPORT_EMAIL],
      subject,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    return Response.json({ error: err }, { status: 502 });
  }

  return Response.json({ ok: true, type, period: periodLabel, orders: metrics.orderCount });
}
