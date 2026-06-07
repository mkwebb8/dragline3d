"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TrendingUp, Package, Zap, DollarSign, Weight, Users, BarChart2, Download, Calendar, TrendingDown, Target } from "lucide-react";
import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const innerCell: CSSProperties = { background: "rgba(255,255,255,0.04)", borderRadius: 12 };
const inputSt: CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" };

const ELECTRICITY_RATE = 0.12;
const AVG_PRINTER_WATTS = 300;
const SQUARE_PCT = 0.029;
const SQUARE_FIXED = 0.30;
const PROFIT_FIRST = { profit: 0.15, ownerComp: 0.25, taxes: 0.30, opex: 0.30 };
const MATERIAL_COLORS_MAP: Record<string, string> = {
  PLA: "#3b82f6", PETG: "#10b981", TPU: "#f59e0b", ABS: "#ef4444",
  ASA: "#8b5cf6", "PET-GF15": "#06b6d4", "PETG-ESD": "#f97316",
  PA: "#84cc16", "ASA-CF": "#ec4899", "PETG-CF": "#14b8a6", "PA-CF": "#6366f1", PCTG: "#a78bfa",
};
const COST_PER_KG: Record<string, number> = {
  PLA: 16, PETG: 18, TPU: 24, ABS: 20, ASA: 22, "PET-GF15": 30,
  "PETG-ESD": 66, PA: 35, "ASA-CF": 40, "PETG-CF": 40, "PA-CF": 80, PCTG: 29.95,
};

function fc(n: number) { return `$${n.toFixed(2)}`; }
function fMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function BarChart({ data, color = "#f59e0b", label, prefix = "" }: { data: { month: string; value: number }[]; color?: string; label: string; prefix?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map(d => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full rounded-md transition-all relative group" style={{ height: `${Math.max((d.value / max) * 100, 2)}%`, background: color, opacity: d.value > 0 ? 1 : 0.15 }}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-lg px-1.5 py-0.5 font-mono text-[9px] text-bone whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10" style={glass}>
              {prefix}{label === "count" ? d.value : d.value.toFixed(label === "$" ? 2 : 1)}{label !== "$" && label !== "count" ? label : ""}
            </div>
          </div>
          <div className="font-mono text-[9px] text-steel truncate w-full text-center">{fMonth(d.month)}</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color = "text-amber", icon: Icon }: any) {
  return (
    <div className="rounded-xl p-4" style={glass}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-steel" />
        <div className="font-mono text-xs text-steel tracking-wider">{label}</div>
      </div>
      <div className={`font-display font-bold text-2xl ${color}`}>{value}</div>
      {sub && <div className="font-mono text-xs text-steel mt-1">{sub}</div>}
    </div>
  );
}

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [goveeWatts, setGoveeWatts] = useState<number | null>(null);
  const [goveeOn, setGoveeOn] = useState<boolean | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [novoBalances, setNovoBalances] = useState({ profit: "", ownerComp: "", taxes: "", opex: "" });
  const [spools, setSpools] = useState<any[]>([]);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("dragline_admin_token");
    if (!token) { router.push("/admin/login"); return; }
    setLoading(true);
    const statuses = ["received", "queued", "printing", "quality_check", "shipped", "delivered", "cancelled", "pending"];
    const results = await Promise.all(statuses.map(s =>
      fetch(`/api/admin/orders?status=${s}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : [])
    ));
    setOrders(results.flat());
    fetch("/api/admin/inventory", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSpools(data))
      .catch(() => {});
    fetch("/api/admin/govee").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.watts !== undefined) setGoveeWatts(data.watts);
      if (data?.on !== undefined) setGoveeOn(data.on);
    }).catch(() => {});
    const saved = localStorage.getItem("novo_balances");
    if (saved) setNovoBalances(JSON.parse(saved));
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function saveNovoBalances(balances: typeof novoBalances) {
    setNovoBalances(balances);
    localStorage.setItem("novo_balances", JSON.stringify(balances));
  }

  const filteredOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const d = o.created_at.slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  const completedOrders = filteredOrders.filter(o => !["pending", "cancelled"].includes(o.status));
  const allActiveOrders = filteredOrders.filter(o => o.status !== "pending");

  const monthlyData: Record<string, {
    revenue: number; materialCost: number; tax: number; printHours: number;
    grams: Record<string, number>; orderCount: number; shipping: number;
    itemCount: number; squareFees: number;
  }> = {};

  for (const order of completedOrders) {
    const month = order.created_at?.slice(0, 7);
    if (!month) continue;
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, materialCost: 0, tax: 0, printHours: 0, grams: {}, orderCount: 0, shipping: 0, itemCount: 0, squareFees: 0 };
    const subtotal = order.subtotal || 0;
    const shipping = Number(order.shipping_cost || 0);
    const tax = Math.round(subtotal * 0.06 * 100) / 100;
    const squareFee = Math.round(((order.total || 0) * SQUARE_PCT + SQUARE_FIXED) * 100) / 100;
    monthlyData[month].revenue += subtotal;
    monthlyData[month].tax += tax;
    monthlyData[month].shipping += shipping;
    monthlyData[month].squareFees += squareFee;
    monthlyData[month].orderCount += 1;
    for (const item of (order.order_items || [])) {
      const qty = item.qty || 1;
      const grams = (item.grams || 0) * qty;
      const hours = (item.print_hours || item.hours || 0) * qty;
      const mat = item.material || "PLA";
      monthlyData[month].materialCost += (grams / 1000) * (COST_PER_KG[mat] || 16);
      monthlyData[month].printHours += hours;
      monthlyData[month].grams[mat] = (monthlyData[month].grams[mat] || 0) + grams;
      monthlyData[month].itemCount += qty;
    }
  }

  const months = Object.keys(monthlyData).sort().slice(-6);
  const mRev = months.map(m => ({ month: m, value: monthlyData[m].revenue }));
  const mProfit = months.map(m => {
    const d = monthlyData[m];
    const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
    return { month: m, value: d.revenue - d.materialCost - elec - d.squareFees };
  });
  const mNetProfit = months.map(m => {
    const d = monthlyData[m];
    const realRev = d.revenue - d.squareFees;
    return { month: m, value: realRev * PROFIT_FIRST.profit };
  });
  const mMatCost = months.map(m => ({ month: m, value: monthlyData[m].materialCost }));
  const mOrders = months.map(m => ({ month: m, value: monthlyData[m].orderCount }));
  const mHours = months.map(m => ({ month: m, value: monthlyData[m].printHours }));
  const mItems = months.map(m => ({ month: m, value: monthlyData[m].itemCount }));
  const mMargin = months.map(m => {
    const d = monthlyData[m];
    const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
    const profit = d.revenue - d.materialCost - elec - d.squareFees;
    return { month: m, value: d.revenue > 0 ? (profit / d.revenue) * 100 : 0 };
  });

  const totalRevenue = completedOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const totalShipping = completedOrders.reduce((s, o) => s + Number(o.shipping_cost || 0), 0);
  const totalSquareFees = completedOrders.reduce((s, o) => s + Math.round(((o.total || 0) * SQUARE_PCT + SQUARE_FIXED) * 100) / 100, 0);
  const totalMatCost = completedOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((si: number, i: any) => si + ((i.grams || 0) * (i.qty || 1) / 1000) * (COST_PER_KG[i.material] || 16), 0), 0);
  const totalHours = completedOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((si: number, i: any) => si + (i.print_hours || i.hours || 0) * (i.qty || 1), 0), 0);
  const totalElecCost = (totalHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
  const totalProfit = totalRevenue - totalMatCost - totalElecCost - totalSquareFees;
  const totalTax = completedOrders.reduce((s, o) => s + Math.round((o.subtotal || 0) * 0.06 * 100) / 100, 0);
  const totalItems = completedOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((si: number, i: any) => si + (i.qty || 1), 0), 0);
  const avgOrderValue = totalRevenue / (completedOrders.length || 1);
  const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Profit First
  const realRevenue = totalRevenue - totalSquareFees;
  const pfProfit = realRevenue * PROFIT_FIRST.profit;
  const pfOwnerComp = realRevenue * PROFIT_FIRST.ownerComp;
  const pfTaxes = realRevenue * PROFIT_FIRST.taxes;
  const pfOpex = realRevenue * PROFIT_FIRST.opex;

  // Net profit
  const netProfit = pfProfit;
  const netMarginPct = realRevenue > 0 ? (netProfit / realRevenue) * 100 : 0;

  // Inventory value
  const inventoryValue = spools.reduce((sum, s) =>
    sum + (Number(s.weight_remaining_g) / 1000) * (Number(s.cost_per_kg) || COST_PER_KG[s.material] || 16), 0);

  // Op expenses tracking (Novo)
  const actualOpex = parseFloat(novoBalances.opex) || 0;
  const opexVariance = pfOpex - actualOpex;
  const opexUsedPct = pfOpex > 0 ? Math.min((actualOpex / pfOpex) * 100, 100) : 0;
  const opexEfficiencyScore = pfOpex > 0 ? Math.max(0, Math.round(((pfOpex - actualOpex) / pfOpex) * 100)) : 0;

  // Production cost vs opex budget (COGS + Square + Electricity)
  const totalProductionCost = totalMatCost + totalSquareFees + totalElecCost;
  const productionVsOpex = pfOpex - totalProductionCost;
  const productionOpexPct = pfOpex > 0 ? Math.min((totalProductionCost / pfOpex) * 100, 100) : 0;

  const statusCounts: Record<string, number> = {};
  for (const o of allActiveOrders) { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; }
  const STATUS_COLORS_MAP: Record<string, string> = { pending: "#6b7280", received: "#3b82f6", queued: "#f59e0b", printing: "#f97316", quality_check: "#a855f7", shipped: "#22c55e", delivered: "#16a34a", cancelled: "#ef4444" };
  const STATUS_LABELS: Record<string, string> = { pending: "Pending", received: "Received", queued: "Queued", printing: "Printing", quality_check: "QC", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };

  const customerRevenue: Record<string, { revenue: number; orders: number; email: string }> = {};
  for (const o of completedOrders) {
    const name = o.customer_name || "Unknown";
    if (!customerRevenue[name]) customerRevenue[name] = { revenue: 0, orders: 0, email: o.customer_email };
    customerRevenue[name].revenue += o.subtotal || 0;
    customerRevenue[name].orders += 1;
  }
  const topCustomers = Object.entries(customerRevenue).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

  const materialStats: Record<string, { grams: number; orders: Set<string>; revenue: number; lastUsed: string }> = {};
  for (const o of completedOrders) {
    for (const item of (o.order_items || [])) {
      const mat = item.material || "PLA";
      if (!materialStats[mat]) materialStats[mat] = { grams: 0, orders: new Set(), revenue: 0, lastUsed: "" };
      materialStats[mat].grams += (item.grams || 0) * (item.qty || 1);
      materialStats[mat].orders.add(o.id);
      materialStats[mat].revenue += (item.price || 0) * (item.qty || 1);
      if (!materialStats[mat].lastUsed || o.created_at > materialStats[mat].lastUsed) materialStats[mat].lastUsed = o.created_at;
    }
  }
  const materialList = Object.entries(materialStats).sort((a, b) => b[1].grams - a[1].grams);
  const maxMatGrams = Math.max(...materialList.map(([, s]) => s.grams), 1);

  function handleExportMonthly() {
    const rows = months.map(m => {
      const d = monthlyData[m];
      const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
      const profit = d.revenue - d.materialCost - elec - d.squareFees;
      const realRev = d.revenue - d.squareFees;
      const netP = realRev * PROFIT_FIRST.profit;
      return {
        Month: fMonth(m), Orders: d.orderCount, Parts: d.itemCount,
        Revenue: d.revenue.toFixed(2), "Material Cost": d.materialCost.toFixed(2),
        "Electricity": elec.toFixed(2), "Square Fees": d.squareFees.toFixed(2),
        "Tax Collected": d.tax.toFixed(2), Shipping: d.shipping.toFixed(2),
        "Gross Profit": profit.toFixed(2),
        "Gross Margin %": d.revenue > 0 ? ((profit / d.revenue) * 100).toFixed(0) : "0",
        "Net Profit (PF 15%)": netP.toFixed(2),
        "Net Margin %": realRev > 0 ? ((netP / realRev) * 100).toFixed(0) : "0",
        "Filament kg": (Object.values(d.grams).reduce((s, g) => s + g, 0) / 1000).toFixed(3),
        "Print Hours": d.printHours.toFixed(1),
      };
    });
    exportCSV(rows, "dragline3d-monthly.csv");
  }

  function handleExportOrders() {
    const rows = completedOrders.map(o => ({
      "Order ID": o.id, Customer: o.customer_name, Email: o.customer_email,
      Date: o.created_at?.slice(0, 10), Status: o.status,
      Subtotal: (o.subtotal || 0).toFixed(2), Tax: Math.round((o.subtotal || 0) * 0.06 * 100) / 100,
      Shipping: Number(o.shipping_cost || 0).toFixed(2), Total: (o.total || 0).toFixed(2),
      "Square Fee": ((o.total || 0) * SQUARE_PCT + SQUARE_FIXED).toFixed(2),
    }));
    exportCSV(rows, "dragline3d-orders.csv");
  }

  function handleExportMaterials() {
    const rows = materialList.map(([mat, s]) => ({
      Material: mat, "kg Used": (s.grams / 1000).toFixed(3),
      "Orders": s.orders.size, Revenue: s.revenue.toFixed(2),
      "Last Used": s.lastUsed?.slice(0, 10) || "",
    }));
    exportCSV(rows, "dragline3d-materials.csv");
  }

  if (loading) return (
    <div className="max-w-6xl mx-auto px-6 py-16 text-center">
      <div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors cursor-pointer"><ArrowLeft size={20} /></Link>
          <div>
            <div className="font-display font-extrabold text-xl">Analytics</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D · BUSINESS OVERVIEW</div>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl text-bone/60 hover:text-bone transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Date filter */}
      <div className="rounded-xl p-4 mb-6 flex items-center gap-4 flex-wrap" style={glass}>
        <Calendar size={14} className="text-steel" />
        <div className="flex items-center gap-2">
          <label className="font-mono text-xs text-steel">FROM</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1 rounded-lg text-bone text-xs font-mono transition-colors" style={inputSt}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-mono text-xs text-steel">TO</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1 rounded-lg text-bone text-xs font-mono transition-colors" style={inputSt}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }} />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="font-mono text-xs text-steel hover:text-bone underline cursor-pointer">Clear</button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {[
            { label: "Orders", handler: handleExportOrders },
            { label: "Monthly", handler: handleExportMonthly },
            { label: "Materials", handler: handleExportMaterials },
          ].map(({ label, handler }) => (
            <button key={label} onClick={handler}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <Download size={12} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Govee */}
      {(goveeWatts !== null || goveeOn !== null) && (
        <div className="mb-6 rounded-xl p-4 flex items-center gap-4"
          style={goveeOn
            ? { ...glass, border: "1px solid rgba(249,115,22,0.40)", background: "rgba(249,115,22,0.05)" }
            : glass}>
          <Zap size={16} className={goveeOn ? "text-orange-400" : "text-steel"} />
          <div className="flex items-center gap-4 font-mono text-sm flex-wrap">
            <span className="text-steel">PRINTER OUTLET</span>
            <span className={`font-bold ${goveeOn ? "text-orange-400" : "text-steel"}`}>{goveeOn ? "ON" : "STANDBY"}</span>
            {goveeWatts !== null && goveeWatts > 0 && <span className="text-amber font-bold">{goveeWatts}W live</span>}
            {goveeWatts !== null && goveeWatts > 0 && <span className="text-steel">{fc((goveeWatts / 1000) * ELECTRICITY_RATE)}/hr</span>}
          </div>
        </div>
      )}

      {/* P&L Summary */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">
        P&L SUMMARY {(dateFrom || dateTo) && <span className="text-amber ml-2">FILTERED</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="REVENUE" value={fc(totalRevenue)} sub={`${completedOrders.length} orders`} icon={DollarSign} />
        <StatCard label="COGS (MATERIAL)" value={fc(totalMatCost)} sub={`${(totalMatCost / (totalRevenue || 1) * 100).toFixed(0)}% of revenue`} color="text-red-400" icon={Weight} />
        <StatCard label="SQUARE FEES" value={fc(totalSquareFees)} sub="2.9% + $0.30/order" color="text-orange-400" icon={DollarSign} />
        <StatCard label="ELECTRICITY EST." value={fc(totalElecCost)} sub={`${totalHours.toFixed(0)}h × ${AVG_PRINTER_WATTS}W`} color="text-yellow-400" icon={Zap} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="GROSS PROFIT" value={fc(totalProfit)} sub={`${marginPct.toFixed(0)}% gross margin`} color={totalProfit > 0 ? "text-green-400" : "text-red-400"} icon={TrendingUp} />
        <StatCard label="NET PROFIT (PF 15%)" value={fc(netProfit)} sub={`${netMarginPct.toFixed(0)}% of real revenue`} color={netProfit > 0 ? "text-emerald-400" : "text-red-400"} icon={Target} />
        <StatCard label="SHIPPING COLLECTED" value={fc(totalShipping)} sub="from customers" color="text-blue-400" icon={Package} />
        <StatCard label="AVG ORDER VALUE" value={fc(avgOrderValue)} sub="excl. tax & shipping" icon={BarChart2} />
        <StatCard label="INVENTORY VALUE" value={fc(inventoryValue)} sub={`${spools.length} spools on hand`} color="text-cyan-400" icon={Package} />
      </div>

      {/* Op Expenses Tracker */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">OPERATING EXPENSES TRACKER</div>
      <div className="rounded-xl p-5 mb-6" style={glass}>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Budget vs Actual + Production breakdown */}
          <div className="md:col-span-2 space-y-5">
            {/* Novo opex balance vs budget */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-xs text-steel">NOVO OPEX BALANCE vs. BUDGET (30%)</div>
                <div className="font-mono text-xs text-amber">{fc(pfOpex)} target</div>
              </div>
              <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${opexUsedPct}%`, background: opexUsedPct > 90 ? "#ef4444" : opexUsedPct > 70 ? "#f59e0b" : "#22c55e" }} />
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-steel">Actual spent: <span className={actualOpex > 0 ? (actualOpex > pfOpex ? "text-red-400" : "text-green-400") : "text-steel"}>{actualOpex > 0 ? fc(actualOpex) : "Enter in Novo fields →"}</span></span>
                <span className={opexUsedPct > 0 ? (opexVariance >= 0 ? "text-green-400" : "text-red-400") : "text-steel"}>
                  {actualOpex > 0 ? (opexVariance >= 0 ? `${fc(opexVariance)} under budget` : `${fc(Math.abs(opexVariance))} OVER budget`) : ""}
                </span>
              </div>
            </div>

            {/* Production cost vs opex budget */}
            <div className="pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-xs text-steel">PRODUCTION COSTS vs. OPEX BUDGET</div>
                <div className="font-mono text-xs text-steel flex items-center gap-1.5 flex-wrap justify-end">
                  <span className="text-red-400">{fc(totalMatCost)}</span>
                  <span className="text-steel/40">COGS +</span>
                  <span className="text-orange-400">{fc(totalSquareFees)}</span>
                  <span className="text-steel/40">fees +</span>
                  <span className="text-yellow-400">{fc(totalElecCost)}</span>
                  <span className="text-steel/40">elec =</span>
                  <span className="text-bone font-bold">{fc(totalProductionCost)}</span>
                </div>
              </div>
              <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${productionOpexPct}%`, background: productionOpexPct > 90 ? "#ef4444" : productionOpexPct > 70 ? "#f59e0b" : "#22c55e" }} />
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-steel">{productionOpexPct.toFixed(0)}% of your 30% opex bucket used by production</span>
                <span className={productionVsOpex >= 0 ? "text-green-400" : "text-red-400"}>
                  {productionVsOpex >= 0
                    ? `${fc(productionVsOpex)} left — consider bumping profit %`
                    : `${fc(Math.abs(productionVsOpex))} over — tighten or raise prices`}
                </span>
              </div>
            </div>

            {/* Allocation breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "OWNER COMP", pct: 25, val: pfOwnerComp, color: "#f59e0b" },
                { label: "TAXES", pct: 30, val: pfTaxes, color: "#ef4444" },
                { label: "OP. EXPENSES", pct: 30, val: pfOpex, color: "#3b82f6" },
              ].map(({ label, pct, val, color }) => (
                <div key={label} className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="font-mono text-[9px] text-steel mb-1">{label}</div>
                  <div className="font-display font-bold text-sm" style={{ color }}>{fc(val)}</div>
                  <div className="font-mono text-[9px] text-steel">{pct}% reserved</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lean score */}
          <div className="flex flex-col items-center justify-center rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="font-mono text-xs text-steel mb-2 tracking-widest">LEAN SCORE</div>
            <div className={`font-display font-black text-5xl mb-1 ${
              actualOpex === 0 ? "text-steel" :
              opexEfficiencyScore >= 50 ? "text-green-400" :
              opexEfficiencyScore >= 20 ? "text-amber" : "text-red-400"
            }`}>
              {actualOpex > 0 ? `${opexEfficiencyScore}%` : "—"}
            </div>
            <div className="font-mono text-[9px] text-steel text-center">
              {actualOpex === 0 ? "Enter Novo opex balance" :
               opexEfficiencyScore >= 50 ? "Lean & profitable" :
               opexEfficiencyScore >= 20 ? "Room to tighten" : "Trim expenses"}
            </div>
            {actualOpex > 0 && opexVariance > 0 && (
              <div className="mt-2 font-mono text-xs text-green-400 text-center font-bold">{fc(opexVariance)} saved</div>
            )}
            <div className="mt-3 font-mono text-[9px] text-steel text-center">
              Higher score = more room<br />to boost profit or owner comp
            </div>
          </div>
        </div>
      </div>

      {/* Profit First Reserves */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">PROFIT FIRST RESERVES</div>
      <div className="rounded-xl p-5 mb-8" style={glass}>
        <div className="font-mono text-xs text-steel mb-4">Rolling totals based on real revenue (subtotal minus Square fees). Enter actual Novo balances to see if you&apos;re caught up.</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: "profit", label: "PROFIT", pct: 15, target: pfProfit, color: "text-green-400", borderColor: "rgba(34,197,94,0.30)" },
            { key: "ownerComp", label: "OWNER COMP", pct: 25, target: pfOwnerComp, color: "text-amber", borderColor: "rgba(255,181,71,0.30)" },
            { key: "taxes", label: "TAXES", pct: 30, target: pfTaxes, color: "text-red-400", borderColor: "rgba(239,68,68,0.30)" },
            { key: "opex", label: "OP. EXPENSES", pct: 30, target: pfOpex, color: "text-blue-400", borderColor: "rgba(59,130,246,0.30)" },
          ].map(({ key, label, pct, target, color, borderColor }) => {
            const actual = parseFloat(novoBalances[key as keyof typeof novoBalances]) || 0;
            const diff = actual - target;
            return (
              <div key={key} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${borderColor}` }}>
                <div className="font-mono text-xs text-steel mb-1">{label} ({pct}%)</div>
                <div className={`font-display font-bold text-lg ${color}`}>{fc(target)}</div>
                <div className="font-mono text-xs text-steel mb-2">target</div>
                <input
                  type="number" step="0.01" placeholder="Actual balance"
                  value={novoBalances[key as keyof typeof novoBalances]}
                  onChange={e => saveNovoBalances({ ...novoBalances, [key]: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg text-bone text-xs font-mono mb-1 transition-colors"
                  style={inputSt}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }} />
                {actual > 0 && (
                  <div className={`font-mono text-xs ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {diff >= 0 ? "+" : ""}{fc(diff)} vs target
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Net profit callout */}
        <div className="mt-4 rounded-xl p-4 flex items-center justify-between" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.20)" }}>
          <div>
            <div className="font-mono text-xs text-steel mb-0.5">NET PROFIT — what you actually keep after all obligations</div>
            <div className="font-mono text-xs text-steel/50">Revenue − Square fees = {fc(realRevenue)} real revenue × 15% profit</div>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <div className="font-display font-black text-2xl text-green-400">{fc(netProfit)}</div>
            <div className="font-mono text-xs text-green-400/60">{netMarginPct.toFixed(0)}% net margin</div>
          </div>
        </div>
      </div>

      {/* Monthly trend charts */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">MONTHLY TRENDS (LAST 6 MONTHS)</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "REVENUE", data: mRev, color: "#f59e0b", labelStr: "$" },
          { label: "GROSS PROFIT", data: mProfit, color: "#22c55e", labelStr: "$" },
          { label: "NET PROFIT (PF)", data: mNetProfit, color: "#10b981", labelStr: "$" },
          { label: "MATERIAL COST", data: mMatCost, color: "#ef4444", labelStr: "$" },
        ].map(({ label, data, color, labelStr }) => (
          <div key={label} className="rounded-xl p-4" style={glass}>
            <div className="font-mono text-xs text-steel tracking-widest mb-3">{label}</div>
            <BarChart data={data} color={color} label={labelStr} prefix="$" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "ORDER COUNT", data: mOrders, color: "#3b82f6", labelStr: "count" },
          { label: "PRINT HOURS", data: mHours, color: "#f97316", labelStr: "h" },
          { label: "PARTS PRINTED", data: mItems, color: "#8b5cf6", labelStr: "pcs" },
          { label: "PROFIT MARGIN %", data: mMargin, color: "#10b981", labelStr: "%" },
        ].map(({ label, data, color, labelStr }) => (
          <div key={label} className="rounded-xl p-4" style={glass}>
            <div className="font-mono text-xs text-steel tracking-widest mb-3">{label}</div>
            <BarChart data={data} color={color} label={labelStr} />
          </div>
        ))}
      </div>

      {/* Material + status */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5" style={glass}>
          <div className="font-mono text-xs text-amber tracking-widest mb-4 flex items-center justify-between">
            FILAMENT USAGE
            <button onClick={handleExportMaterials} className="flex items-center gap-1 text-steel hover:text-bone transition-colors cursor-pointer">
              <Download size={10} /> CSV
            </button>
          </div>
          <div className="space-y-3">
            {materialList.map(([mat, s]) => (
              <div key={mat} className="flex items-center gap-3">
                <div className="font-mono text-xs w-16 text-steel flex-shrink-0">{mat}</div>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(s.grams / maxMatGrams) * 100}%`, background: MATERIAL_COLORS_MAP[mat] || "#6b7280" }} />
                </div>
                <div className="font-mono text-xs text-bone w-16 text-right flex-shrink-0">{(s.grams / 1000).toFixed(3)}kg</div>
                <div className="font-mono text-xs text-steel w-8 text-right flex-shrink-0">{s.orders.size}x</div>
                <div className="font-mono text-xs text-amber w-16 text-right flex-shrink-0">{fc(s.revenue)}</div>
              </div>
            ))}
            {materialList.length === 0 && <div className="text-bone/40 text-xs font-mono text-center py-4">No data yet</div>}
          </div>
          <div className="flex justify-end gap-4 mt-3 pt-3 border-t font-mono text-xs text-steel" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span>kg used</span><span>orders</span><span>revenue</span>
          </div>
        </div>
        <div className="rounded-xl p-5" style={glass}>
          <div className="font-mono text-xs text-amber tracking-widest mb-4">ORDER STATUS BREAKDOWN</div>
          <div className="space-y-2">
            {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS_MAP[status] || "#6b7280" }} />
                <div className="font-mono text-xs text-steel flex-1">{STATUS_LABELS[status] || status}</div>
                <div className="font-mono text-xs font-bold" style={{ color: STATUS_COLORS_MAP[status] || "#6b7280" }}>{count}</div>
                <div className="font-mono text-xs text-steel">{((count / allActiveOrders.length) * 100).toFixed(0)}%</div>
              </div>
            ))}
            {allActiveOrders.length === 0 && <div className="text-bone/40 text-xs font-mono text-center py-4">No orders yet</div>}
          </div>
          <div className="mt-4 pt-3 border-t font-mono text-xs text-steel" style={{ borderColor: "rgba(255,255,255,0.07)" }}>{allActiveOrders.length} total orders</div>
        </div>
      </div>

      {/* Top customers */}
      <div className="rounded-xl overflow-hidden mb-6" style={glass}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="font-mono text-xs text-amber tracking-widest">TOP CUSTOMERS</div>
          <button onClick={handleExportOrders} className="flex items-center gap-1 font-mono text-xs text-steel hover:text-bone transition-colors cursor-pointer">
            <Download size={10} /> Export Orders CSV
          </button>
        </div>
        <div>
          {topCustomers.map(([name, data], i) => (
            <div key={name} className="px-5 py-3 flex items-center justify-between gap-4 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3">
                <div className="font-mono text-xs text-steel w-4">{i + 1}</div>
                <div>
                  <div className="font-medium text-sm">{name}</div>
                  <div className="font-mono text-xs text-steel">{data.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="text-right"><div className="font-mono text-xs text-steel">orders</div><div className="font-display font-bold text-sm">{data.orders}</div></div>
                <div className="text-right"><div className="font-mono text-xs text-steel">revenue</div><div className="font-display font-bold text-sm text-amber">{fc(data.revenue)}</div></div>
                <div className="text-right"><div className="font-mono text-xs text-steel">avg order</div><div className="font-display font-bold text-sm">{fc(data.revenue / data.orders)}</div></div>
              </div>
            </div>
          ))}
          {topCustomers.length === 0 && <div className="px-5 py-8 text-center text-bone/40 font-mono text-xs">No customer data yet</div>}
        </div>
      </div>

      {/* Monthly table */}
      {months.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={glass}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="font-mono text-xs text-amber tracking-widest">MONTHLY BREAKDOWN</div>
            <button onClick={handleExportMonthly} className="flex items-center gap-1 font-mono text-xs text-steel hover:text-bone transition-colors cursor-pointer">
              <Download size={10} /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  {["MONTH", "ORDERS", "PARTS", "REVENUE", "MAT COST", "ELEC", "SQ FEES", "TAX", "SHIPPING", "GROSS PROFIT", "GROSS %", "NET PROFIT", "NET %", "FILAMENT", "HRS"].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-mono text-xs text-steel whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map(m => {
                  const d = monthlyData[m];
                  const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
                  const grossProfit = d.revenue - d.materialCost - elec - d.squareFees;
                  const grossMargin = d.revenue > 0 ? (grossProfit / d.revenue) * 100 : 0;
                  const realRev = d.revenue - d.squareFees;
                  const netP = realRev * PROFIT_FIRST.profit;
                  const netM = realRev > 0 ? (netP / realRev) * 100 : 0;
                  const kg = Object.values(d.grams).reduce((s, g) => s + g, 0) / 1000;
                  return (
                    <tr key={m} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="px-3 py-2 font-mono text-xs text-bone whitespace-nowrap">{fMonth(m)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-steel">{d.orderCount}</td>
                      <td className="px-3 py-2 font-mono text-xs text-steel">{d.itemCount}</td>
                      <td className="px-3 py-2 font-mono text-xs text-amber">{fc(d.revenue)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-red-400">{fc(d.materialCost)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-yellow-400">{fc(elec)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-orange-400">{fc(d.squareFees)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-purple-400">{fc(d.tax)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-blue-400">{fc(d.shipping)}</td>
                      <td className={`px-3 py-2 font-mono text-xs font-bold ${grossProfit > 0 ? "text-green-400" : "text-red-400"}`}>{fc(grossProfit)}</td>
                      <td className={`px-3 py-2 font-mono text-xs ${grossMargin > 40 ? "text-green-400" : grossMargin > 20 ? "text-amber" : "text-red-400"}`}>{grossMargin.toFixed(0)}%</td>
                      <td className="px-3 py-2 font-mono text-xs font-bold text-emerald-400">{fc(netP)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-emerald-400/70">{netM.toFixed(0)}%</td>
                      <td className="px-3 py-2 font-mono text-xs text-steel">{kg.toFixed(3)}kg</td>
                      <td className="px-3 py-2 font-mono text-xs text-steel">{d.printHours.toFixed(1)}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
