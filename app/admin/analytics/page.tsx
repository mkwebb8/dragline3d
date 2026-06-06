"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TrendingUp, Package, Zap, DollarSign, Weight } from "lucide-react";

const ELECTRICITY_RATE = 0.12; // $/kWh
const AVG_PRINTER_WATTS = 300; // watts

const MATERIAL_COLORS: Record<string, string> = {
  PLA: "#3b82f6", PETG: "#10b981", TPU: "#f59e0b", ABS: "#ef4444",
  ASA: "#8b5cf6", "PET-GF15": "#06b6d4", "PETG-ESD": "#f97316",
  PA: "#84cc16", "ASA-CF": "#ec4899", "PETG-CF": "#14b8a6", "PA-CF": "#6366f1", PCTG: "#a78bfa",
};

const COST_PER_KG: Record<string, number> = {
  PLA: 16, PETG: 18, TPU: 24, ABS: 20, ASA: 22, "PET-GF15": 30,
  "PETG-ESD": 66, PA: 35, "ASA-CF": 40, "PETG-CF": 40, "PA-CF": 80, PCTG: 29.95,
};

function formatCurrency(n: number) { return `$${n.toFixed(2)}`; }
function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function BarChart({ data, color = "#f59e0b", label }: { data: { month: string; value: number }[]; color?: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map(d => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full rounded-sm transition-all" style={{ height: `${Math.max((d.value / max) * 100, 2)}%`, background: color, opacity: d.value > 0 ? 1 : 0.2 }} title={`${formatMonth(d.month)}: ${label === "$" ? formatCurrency(d.value) : d.value.toFixed(1) + label}`} />
          <div className="font-mono text-[9px] text-steel truncate w-full text-center">{formatMonth(d.month)}</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color = "text-amber", icon: Icon }: { label: string; value: string; sub?: string; color?: string; icon: any }) {
  return (
    <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-steel" />
        <div className="font-mono text-xs text-steel tracking-wider">{label}</div>
      </div>
      <div className={`font-display font-bold text-2xl ${color}`}>{value}</div>
      {sub && <div className="font-mono text-xs text-steel mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [goveeWatts, setGoveeWatts] = useState<number | null>(null);
  const [goveeOn, setGoveeOn] = useState<boolean | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("dragline_admin_token");
    if (!token) { router.push("/admin/login"); return; }
    setLoading(true);

    // Fetch all orders
    const statuses = ["received", "queued", "printing", "quality_check", "shipped", "delivered", "cancelled"];
    const results = await Promise.all(statuses.map(s =>
      fetch(`/api/admin/orders?status=${s}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : [])
    ));
    setOrders(results.flat());

    // Fetch Govee state
    fetch("/api/admin/govee").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.watts !== undefined) setGoveeWatts(data.watts);
      if (data?.on !== undefined) setGoveeOn(data.on);
    }).catch(() => {});

    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Process data
  const completedOrders = orders.filter(o => !["pending", "cancelled"].includes(o.status));
  
  // Monthly buckets
  const monthlyData: Record<string, { revenue: number; materialCost: number; tax: number; printHours: number; grams: Record<string, number> }> = {};
  
  for (const order of completedOrders) {
    const month = order.created_at?.slice(0, 7);
    if (!month) continue;
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, materialCost: 0, tax: 0, printHours: 0, grams: {} };
    
    const subtotal = order.subtotal || 0;
    const total = order.total || 0;
    const shipping = Number(order.shipping_cost || 0);
    const tax = Math.round((subtotal * 0.06) * 100) / 100;
    
    monthlyData[month].revenue += total - tax - shipping;
    monthlyData[month].tax += tax;
    
    for (const item of (order.order_items || [])) {
      const qty = item.qty || 1;
      const grams = (item.grams || 0) * qty;
      const hours = (item.print_hours || item.hours || 0) * qty;
      const mat = item.material || "PLA";
      monthlyData[month].materialCost += (grams / 1000) * (COST_PER_KG[mat] || 16);
      monthlyData[month].printHours += hours;
      monthlyData[month].grams[mat] = (monthlyData[month].grams[mat] || 0) + grams;
    }
  }

  const months = Object.keys(monthlyData).sort().slice(-6);
  const monthlyRevenue = months.map(m => ({ month: m, value: monthlyData[m].revenue }));
  const monthlyProfit = months.map(m => {
    const d = monthlyData[m];
    const elecCost = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
    return { month: m, value: d.revenue - d.materialCost - elecCost };
  });
  const monthlyMaterialCost = months.map(m => ({ month: m, value: monthlyData[m].materialCost }));
  const monthlyElec = months.map(m => ({ month: m, value: (monthlyData[m].printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE }));

  // Totals
  const totalRevenue = completedOrders.reduce((s, o) => {
    const sub = o.subtotal || 0;
    const ship = Number(o.shipping_cost || 0);
    const tax = Math.round(sub * 0.06 * 100) / 100;
    return s + (o.total || 0) - tax - ship;
  }, 0);
  const totalMatCost = completedOrders.reduce((s, o) => {
    return s + (o.order_items || []).reduce((si: number, i: any) => {
      const qty = i.qty || 1;
      return si + ((i.grams || 0) * qty / 1000) * (COST_PER_KG[i.material] || 16);
    }, 0);
  }, 0);
  const totalHours = completedOrders.reduce((s, o) => {
    return s + (o.order_items || []).reduce((si: number, i: any) => si + (i.print_hours || i.hours || 0) * (i.qty || 1), 0);
  }, 0);
  const totalElecCost = (totalHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
  const totalProfit = totalRevenue - totalMatCost - totalElecCost;
  const totalTax = completedOrders.reduce((s, o) => s + Math.round((o.subtotal || 0) * 0.06 * 100) / 100, 0);
  const totalGrams = completedOrders.reduce((s, o) => {
    return s + (o.order_items || []).reduce((si: number, i: any) => si + (i.grams || 0) * (i.qty || 1), 0);
  }, 0);

  // Material breakdown
  const materialGrams: Record<string, number> = {};
  for (const order of completedOrders) {
    for (const item of (order.order_items || [])) {
      const mat = item.material || "PLA";
      materialGrams[mat] = (materialGrams[mat] || 0) + (item.grams || 0) * (item.qty || 1);
    }
  }
  const materialBreakdown = Object.entries(materialGrams).sort((a, b) => b[1] - a[1]);
  const maxGrams = Math.max(...materialBreakdown.map(([, g]) => g), 1);

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-16 text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <div className="font-display font-extrabold text-xl">Analytics</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D · BUSINESS OVERVIEW</div>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone transition-colors"><RefreshCw size={16} /></button>
      </div>

      {/* Govee live power */}
      {(goveeWatts !== null || goveeOn !== null) && (
        <div className={`mb-6 rounded-sm border p-4 flex items-center gap-4 ${goveeOn ? "border-orange-500/40 bg-orange-500/5" : "border-ironworks3 bg-ironworks2"}`}>
          <Zap size={16} className={goveeOn ? "text-orange-400" : "text-steel"} />
          <div className="flex items-center gap-4 font-mono text-sm">
            <span className="text-steel">PRINTER OUTLET</span>
            <span className={`font-bold ${goveeOn ? "text-orange-400" : "text-steel"}`}>{goveeOn ? "ON" : "STANDBY"}</span>
            {goveeWatts !== null && goveeWatts > 0 && <span className="text-amber font-bold">{goveeWatts}W live</span>}
            {goveeWatts !== null && goveeWatts > 0 && <span className="text-steel">${((goveeWatts / 1000) * ELECTRICITY_RATE).toFixed(4)}/hr</span>}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="TOTAL REVENUE" value={formatCurrency(totalRevenue)} sub={`${completedOrders.length} orders`} icon={DollarSign} />
        <StatCard label="TOTAL PROFIT" value={formatCurrency(totalProfit)} sub={`${((totalProfit/totalRevenue)*100||0).toFixed(0)}% margin`} color={totalProfit > 0 ? "text-green-400" : "text-red-400"} icon={TrendingUp} />
        <StatCard label="MATERIAL COST" value={formatCurrency(totalMatCost)} sub={`${(totalGrams/1000).toFixed(2)} kg used`} color="text-red-400" icon={Weight} />
        <StatCard label="KY SALES TAX" value={formatCurrency(totalTax)} sub="collected" color="text-blue-400" icon={Package} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="ELECTRICITY EST." value={formatCurrency(totalElecCost)} sub={`${totalHours.toFixed(0)}h print time`} color="text-yellow-400" icon={Zap} />
        <StatCard label="AVG ORDER VALUE" value={formatCurrency(totalRevenue / (completedOrders.length || 1))} sub="per order" icon={DollarSign} />
        <StatCard label="FILAMENT USED" value={`${(totalGrams/1000).toFixed(2)} kg`} sub={`${(totalGrams/453.592).toFixed(2)} lbs`} color="text-blue-400" icon={Weight} />
        <StatCard label="PRINT HOURS" value={`${Math.floor(totalHours)}h ${Math.round((totalHours%1)*60)}m`} sub="total machine time" color="text-orange-400" icon={Zap} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
          <div className="font-mono text-xs text-amber tracking-widest mb-4">MONTHLY REVENUE</div>
          <BarChart data={monthlyRevenue} color="#f59e0b" label="$" />
        </div>
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
          <div className="font-mono text-xs text-green-400 tracking-widest mb-4">MONTHLY PROFIT</div>
          <BarChart data={monthlyProfit} color="#22c55e" label="$" />
        </div>
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
          <div className="font-mono text-xs text-red-400 tracking-widest mb-4">MATERIAL COST</div>
          <BarChart data={monthlyMaterialCost} color="#ef4444" label="$" />
        </div>
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
          <div className="font-mono text-xs text-yellow-400 tracking-widest mb-4">ELECTRICITY COST (EST.)</div>
          <BarChart data={monthlyElec} color="#eab308" label="$" />
        </div>
      </div>

      {/* Material breakdown */}
      {materialBreakdown.length > 0 && (
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5 mb-6">
          <div className="font-mono text-xs text-amber tracking-widest mb-4">FILAMENT BY MATERIAL</div>
          <div className="space-y-3">
            {materialBreakdown.map(([mat, grams]) => (
              <div key={mat} className="flex items-center gap-3">
                <div className="font-mono text-xs w-16 text-steel">{mat}</div>
                <div className="flex-1 h-3 bg-ironworks rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(grams / maxGrams) * 100}%`, background: MATERIAL_COLORS[mat] || "#6b7280" }} />
                </div>
                <div className="font-mono text-xs text-bone w-20 text-right">{(grams / 1000).toFixed(3)} kg</div>
                <div className="font-mono text-xs text-red-400 w-16 text-right">{formatCurrency((grams / 1000) * (COST_PER_KG[mat] || 16))}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly detail table */}
      {months.length > 0 && (
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ironworks3">
            <div className="font-mono text-xs text-amber tracking-widest">MONTHLY BREAKDOWN</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ironworks3">
                  {["MONTH","REVENUE","MAT COST","ELEC EST.","TAX","PROFIT","FILAMENT"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-xs text-steel">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map(m => {
                  const d = monthlyData[m];
                  const elec = (d.printHours * AVG_PRINTER_WATTS / 1000) * ELECTRICITY_RATE;
                  const profit = d.revenue - d.materialCost - elec;
                  const totalFilamentKg = Object.values(d.grams).reduce((s, g) => s + g, 0) / 1000;
                  return (
                    <tr key={m} className="border-b border-ironworks3/50 hover:bg-ironworks3/20">
                      <td className="px-4 py-3 font-mono text-xs text-bone">{formatMonth(m)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-amber">{formatCurrency(d.revenue)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-red-400">{formatCurrency(d.materialCost)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-yellow-400">{formatCurrency(elec)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-400">{formatCurrency(d.tax)}</td>
                      <td className={`px-4 py-3 font-mono text-xs font-bold ${profit > 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(profit)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-steel">{totalFilamentKg.toFixed(3)} kg</td>
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
