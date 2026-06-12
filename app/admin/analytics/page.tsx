"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TrendingUp, Package, Zap, DollarSign, Weight, Users, BarChart2, Download, Calendar, TrendingDown, Target, Upload, Landmark, Mail } from "lucide-react";
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

// Dual bar: grey = budget, green/red = actual (under/over)
function DualBarChart({ data }: { data: { month: string; actual: number; budget: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.actual, d.budget]), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map(d => {
        const under = d.actual <= d.budget;
        const actualH = Math.max((d.actual / max) * 100, 2);
        const budgetH = Math.max((d.budget / max) * 100, 2);
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex items-end gap-0.5" style={{ height: 112 }}>
              <div className="flex-1 rounded-t-sm" style={{ height: `${budgetH}%`, background: "rgba(255,255,255,0.15)" }} />
              <div className="flex-1 rounded-t-sm relative group transition-all"
                style={{ height: `${actualH}%`, background: under ? "#22c55e" : "#ef4444" }}>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 rounded-lg px-1.5 py-0.5 font-mono text-[9px] text-bone whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" style={glass}>
                  {fc(d.actual)} / {fc(d.budget)}
                </div>
              </div>
            </div>
            <div className="font-mono text-[9px] text-steel truncate w-full text-center">{fMonth(d.month)}</div>
          </div>
        );
      })}
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
  const [pfPcts, setPfPcts] = useState({ profit: 15, ownerComp: 25, taxes: 30, opex: 30 });
  const [spools, setSpools] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutSyncing, setPayoutSyncing] = useState(false);
  const [novoTxns, setNovoTxns] = useState<any[]>([]);
  const [novoImporting, setNovoImporting] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  const [reportMsg, setReportMsg] = useState("");
  const [novoImportMsg, setNovoImportMsg] = useState("");
  const [printerCount, setPrinterCount] = useState(() => {
    if (typeof window !== "undefined") return parseInt(localStorage.getItem("printer_count") || "1");
    return 1;
  });
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
    fetch("/api/admin/inventory/boxes", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setBoxes(data))
      .catch(() => {});
    fetch("/api/admin/govee").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.watts !== undefined) setGoveeWatts(data.watts);
      if (data?.on !== undefined) setGoveeOn(data.on);
    }).catch(() => {});
    const saved = localStorage.getItem("novo_balances");
    if (saved) setNovoBalances(JSON.parse(saved));
    const savedPf = localStorage.getItem("pf_pcts");
    if (savedPf) setPfPcts(JSON.parse(savedPf));
    // Load cached payouts + novo txns
    fetch("/api/admin/square/payouts", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(data => setPayouts(Array.isArray(data) ? data : [])).catch(() => {});
    fetch("/api/admin/novo/transactions", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(data => setNovoTxns(Array.isArray(data) ? data : [])).catch(() => {});
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function saveNovoBalances(balances: typeof novoBalances) {
    setNovoBalances(balances);
    localStorage.setItem("novo_balances", JSON.stringify(balances));
  }

  function savePfPcts(pcts: typeof pfPcts) {
    setPfPcts(pcts);
    localStorage.setItem("pf_pcts", JSON.stringify(pcts));
  }

  // Live Profit First ratios (reactive — updated whenever pfPcts changes)
  const PF = {
    profit:   pfPcts.profit   / 100,
    ownerComp: pfPcts.ownerComp / 100,
    taxes:    pfPcts.taxes    / 100,
    opex:     pfPcts.opex     / 100,
  };
  const pfPctSum = pfPcts.profit + pfPcts.ownerComp + pfPcts.taxes + pfPcts.opex;

  const filteredOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const d = o.created_at.slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  const completedOrders = filteredOrders.filter(o => !["pending", "cancelled"].includes(o.status));
  const allActiveOrders = filteredOrders.filter(o => o.status !== "pending");

  // id → cost_each lookup for boxes
  const boxCostMap: Record<string, number> = {};
  for (const b of boxes) boxCostMap[b.id] = Number(b.cost_each) || 0;

  const monthlyData: Record<string, {
    revenue: number; filamentCost: number; boxCost: number; tax: number; printHours: number;
    grams: Record<string, number>; orderCount: number; shipping: number;
    itemCount: number; squareFees: number;
  }> = {};

  for (const order of completedOrders) {
    const month = order.created_at?.slice(0, 7);
    if (!month) continue;
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, filamentCost: 0, boxCost: 0, tax: 0, printHours: 0, grams: {}, orderCount: 0, shipping: 0, itemCount: 0, squareFees: 0 };
    const subtotal = order.subtotal || 0;
    const shipping = Number(order.shipping_cost || 0);
    const tax = Math.round(subtotal * 0.06 * 100) / 100;
    const collected = order.total || (subtotal + tax + shipping);
    const squareFee = order.square_fee != null
      ? Number(order.square_fee)
      : Math.round((collected * SQUARE_PCT + SQUARE_FIXED) * 100) / 100;
    const orderBoxCost = order.box_id ? (boxCostMap[order.box_id] || 0) : 0;
    monthlyData[month].revenue += collected;
    monthlyData[month].tax += tax;
    monthlyData[month].shipping += shipping;
    monthlyData[month].squareFees += squareFee;
    monthlyData[month].boxCost += orderBoxCost;
    monthlyData[month].orderCount += 1;
    for (const item of (order.order_items || [])) {
      const qty = item.qty || 1;
      const grams = (item.grams || 0) * qty;
      const hours = (item.print_hours || item.hours || 0) * qty;
      const mat = item.material || "PLA";
      monthlyData[month].filamentCost += (grams / 1000) * (COST_PER_KG[mat] || 16);
      monthlyData[month].printHours += hours;
      monthlyData[month].grams[mat] = (monthlyData[month].grams[mat] || 0) + grams;
      monthlyData[month].itemCount += qty;
    }
  }

  const allMonths = Object.keys(monthlyData).sort();
  const months = allMonths.slice(-6);
  const mRev = months.map(m => ({ month: m, value: monthlyData[m].revenue }));
  const mProfit = months.map(m => {
    const d = monthlyData[m];
    const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
    return { month: m, value: d.revenue - d.filamentCost - d.boxCost - elec - d.squareFees };
  });
  const mNetProfit = months.map(m => {
    const d = monthlyData[m];
    const realRev = d.revenue - d.squareFees;
    return { month: m, value: realRev * PF.profit };
  });
  const mFilamentCost = months.map(m => ({ month: m, value: monthlyData[m].filamentCost }));
  const mBoxCost = months.map(m => ({ month: m, value: monthlyData[m].boxCost }));
  const mProductionCosts = months.map(m => {
    const d = monthlyData[m];
    const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
    return {
      month: m,
      actual: d.filamentCost + d.boxCost + d.squareFees + elec,
      budget: (d.revenue - d.squareFees) * PF.opex,
    };
  });
  const mOrders = months.map(m => ({ month: m, value: monthlyData[m].orderCount }));
  const mHours = months.map(m => ({ month: m, value: monthlyData[m].printHours }));
  const mItems = months.map(m => ({ month: m, value: monthlyData[m].itemCount }));
  const mMargin = months.map(m => {
    const d = monthlyData[m];
    const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
    const profit = d.revenue - d.filamentCost - d.boxCost - elec - d.squareFees;
    return { month: m, value: d.revenue > 0 ? (profit / d.revenue) * 100 : 0 };
  });

  const totalRevenue = completedOrders.reduce((s, o) => {
    const sub = o.subtotal || 0;
    const tax = Math.round(sub * 0.06 * 100) / 100;
    const ship = Number(o.shipping_cost || 0);
    return s + (o.total || (sub + tax + ship));
  }, 0);
  const totalRefunds = completedOrders.reduce((s, o) => s + Number(o.refunded_amount || 0), 0);
  const totalShipping = completedOrders.reduce((s, o) => s + Number(o.shipping_cost || 0), 0);
  const totalSquareFees = completedOrders.reduce((s, o) => {
    const collected = o.total || 0;
    return s + (o.square_fee != null
      ? Number(o.square_fee)
      : Math.round((collected * SQUARE_PCT + SQUARE_FIXED) * 100) / 100);
  }, 0);
  const totalFilamentCost = completedOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((si: number, i: any) => si + ((i.grams || 0) * (i.qty || 1) / 1000) * (COST_PER_KG[i.material] || 16), 0), 0);
  const totalBoxCost = completedOrders.reduce((s, o) =>
    s + (o.box_id ? (boxCostMap[o.box_id] || 0) : 0), 0);
  const totalMatCost = totalFilamentCost + totalBoxCost;
  const totalHours = completedOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((si: number, i: any) => si + (i.print_hours || i.hours || 0) * (i.qty || 1), 0), 0);
  const totalElecCost = (totalHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
  const totalProfit = totalRevenue - totalMatCost - totalElecCost - totalSquareFees;
  const totalTax = completedOrders.reduce((s, o) => s + Math.round((o.subtotal || 0) * 0.06 * 100) / 100, 0);
  const totalItems = completedOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((si: number, i: any) => si + (i.qty || 1), 0), 0);
  const avgOrderValue = totalRevenue / (completedOrders.length || 1);
  const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Profit First — use actual Square payout total when available, else estimate
  const totalPaidOut = totalRevenue - totalSquareFees - totalRefunds;
  const totalPayoutsAmount = payouts.filter(p => p.status === "PAID" || p.status === "SENT").reduce((s, p) => s + Number(p.amount || 0), 0);
  const realRevenue = totalPayoutsAmount > 0 ? totalPayoutsAmount : totalPaidOut;
  const pfProfit = realRevenue * PF.profit;
  const pfOwnerComp = realRevenue * PF.ownerComp;
  const pfTaxes = realRevenue * PF.taxes;
  const pfOpex = realRevenue * PF.opex;

  // Net profit
  const netProfit = pfProfit;
  const netMarginPct = realRevenue > 0 ? (netProfit / realRevenue) * 100 : 0;

  // Inventory value
  const inventoryValue = spools.reduce((sum, s) =>
    sum + (Number(s.weight_remaining_g) / 1000) * (Number(s.cost_per_kg) || COST_PER_KG[s.material] || 16), 0);

  // "Actual spent" = auto-calculated production costs (COGS + Square + Electricity)
  // The Novo opex balance manual entry stays in PF Reserves for account-level check
  const totalProductionCost = totalMatCost + totalSquareFees + totalElecCost;
  const actualOpex = totalProductionCost;
  const novoOpex = parseFloat(novoBalances.opex) || 0;
  const opexVariance = pfOpex - actualOpex;
  const opexUsedPct = pfOpex > 0 ? Math.min((actualOpex / pfOpex) * 100, 100) : 0;
  // Lean score: how much of real revenue is NOT consumed by production costs
  // Independent of PF allocation so raising profit % / lowering opex % doesn't penalize it
  const opexEfficiencyScore = realRevenue > 0 ? Math.max(0, Math.round((1 - actualOpex / realRevenue) * 100)) : 0;
  // If under: how much slack can shift to profit
  const suggestedProfitPct = realRevenue > 0
    ? Math.round((PF.profit + opexVariance / realRevenue) * 100)
    : pfPcts.profit;
  // If over: minimum opex % needed to cover actual production costs
  const suggestedOpexPct = realRevenue > 0
    ? Math.ceil((actualOpex / realRevenue) * 100)
    : pfPcts.opex;

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
      const profit = d.revenue - d.filamentCost - d.boxCost - elec - d.squareFees;
      const realRev = d.revenue - d.squareFees;
      const netP = realRev * PF.profit;
      return {
        Month: fMonth(m), Orders: d.orderCount, Parts: d.itemCount,
        Revenue: d.revenue.toFixed(2), "Filament Cost": d.filamentCost.toFixed(2),
        "Packaging Cost": d.boxCost.toFixed(2),
        "Electricity": elec.toFixed(2), "Square Fees": d.squareFees.toFixed(2),
        "Tax Collected": d.tax.toFixed(2), Shipping: d.shipping.toFixed(2),
        "Gross Profit": profit.toFixed(2),
        "Gross Margin %": d.revenue > 0 ? ((profit / d.revenue) * 100).toFixed(0) : "0",
        [`Net Profit (PF ${pfPcts.profit}%)`]: netP.toFixed(2),
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

  function savePrinterCount(n: number) {
    setPrinterCount(n);
    if (typeof window !== "undefined") localStorage.setItem("printer_count", String(n));
  }

  // ── PRICING INTELLIGENCE ─────────────────────────────────────────────────
  const matIntel: Record<string, { grams: number; revenue: number; hours: number; orders: Set<string> }> = {};
  for (const order of completedOrders) {
    for (const item of (order.order_items || [])) {
      const mat = item.material || "PLA";
      if (!matIntel[mat]) matIntel[mat] = { grams: 0, revenue: 0, hours: 0, orders: new Set() };
      const qty = item.qty || 1;
      matIntel[mat].grams += (item.grams || 0) * qty;
      matIntel[mat].revenue += (item.price || 0) * qty;
      matIntel[mat].hours += (item.print_hours || item.hours || 0) * qty;
      matIntel[mat].orders.add(order.id);
    }
  }
  const matIntelList = Object.entries(matIntel).map(([mat, s]) => {
    const costPerKg = COST_PER_KG[mat] || 16;
    const pricePerGram = s.grams > 0 ? s.revenue / s.grams : 0;
    const costPerGram = costPerKg / 1000;
    const marginPerGram = pricePerGram - costPerGram;
    const revenuePerHour = s.hours > 0 ? s.revenue / s.hours : 0;
    const revenuePerKg = s.grams > 0 ? s.revenue / (s.grams / 1000) : 0;
    const marginPct = pricePerGram > 0 ? (marginPerGram / pricePerGram) * 100 : 0;
    return { mat, ...s, costPerKg, pricePerGram, costPerGram, marginPerGram, revenuePerHour, revenuePerKg, marginPct };
  }).sort((a, b) => b.marginPct - a.marginPct);

  // Break-even per order (solve: revenue × (1 - sqPct) - sqFixed - filament - elec = 0)
  const avgFilamentGramsPerOrder = completedOrders.length > 0
    ? completedOrders.reduce((s, o) => s + (o.order_items || []).reduce((si: number, i: any) => si + (i.grams || 0) * (i.qty || 1), 0), 0) / completedOrders.length
    : 0;
  const avgHoursPerOrder = completedOrders.length > 0 ? totalHours / completedOrders.length : 0;
  const avgFilamentCostPerOrder = (avgFilamentGramsPerOrder / 1000) * 16;
  const avgElecPerOrder = (avgHoursPerOrder * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
  const breakEvenPrice = (SQUARE_FIXED + avgFilamentCostPerOrder + avgElecPerOrder) / (1 - SQUARE_PCT);

  // ── JOB PROFITABILITY ─────────────────────────────────────────────────────
  const jobMargins = completedOrders.map(order => {
    const filCost = (order.order_items || []).reduce((s: number, i: any) =>
      s + ((i.grams || 0) * (i.qty || 1) / 1000) * (COST_PER_KG[i.material] || 16), 0);
    const hrs = (order.order_items || []).reduce((s: number, i: any) =>
      s + (i.print_hours || i.hours || 0) * (i.qty || 1), 0);
    const elec = (hrs * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
    const sqFee = order.square_fee != null ? Number(order.square_fee)
      : Math.round(((order.total || 0) * SQUARE_PCT + SQUARE_FIXED) * 100) / 100;
    const boxC = order.box_id ? (boxCostMap[order.box_id] || 0) : 0;
    const rev = order.total || 0;
    const cost = filCost + elec + sqFee + boxC;
    const margin = rev - cost;
    const mPct = rev > 0 ? (margin / rev) * 100 : 0;
    return { id: order.id, name: order.customer_name, date: order.created_at?.slice(0, 10),
      rev, filCost, elec, sqFee, boxC, cost, margin, mPct, hrs };
  }).sort((a, b) => b.mPct - a.mPct);
  const topJobs = jobMargins.slice(0, 5);
  const bottomJobs = [...jobMargins].sort((a, b) => a.mPct - b.mPct).slice(0, 5);

  // ── CAPACITY & EFFICIENCY ─────────────────────────────────────────────────
  const PRACTICAL_HOURS_PER_DAY = 20; // per printer

  // Queue: orders not yet shipped/delivered
  const queueOrders = filteredOrders.filter(o =>
    ["received", "queued", "printing", "quality_check"].includes(o.status)
  );
  const queuedHours = queueOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((hs: number, i: any) => hs + (i.print_hours || i.hours || 0) * (i.qty || 1), 0), 0
  );
  const queueOrderCount = queueOrders.length;

  const monthlyCapacity = allMonths.map(m => {
    const d = monthlyData[m];
    const daysInMonth = new Date(parseInt(m.split("-")[0]), parseInt(m.split("-")[1]), 0).getDate();
    const available = printerCount * PRACTICAL_HOURS_PER_DAY * daysInMonth;
    const used = d.printHours;
    const utilPct = available > 0 ? Math.min((used / available) * 100, 100) : 0;
    const revenuePerHour = used > 0 ? d.revenue / used : 0;
    return { month: m, available, used, utilPct, revenuePerHour };
  });
  const avgUtilPct = monthlyCapacity.length > 0
    ? monthlyCapacity.reduce((s, m) => s + m.utilPct, 0) / monthlyCapacity.length : 0;
  const avgRevPerHour = monthlyCapacity.filter(m => m.used > 0).length > 0
    ? monthlyCapacity.reduce((s, m) => s + m.revenuePerHour, 0) / monthlyCapacity.filter(m => m.used > 0).length : 0;

  // Shipping P&L (collected vs flat $8 estimate — no actual cost stored)
  const SHIPPING_COST_EST = 8.00;
  const totalShippingPnl = totalShipping - (completedOrders.filter(o => Number(o.shipping_cost || 0) > 0).length * SHIPPING_COST_EST);

  // ── CUSTOMER INTELLIGENCE ─────────────────────────────────────────────────
  const custMap: Record<string, { orders: any[]; revenue: number; firstDate: string; lastDate: string }> = {};
  for (const order of completedOrders) {
    const key = order.customer_email || order.customer_name;
    if (!custMap[key]) custMap[key] = { orders: [], revenue: 0, firstDate: order.created_at, lastDate: order.created_at };
    custMap[key].orders.push(order);
    custMap[key].revenue += order.total || 0;
    if (order.created_at < custMap[key].firstDate) custMap[key].firstDate = order.created_at;
    if (order.created_at > custMap[key].lastDate) custMap[key].lastDate = order.created_at;
  }
  const custList = Object.entries(custMap).map(([email, d]) => {
    const daysBetween = d.orders.length > 1
      ? (new Date(d.lastDate).getTime() - new Date(d.firstDate).getTime()) / (d.orders.length - 1) / 86400000
      : null;
    return { email, name: d.orders[0]?.customer_name, orderCount: d.orders.length,
      revenue: d.revenue, avgOrder: d.revenue / d.orders.length, daysBetween };
  });
  const repeatCusts = custList.filter(c => c.orderCount > 1);
  const oneTimeCusts = custList.filter(c => c.orderCount === 1);
  const repeatRevenue = repeatCusts.reduce((s, c) => s + c.revenue, 0);
  const repeatRate = custList.length > 0 ? (repeatCusts.length / custList.length) * 100 : 0;
  const avgLtv = custList.length > 0 ? totalRevenue / custList.length : 0;
  const topCustsByLtv = [...custList].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  async function sendReport(type: "weekly" | "monthly") {
    const token = localStorage.getItem("dragline_admin_token");
    if (!token) return;
    setReportSending(true);
    setReportMsg("");
    try {
      const r = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await r.json();
      setReportMsg(data.ok ? `✓ ${type} report sent` : `✗ ${data.error || "Failed"}`);
    } catch (e: any) {
      setReportMsg(`✗ ${e.message}`);
    } finally {
      setReportSending(false);
      setTimeout(() => setReportMsg(""), 4000);
    }
  }

  async function syncPayouts() {
    const token = localStorage.getItem("dragline_admin_token");
    if (!token) return;
    setPayoutSyncing(true);
    try {
      const r = await fetch("/api/admin/square/payouts", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (data.payouts) setPayouts(data.payouts);
    } finally { setPayoutSyncing(false); }
  }

  async function importNovoCsv(file: File) {
    const token = localStorage.getItem("dragline_admin_token");
    if (!token) return;
    setNovoImporting(true);
    setNovoImportMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/admin/novo/import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await r.json();
      if (data.imported) {
        setNovoImportMsg(`✓ Imported ${data.imported} transactions`);
        // Reload novo txns
        const r2 = await fetch("/api/admin/novo/transactions", { headers: { Authorization: `Bearer ${token}` } });
        if (r2.ok) setNovoTxns(await r2.json());
      } else {
        setNovoImportMsg(`✗ ${data.error || "Import failed"}`);
      }
    } catch (e: any) {
      setNovoImportMsg(`✗ ${e.message}`);
    } finally { setNovoImporting(false); }
  }

  // Payout stats
  const paidPayouts = payouts.filter(p => p.status === "PAID" || p.status === "SENT");
  const lastPayout = paidPayouts[0];
  const pendingPayouts = payouts.filter(p => p.status !== "PAID" && p.status !== "SENT" && p.status !== "FAILED");
  const pendingAmount = pendingPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);

  // Novo balance: use the stored balance from the most recent transaction if available,
  // otherwise fall back to summing all transaction amounts
  const latestBalance = novoTxns.length > 0 && novoTxns[0].balance != null
    ? Number(novoTxns[0].balance)
    : null;
  const novoRunningBalance = latestBalance ?? novoTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
  const novoReserveTotal = (parseFloat(novoBalances.profit) || 0) + (parseFloat(novoBalances.ownerComp) || 0) + (parseFloat(novoBalances.taxes) || 0) + (parseFloat(novoBalances.opex) || 0);
  const novoAvailable = novoRunningBalance - novoReserveTotal;

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
        <div className="flex items-center gap-2">
          {reportMsg && <span className={`font-mono text-xs ${reportMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{reportMsg}</span>}
          <div className="relative group">
            <button disabled={reportSending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-bone/60 hover:text-bone transition-colors cursor-pointer disabled:opacity-40"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <Mail size={14} className={reportSending ? "animate-pulse" : ""} />
              <span className="font-mono text-xs">{reportSending ? "Sending…" : "Report"}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity"
              style={{ ...glass, minWidth: 120 }}>
              {(["weekly", "monthly"] as const).map(t => (
                <button key={t} onClick={() => sendReport(t)}
                  className="w-full px-4 py-2.5 text-left font-mono text-xs text-bone/70 hover:text-bone hover:bg-white/5 transition-colors cursor-pointer capitalize">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={fetchData} className="p-2 rounded-xl text-bone/60 hover:text-bone transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <RefreshCw size={16} />
          </button>
        </div>
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <StatCard label="COLLECTED" value={fc(totalRevenue)} sub={`${completedOrders.length} orders${totalRefunds > 0 ? ` · −${fc(totalRefunds)} refunded` : ''}`} icon={DollarSign} />
        <StatCard label="PAID OUT" value={fc(realRevenue)} sub={totalPayoutsAmount > 0 ? `actual Square payouts` : `estimated · sync Square for exact`} color="text-emerald-400" icon={DollarSign} />
        <StatCard label="FILAMENT COST" value={fc(totalFilamentCost)} sub={`${(totalFilamentCost / (totalRevenue || 1) * 100).toFixed(0)}% of revenue`} color="text-red-400" icon={Weight} />
        <StatCard label="PACKAGING" value={fc(totalBoxCost)} sub={`${(totalBoxCost / (totalRevenue || 1) * 100).toFixed(0)}% of revenue · boxes`} color="text-pink-400" icon={Package} />
        <StatCard label="SQUARE FEES" value={fc(totalSquareFees)} sub="2.9% + $0.30/order" color="text-orange-400" icon={DollarSign} />
        <StatCard label="ELECTRICITY EST." value={fc(totalElecCost)} sub={`${totalHours.toFixed(0)}h × ${AVG_PRINTER_WATTS}W`} color="text-yellow-400" icon={Zap} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="GROSS PROFIT" value={fc(totalProfit)} sub={`${marginPct.toFixed(0)}% gross margin`} color={totalProfit > 0 ? "text-green-400" : "text-red-400"} icon={TrendingUp} />
        <StatCard label={`NET PROFIT (PF ${pfPcts.profit}%)`} value={fc(netProfit)} sub={`${netMarginPct.toFixed(0)}% of real revenue`} color={netProfit > 0 ? "text-emerald-400" : "text-red-400"} icon={Target} />
        <StatCard label="SHIPPING COLLECTED" value={fc(totalShipping)} sub="from customers" color="text-blue-400" icon={Package} />
        <StatCard label="AVG ORDER VALUE" value={fc(avgOrderValue)} sub="excl. tax & shipping" icon={BarChart2} />
        <StatCard label="INVENTORY VALUE" value={fc(inventoryValue)} sub={`${spools.length} spools on hand`} color="text-cyan-400" icon={Package} />
      </div>

      {/* Square Payouts + Novo */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">CASH FLOW — SQUARE PAYOUTS & NOVO BANK</div>
      <div className="rounded-xl p-5 mb-6" style={glass}>
        <div className="grid md:grid-cols-2 gap-6">

          {/* Square Payouts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={13} className="text-steel" />
                <span className="font-mono text-xs text-steel tracking-wider">SQUARE PAYOUTS (90 DAYS)</span>
              </div>
              <button onClick={syncPayouts} disabled={payoutSyncing}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer disabled:opacity-40"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <RefreshCw size={11} className={payoutSyncing ? "animate-spin" : ""} />
                {payoutSyncing ? "Syncing…" : "Sync"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] text-steel mb-1">TOTAL PAID OUT</div>
                <div className="font-display font-bold text-lg text-emerald-400">{fc(totalPayoutsAmount)}</div>
                <div className="font-mono text-[9px] text-steel">{paidPayouts.length} payouts</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] text-steel mb-1">LAST PAYOUT</div>
                <div className="font-display font-bold text-lg text-amber">{lastPayout ? fc(Number(lastPayout.amount)) : "—"}</div>
                <div className="font-mono text-[9px] text-steel">{lastPayout?.arrival_date || "—"}</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] text-steel mb-1">PENDING</div>
                <div className="font-display font-bold text-lg text-blue-400">{fc(pendingAmount)}</div>
                <div className="font-mono text-[9px] text-steel">{pendingPayouts.length} in transit</div>
              </div>
            </div>
            {payouts.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {payouts.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="font-mono text-xs text-steel">{p.arrival_date || "—"}</div>
                    <div className={`font-mono text-xs font-bold ${p.status === "PAID" || p.status === "SENT" ? "text-emerald-400" : "text-blue-400"}`}>{fc(Number(p.amount))}</div>
                    <div className="font-mono text-[9px] text-steel/50">{p.status}</div>
                  </div>
                ))}
              </div>
            )}
            {payouts.length === 0 && (
              <div className="font-mono text-xs text-steel/40 text-center py-4">No payout data — click Sync to load from Square</div>
            )}
          </div>

          {/* Novo CSV */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Landmark size={13} className="text-steel" />
              <span className="font-mono text-xs text-steel tracking-wider">NOVO BANK BALANCE</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] text-steel mb-1">TOTAL BALANCE</div>
                <div className={`font-display font-bold text-base ${novoRunningBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fc(novoRunningBalance)}</div>
                <div className="font-mono text-[9px] text-steel/50">{novoTxns[0]?.date || "no data"}</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono text-[9px] text-steel mb-1">IN RESERVES</div>
                <div className="font-display font-bold text-base text-amber">{fc(novoReserveTotal)}</div>
                <div className="font-mono text-[9px] text-steel/50">from PF entries below</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: novoAvailable >= 0 ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)" }}>
                <div className="font-mono text-[9px] text-steel mb-1">AVAILABLE</div>
                <div className={`font-display font-bold text-base ${novoAvailable >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fc(novoAvailable)}</div>
                <div className="font-mono text-[9px] text-steel/50">total − reserves</div>
              </div>
            </div>
            {/* CSV upload */}
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
              style={{ border: "1px dashed rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.02)" }}>
              <Upload size={14} className="text-steel" />
              <span className="font-mono text-xs text-steel">{novoImporting ? "Importing…" : "Upload Novo CSV"}</span>
              <input type="file" accept=".csv" className="hidden" disabled={novoImporting}
                onChange={e => { const f = e.target.files?.[0]; if (f) importNovoCsv(f); e.target.value = ""; }} />
            </label>
            {novoImportMsg && (
              <div className={`mt-2 font-mono text-xs text-center ${novoImportMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{novoImportMsg}</div>
            )}
            <div className="font-mono text-[9px] text-steel/40 text-center mt-2">Novo → Transactions → Export CSV</div>
            {novoTxns.length > 0 && (
              <div className="space-y-1 mt-3 max-h-32 overflow-y-auto">
                {novoTxns.slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="font-mono text-xs text-steel">{t.date}</div>
                    <div className="font-mono text-[10px] text-steel/60 truncate max-w-[120px] mx-2">{t.description || t.category || "—"}</div>
                    <div className={`font-mono text-xs font-bold ${Number(t.amount) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fc(Math.abs(Number(t.amount)))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Op Expenses Tracker */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">OPERATING EXPENSES TRACKER</div>
      <div className="rounded-xl p-5 mb-6" style={glass}>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Budget vs Actual (auto-calculated from orders) */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="font-mono text-xs text-steel">PRODUCTION COSTS vs. OPEX BUDGET ({pfPcts.opex}%)</div>
                <div className="font-mono text-xs text-amber">{fc(pfOpex)} budget</div>
              </div>
              {/* Cost breakdown equation */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span className="font-mono text-xs text-red-400">{fc(totalFilamentCost)}</span>
                <span className="font-mono text-[10px] text-steel/40">filament +</span>
                <span className="font-mono text-xs text-pink-400">{fc(totalBoxCost)}</span>
                <span className="font-mono text-[10px] text-steel/40">packaging +</span>
                <span className="font-mono text-xs text-orange-400">{fc(totalSquareFees)}</span>
                <span className="font-mono text-[10px] text-steel/40">fees +</span>
                <span className="font-mono text-xs text-yellow-400">{fc(totalElecCost)}</span>
                <span className="font-mono text-[10px] text-steel/40">elec =</span>
                <span className="font-mono text-xs text-bone font-bold">{fc(totalProductionCost)}</span>
                <span className="font-mono text-[10px] text-steel/40">actual spent</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${opexUsedPct}%`, background: opexUsedPct > 100 ? "#ef4444" : opexUsedPct > 80 ? "#f59e0b" : "#22c55e" }} />
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-steel">{opexUsedPct.toFixed(0)}% of opex budget</span>
                <span className={opexVariance >= 0 ? "text-green-400" : "text-red-400"}>
                  {opexVariance >= 0
                    ? `${fc(opexVariance)} under — bump profit to ${suggestedProfitPct}%`
                    : `${fc(Math.abs(opexVariance))} OVER — reduce opex to ${suggestedOpexPct}% or raise prices`}
                </span>
              </div>
            </div>

            {/* Allocation breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "OWNER COMP", pct: pfPcts.ownerComp, val: pfOwnerComp, color: "#f59e0b" },
                { label: "TAXES", pct: pfPcts.taxes, val: pfTaxes, color: "#ef4444" },
                { label: "OP. EXPENSES", pct: pfPcts.opex, val: pfOpex, color: "#3b82f6" },
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
              opexEfficiencyScore >= 70 ? "text-green-400" :
              opexEfficiencyScore >= 40 ? "text-amber" : "text-red-400"
            }`}>
              {`${opexEfficiencyScore}%`}
            </div>
            <div className="font-mono text-[9px] text-steel text-center">
              {opexEfficiencyScore >= 70 ? "Lean & profitable" :
               opexEfficiencyScore >= 40 ? "Room to tighten" : "Trim expenses"}
            </div>
            {opexVariance > 0 && (
              <div className="mt-2 font-mono text-xs text-green-400 text-center font-bold">{fc(opexVariance)} saved</div>
            )}
            <div className="mt-3 font-mono text-[9px] text-steel text-center">
              % of real revenue<br />kept after production costs
            </div>
          </div>
        </div>
      </div>

      {/* Profit First Reserves */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">PROFIT FIRST RESERVES</div>
      <div className="rounded-xl p-5 mb-8" style={glass}>
        <div className="font-mono text-xs text-steel mb-4">Rolling totals based on real revenue (subtotal minus Square fees). Enter actual Novo balances to see if you&apos;re caught up.</div>

        {/* Editable % inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {(["profit", "ownerComp", "taxes", "opex"] as const).map(key => {
            const labels: Record<string, string> = { profit: "PROFIT %", ownerComp: "OWNER COMP %", taxes: "TAXES %", opex: "OPEX %" };
            return (
              <div key={key}>
                <label className="font-mono text-[10px] text-steel/70 block mb-1">{labels[key]}</label>
                <input
                  type="number" min="0" max="100" step="1"
                  value={pfPcts[key]}
                  onChange={e => savePfPcts({ ...pfPcts, [key]: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 rounded-lg text-bone text-xs font-mono transition-colors"
                  style={inputSt}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }} />
              </div>
            );
          })}
        </div>
        {pfPctSum !== 100 && (
          <div className="mb-4 px-3 py-2 rounded-lg font-mono text-xs text-amber" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            ⚠ Percentages sum to {pfPctSum}% — must equal 100% for accurate allocations
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: "profit", label: "PROFIT", pct: pfPcts.profit, target: pfProfit, color: "text-green-400", borderColor: "rgba(34,197,94,0.30)" },
            { key: "ownerComp", label: "OWNER COMP", pct: pfPcts.ownerComp, target: pfOwnerComp, color: "text-amber", borderColor: "rgba(255,181,71,0.30)" },
            { key: "taxes", label: "TAXES", pct: pfPcts.taxes, target: pfTaxes, color: "text-red-400", borderColor: "rgba(239,68,68,0.30)" },
            { key: "opex", label: "OP. EXPENSES", pct: pfPcts.opex, target: pfOpex, color: "text-blue-400", borderColor: "rgba(59,130,246,0.30)" },
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
                  <div className={`font-mono text-xs ${
                    key === "opex"
                      ? diff <= 0 ? "text-green-400" : "text-red-400"
                      : diff >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
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
            <div className="font-mono text-xs text-steel/50">Revenue − Square fees = {fc(realRevenue)} real revenue × {pfPcts.profit}% profit</div>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <div className="font-display font-black text-2xl text-green-400">{fc(netProfit)}</div>
            <div className="font-mono text-xs text-green-400/60">{netMarginPct.toFixed(0)}% net margin</div>
          </div>
        </div>
      </div>

      {/* Monthly trend charts */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">MONTHLY TRENDS (LAST 6 MONTHS)</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[
          { label: "REVENUE", data: mRev, color: "#f59e0b", labelStr: "$" },
          { label: "GROSS PROFIT", data: mProfit, color: "#22c55e", labelStr: "$" },
          { label: `NET PROFIT (${pfPcts.profit}%)`, data: mNetProfit, color: "#10b981", labelStr: "$" },
          { label: "FILAMENT COST", data: mFilamentCost, color: "#ef4444", labelStr: "$" },
          { label: "PACKAGING COST", data: mBoxCost, color: "#ec4899", labelStr: "$" },
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

      {/* OPEX Trend: production cost vs budget per month */}
      {months.length > 1 && (
        <div className="mb-8">
          <div className="mb-2 font-mono text-xs text-steel tracking-widest">PRODUCTION COST vs. OPEX BUDGET — MONTHLY TREND</div>
          <div className="rounded-xl p-5" style={glass}>
            <div className="font-mono text-[10px] text-steel/60 mb-4">
              Use this to calibrate your Profit First %. If actual is consistently well under budget, consider shifting some opex % to profit or owner comp.
            </div>
            <DualBarChart data={mProductionCosts} />
            <div className="flex items-center gap-5 mt-3 pt-3 border-t font-mono text-[10px] text-steel" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm bg-green-400" />
                <span>Actual (under budget)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm bg-red-400" />
                <span>Actual (over budget)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm" style={{ background: "rgba(255,255,255,0.15)" }} />
                <span>Budget ({pfPcts.opex}% of real revenue)</span>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* PRICING INTELLIGENCE */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">PRICING INTELLIGENCE</div>
      <div className="rounded-xl p-5 mb-6" style={glass}>
        <div className="grid md:grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg p-3 text-center" style={innerCell}>
            <div className="font-mono text-[9px] text-steel mb-1">BREAK-EVEN PER ORDER</div>
            <div className="font-display font-bold text-xl text-amber">{fc(breakEvenPrice)}</div>
            <div className="font-mono text-[9px] text-steel">avg filament + elec + sq fee</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={innerCell}>
            <div className="font-mono text-[9px] text-steel mb-1">AVG REV / PRINT HOUR</div>
            <div className="font-display font-bold text-xl text-emerald-400">{fc(avgRevPerHour)}</div>
            <div className="font-mono text-[9px] text-steel">across all materials</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={innerCell}>
            <div className="font-mono text-[9px] text-steel mb-1">SHIPPING P&L EST.</div>
            <div className={`font-display font-bold text-xl ${totalShippingPnl >= 0 ? "text-green-400" : "text-red-400"}`}>{totalShippingPnl >= 0 ? "+" : ""}{fc(totalShippingPnl)}</div>
            <div className="font-mono text-[9px] text-steel">collected − ~$8/shipped order</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {["MATERIAL", "$/GRAM CHARGED", "$/GRAM COST", "MARGIN/GRAM", "MARGIN %", "REV/HOUR", "REV/KG", "ORDERS"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] text-steel whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matIntelList.map(m => (
                <tr key={m.mat} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: MATERIAL_COLORS_MAP[m.mat] || "#6b7280" }} />
                      <span className="font-mono text-xs text-bone">{m.mat}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-amber">${m.pricePerGram.toFixed(3)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-red-400">${m.costPerGram.toFixed(3)}</td>
                  <td className={`px-3 py-2 font-mono text-xs font-bold ${m.marginPerGram > 0 ? "text-green-400" : "text-red-400"}`}>${m.marginPerGram.toFixed(3)}</td>
                  <td className="px-3 py-2">
                    <div className={`font-mono text-xs font-bold ${m.marginPct > 60 ? "text-green-400" : m.marginPct > 40 ? "text-amber" : "text-red-400"}`}>{m.marginPct.toFixed(0)}%</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-emerald-400">{m.hours > 0 ? fc(m.revenuePerHour) : "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-400">{fc(m.revenuePerKg)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-steel">{m.orders.size}</td>
                </tr>
              ))}
              {matIntelList.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center font-mono text-xs text-steel/40">No item data yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* JOB PROFITABILITY */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">JOB PROFITABILITY</div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5" style={glass}>
          <div className="font-mono text-xs text-green-400 tracking-widest mb-3">TOP 5 — HIGHEST MARGIN</div>
          <div className="space-y-2">
            {topJobs.map((j, i) => (
              <div key={j.id} className="rounded-lg px-3 py-2 flex items-center justify-between gap-3" style={innerCell}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-steel">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-bone truncate">{j.name}</div>
                    <div className="font-mono text-[9px] text-steel">{j.date} · {j.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right"><div className="font-mono text-[9px] text-steel">revenue</div><div className="font-mono text-xs text-amber">{fc(j.rev)}</div></div>
                  <div className="text-right"><div className="font-mono text-[9px] text-steel">margin</div><div className="font-mono text-xs font-bold text-green-400">{j.mPct.toFixed(0)}%</div></div>
                  <div className="text-right"><div className="font-mono text-[9px] text-steel">profit</div><div className="font-mono text-xs text-green-400">{fc(j.margin)}</div></div>
                </div>
              </div>
            ))}
            {topJobs.length === 0 && <div className="font-mono text-xs text-steel/40 text-center py-4">No data yet</div>}
          </div>
        </div>
        <div className="rounded-xl p-5" style={glass}>
          <div className="font-mono text-xs text-red-400 tracking-widest mb-3">BOTTOM 5 — LOWEST MARGIN</div>
          <div className="space-y-2">
            {bottomJobs.map((j, i) => (
              <div key={j.id} className="rounded-lg px-3 py-2 flex items-center justify-between gap-3" style={innerCell}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-steel">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-bone truncate">{j.name}</div>
                    <div className="font-mono text-[9px] text-steel">{j.date} · {j.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right"><div className="font-mono text-[9px] text-steel">revenue</div><div className="font-mono text-xs text-amber">{fc(j.rev)}</div></div>
                  <div className="text-right"><div className="font-mono text-[9px] text-steel">margin</div><div className={`font-mono text-xs font-bold ${j.mPct < 20 ? "text-red-400" : "text-amber"}`}>{j.mPct.toFixed(0)}%</div></div>
                  <div className="text-right"><div className="font-mono text-[9px] text-steel">profit</div><div className={`font-mono text-xs ${j.margin >= 0 ? "text-amber" : "text-red-400"}`}>{fc(j.margin)}</div></div>
                </div>
              </div>
            ))}
            {bottomJobs.length === 0 && <div className="font-mono text-xs text-steel/40 text-center py-4">No data yet</div>}
          </div>
        </div>
      </div>

      {/* CAPACITY & EFFICIENCY */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">CAPACITY & EFFICIENCY</div>
      <div className="rounded-xl p-5 mb-6" style={glass}>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs text-steel">PRINTERS</label>
            <input type="number" min="1" max="20" value={printerCount}
              onChange={e => savePrinterCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 rounded-lg text-bone text-xs font-mono text-center"
              style={inputSt}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }} />
          </div>
          <div className="font-mono text-[10px] text-steel/50">{printerCount} printer{printerCount > 1 ? "s" : ""} × {PRACTICAL_HOURS_PER_DAY}h/day practical capacity</div>
          <div className="ml-auto flex items-center gap-6">
            <div className="text-right"><div className="font-mono text-[9px] text-steel">AVG UTILIZATION</div><div className={`font-display font-bold text-lg ${avgUtilPct > 70 ? "text-red-400" : avgUtilPct > 40 ? "text-amber" : "text-green-400"}`}>{avgUtilPct.toFixed(0)}%</div></div>
            <div className="text-right"><div className="font-mono text-[9px] text-steel">AVG REV/HOUR</div><div className="font-display font-bold text-lg text-emerald-400">{fc(avgRevPerHour)}</div></div>
          </div>
        </div>
        {/* ── Chart: donut + horizontal bars ── */}
        {monthlyCapacity.length === 0 ? (
          <div className="text-center font-mono text-xs text-steel/40 py-8">No data yet</div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Donut summary row */}
            <div className="flex items-center gap-6 flex-wrap">
              {(() => {
                const r = 38;
                const circ = 2 * Math.PI * r;
                const fill = (avgUtilPct / 100) * circ;
                const color = avgUtilPct > 70 ? "#ef4444" : avgUtilPct > 40 ? "#f59e0b" : "#22c55e";
                return (
                  <div className="flex items-center gap-4">
                    <div className="relative" style={{ width: 96, height: 96 }}>
                      <svg width="96" height="96" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="10"
                          strokeDasharray={`${fill} ${circ}`}
                          strokeDashoffset={circ / 4}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display font-black text-xl leading-none" style={{ color }}>{avgUtilPct.toFixed(0)}%</span>
                        <span className="font-mono text-[8px] text-steel mt-0.5">UTIL</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="font-mono text-[9px] text-steel mb-0.5">AVG CAPACITY USED</div>
                      {[["#22c55e", "< 40% — growth room"], ["#f59e0b", "40–70% — healthy load"], ["#ef4444", "70%+ — near capacity"]].map(([c, label]) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: c }} />
                          <span className="font-mono text-[10px] text-steel">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="ml-auto text-right">
                <div className="font-mono text-[9px] text-steel mb-0.5">AVG REV / HOUR</div>
                <div className="font-display font-black text-3xl text-emerald-400">{fc(avgRevPerHour)}</div>
                <div className="font-mono text-[9px] text-steel mt-0.5">{monthlyCapacity.reduce((s, m) => s + m.used, 0).toFixed(0)}h total printed</div>
              </div>
            </div>

            {/* Horizontal bar chart */}
            {(() => {
              const currentMonth = new Date().toISOString().slice(0, 7);
              const currentMonthCap = monthlyCapacity.find(m => m.month === currentMonth);
              const queuePct = currentMonthCap ? Math.min((queuedHours / currentMonthCap.available) * 100, 100) : 0;
              const combinedPct = currentMonthCap ? Math.min(((currentMonthCap.used + queuedHours) / currentMonthCap.available) * 100, 100) : 0;
              const overCapacity = currentMonthCap && (currentMonthCap.used + queuedHours) > currentMonthCap.available;
              const nearCapacity = combinedPct > 75;
              return (
                <div className="flex flex-col gap-2">
                  <div className="grid gap-1" style={{ gridTemplateColumns: "72px 1fr 52px 60px" }}>
                    {["MONTH", "", "UTIL", "REV/HR"].map(h => (
                      <div key={h} className="font-mono text-[9px] text-steel/50 pb-1">{h}</div>
                    ))}
                  </div>
                  {monthlyCapacity.map(m => {
                    const isCurrentMonth = m.month === currentMonth;
                    const barColor = m.utilPct > 70 ? "#ef4444" : m.utilPct > 40 ? "#f59e0b" : "#22c55e";
                    const queueBarPct = isCurrentMonth ? Math.min((queuedHours / m.available) * 100, 100 - m.utilPct) : 0;
                    return (
                      <div key={m.month} className="grid items-center gap-1" style={{ gridTemplateColumns: "72px 1fr 52px 60px" }}>
                        <span className="font-mono text-[10px] text-bone truncate">{fMonth(m.month)}{isCurrentMonth ? " ·" : ""}</span>
                        <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          {/* Completed hours bar */}
                          <div className="absolute inset-y-0 left-0 flex items-center pl-2"
                            style={{ width: `${Math.max(m.utilPct, isCurrentMonth && queuedHours > 0 ? 2 : 2)}%`, background: `linear-gradient(90deg, ${barColor}88, ${barColor})`, borderRadius: queueBarPct > 0 ? "8px 0 0 8px" : "8px" }}>
                            {m.utilPct > 15 && <span className="font-mono text-[9px] text-white/80 font-bold">{m.used.toFixed(0)}h</span>}
                          </div>
                          {/* Queue overlay for current month */}
                          {isCurrentMonth && queueBarPct > 0 && (
                            <div className="absolute inset-y-0 flex items-center justify-center"
                              style={{ left: `${m.utilPct}%`, width: `${queueBarPct}%`, background: "rgba(251,191,36,0.35)", borderRight: "2px dashed rgba(251,191,36,0.7)", borderRadius: "0 8px 8px 0" }}>
                              {queueBarPct > 8 && <span className="font-mono text-[8px] text-amber font-bold">{queuedHours.toFixed(0)}h</span>}
                            </div>
                          )}
                          {[25, 50, 75].map(p => (
                            <div key={p} className="absolute inset-y-0 w-px" style={{ left: `${p}%`, background: "rgba(255,255,255,0.06)" }} />
                          ))}
                        </div>
                        <span className="font-mono text-[10px] text-right pr-1" style={{ color: isCurrentMonth && nearCapacity ? "#fbbf24" : barColor }}>
                          {isCurrentMonth && queuedHours > 0 ? `${combinedPct.toFixed(0)}%` : `${m.utilPct.toFixed(0)}%`}
                        </span>
                        <span className="font-mono text-[10px] text-right text-emerald-400/80">{m.used > 0 ? fc(m.revenuePerHour) : "—"}</span>
                      </div>
                    );
                  })}
                  <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: "72px 1fr 52px 60px" }}>
                    <div /><div className="flex justify-between px-0.5">
                      {["0%", "25%", "50%", "75%", "100%"].map(l => (
                        <span key={l} className="font-mono text-[8px] text-steel/30">{l}</span>
                      ))}
                    </div><div /><div />
                  </div>

                  {/* Queue summary */}
                  {queuedHours > 0 && (
                    <div className="mt-2 rounded-lg p-3 flex items-start gap-3" style={{ background: overCapacity ? "rgba(239,68,68,0.08)" : nearCapacity ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${overCapacity ? "rgba(239,68,68,0.25)" : nearCapacity ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] font-bold" style={{ color: overCapacity ? "#ef4444" : nearCapacity ? "#fbbf24" : "#22c55e" }}>
                            {overCapacity ? "⚠ OVER CAPACITY" : nearCapacity ? "⚠ NEAR CAPACITY" : "QUEUE LOAD"}
                          </span>
                          <span className="font-mono text-[10px] text-steel">{queueOrderCount} order{queueOrderCount !== 1 ? "s" : ""} · {queuedHours.toFixed(1)}h queued</span>
                        </div>
                        {currentMonthCap && (
                          <div className="font-mono text-[10px] text-steel/70">
                            {currentMonthCap.used.toFixed(0)}h completed + {queuedHours.toFixed(0)}h queued = {(currentMonthCap.used + queuedHours).toFixed(0)}h of {currentMonthCap.available.toFixed(0)}h available this month
                            {overCapacity && <span className="text-red-400 ml-1">· {((currentMonthCap.used + queuedHours) - currentMonthCap.available).toFixed(0)}h overflow → consider adding a printer</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: "#22c55e" }} />
                      <span className="font-mono text-[9px] text-steel/60">Completed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(251,191,36,0.4)", border: "1px dashed rgba(251,191,36,0.7)" }} />
                      <span className="font-mono text-[9px] text-steel/60">Queued (this month)</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* CUSTOMER INTELLIGENCE */}
      <div className="mb-2 font-mono text-xs text-steel tracking-widest">CUSTOMER INTELLIGENCE</div>
      <div className="rounded-xl p-5 mb-6" style={glass}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-lg p-3 text-center" style={innerCell}>
            <div className="font-mono text-[9px] text-steel mb-1">REPEAT RATE</div>
            <div className={`font-display font-bold text-2xl ${repeatRate > 30 ? "text-green-400" : repeatRate > 10 ? "text-amber" : "text-red-400"}`}>{repeatRate.toFixed(0)}%</div>
            <div className="font-mono text-[9px] text-steel">{repeatCusts.length} of {custList.length} customers</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={innerCell}>
            <div className="font-mono text-[9px] text-steel mb-1">REPEAT REVENUE</div>
            <div className="font-display font-bold text-2xl text-emerald-400">{fc(repeatRevenue)}</div>
            <div className="font-mono text-[9px] text-steel">{totalRevenue > 0 ? ((repeatRevenue / totalRevenue) * 100).toFixed(0) : 0}% of total</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={innerCell}>
            <div className="font-mono text-[9px] text-steel mb-1">AVG CUSTOMER LTV</div>
            <div className="font-display font-bold text-2xl text-amber">{fc(avgLtv)}</div>
            <div className="font-mono text-[9px] text-steel">lifetime revenue/customer</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={innerCell}>
            <div className="font-mono text-[9px] text-steel mb-1">ONE-TIME CUSTOMERS</div>
            <div className="font-display font-bold text-2xl text-blue-400">{oneTimeCusts.length}</div>
            <div className="font-mono text-[9px] text-steel">potential repeat revenue</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {["CUSTOMER", "ORDERS", "TOTAL LTV", "AVG ORDER", "AVG DAYS BETWEEN", "TYPE"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] text-steel whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCustsByLtv.map((c, i) => (
                <tr key={c.email} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs text-bone">{c.name}</div>
                    <div className="font-mono text-[9px] text-steel">{c.email}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-steel">{c.orderCount}</td>
                  <td className="px-3 py-2 font-mono text-xs font-bold text-amber">{fc(c.revenue)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-steel">{fc(c.avgOrder)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-steel">{c.daysBetween !== null ? `${c.daysBetween.toFixed(0)}d` : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full ${c.orderCount > 1 ? "text-green-400 bg-green-400/10" : "text-steel bg-white/5"}`}>
                      {c.orderCount > 1 ? "repeat" : "one-time"}
                    </span>
                  </td>
                </tr>
              ))}
              {topCustsByLtv.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center font-mono text-xs text-steel/40">No customer data yet</td></tr>}
            </tbody>
          </table>
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
                  {["MONTH", "ORDERS", "PARTS", "COLLECTED", "FILAMENT", "PACKAGING", "ELEC", "SQ FEES", "TAX", "SHIPPING", "GROSS PROFIT", "GROSS %", "NET PROFIT", "NET %", "KG", "HRS"].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-mono text-xs text-steel whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map(m => {
                  const d = monthlyData[m];
                  const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
                  const grossProfit = d.revenue - d.filamentCost - d.boxCost - elec - d.squareFees;
                  const grossMargin = d.revenue > 0 ? (grossProfit / d.revenue) * 100 : 0;
                  const realRev = d.revenue - d.squareFees;
                  const netP = realRev * PF.profit;
                  const netM = realRev > 0 ? (netP / realRev) * 100 : 0;
                  const kg = Object.values(d.grams).reduce((s, g) => s + g, 0) / 1000;
                  return (
                    <tr key={m} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="px-3 py-2 font-mono text-xs text-bone whitespace-nowrap">{fMonth(m)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-steel">{d.orderCount}</td>
                      <td className="px-3 py-2 font-mono text-xs text-steel">{d.itemCount}</td>
                      <td className="px-3 py-2 font-mono text-xs text-amber">{fc(d.revenue)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-red-400">{fc(d.filamentCost)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-pink-400">{fc(d.boxCost)}</td>
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
