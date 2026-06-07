"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, RefreshCw, DollarSign, TrendingDown, X } from "lucide-react";
import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const inputSt: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  outline: "none",
};

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
  e.currentTarget.style.boxShadow = "none";
}

function fc(n: number) { return `$${n.toFixed(2)}`; }

const CATEGORIES = [
  "Filament", "Equipment", "Software / Subscriptions",
  "Shipping Supplies", "Marketing", "Utilities", "Other",
];

const CAT_COLORS: Record<string, string> = {
  "Filament": "#ef4444",
  "Equipment": "#8b5cf6",
  "Software / Subscriptions": "#3b82f6",
  "Shipping Supplies": "#f97316",
  "Marketing": "#ec4899",
  "Utilities": "#eab308",
  "Other": "#6b7280",
};

const PROFIT_FIRST_OPEX = 0.30;
const SQUARE_PCT = 0.029;
const SQUARE_FIXED = 0.30;

const DEFAULT_FORM = {
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  category: "Other",
  vendor: "",
  description: "",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [pfOpex, setPfOpex] = useState(0);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t);
    setLoading(true);

    // Fetch expenses + compute pfOpex from real revenue
    const [expRes, ...orderResults] = await Promise.all([
      fetch("/api/admin/expenses", { headers: { Authorization: `Bearer ${t}` } }),
      ...["received","queued","printing","quality_check","shipped","delivered"].map(s =>
        fetch(`/api/admin/orders?status=${s}`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.ok ? r.json() : [])
      ),
    ]);

    if (expRes.ok) setExpenses(await expRes.json());

    const orders = (orderResults as any[][]).flat();
    const totalRevenue = orders.reduce((s: number, o: any) => s + (o.subtotal || 0), 0);
    const totalSquareFees = orders.reduce((s: number, o: any) =>
      s + Math.round(((o.total || 0) * SQUARE_PCT + SQUARE_FIXED) * 100) / 100, 0);
    const realRevenue = totalRevenue - totalSquareFees;
    setPfOpex(realRevenue * PROFIT_FIRST_OPEX);

    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addExpense() {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    const res = await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    if (res.ok) {
      await fetchData();
      setShowAdd(false);
      setForm({ ...DEFAULT_FORM });
    }
    setSaving(false);
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/admin/expenses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const opexUsedPct = pfOpex > 0 ? Math.min((totalSpent / pfOpex) * 100, 100) : 0;
  const opexVariance = pfOpex - totalSpent;

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  }
  const catList = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...catList.map(([, v]) => v), 1);

  // Group by month
  const byMonth: Record<string, number> = {};
  for (const e of expenses) {
    const m = e.date?.slice(0, 7);
    if (m) byMonth[m] = (byMonth[m] || 0) + Number(e.amount);
  }
  const months = Object.keys(byMonth).sort().slice(-6);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-center">
      <div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors cursor-pointer"><ArrowLeft size={20} /></Link>
          <div>
            <div className="font-display font-extrabold text-xl">Business Expenses</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D · OPEX TRACKER</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-xl text-bone/60 hover:text-bone transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><RefreshCw size={16} /></button>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            <Plus size={14} /> ADD EXPENSE
          </button>
        </div>
      </div>

      {/* Budget overview */}
      <div className="rounded-xl p-5 mb-6" style={glass}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-xs text-steel">OPEX SPEND vs. PROFIT FIRST BUDGET (30% of real revenue)</div>
          <div className="font-mono text-xs text-amber">{fc(pfOpex)} budget</div>
        </div>
        <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${opexUsedPct}%`, background: opexUsedPct > 90 ? "#ef4444" : opexUsedPct > 70 ? "#f59e0b" : "#22c55e" }} />
        </div>
        <div className="flex items-center justify-between font-mono text-xs mb-5">
          <span className="text-steel">Spent: <span className={totalSpent > pfOpex ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{fc(totalSpent)}</span></span>
          <span className={opexVariance >= 0 ? "text-green-400" : "text-red-400 font-bold"}>
            {opexVariance >= 0 ? `${fc(opexVariance)} remaining` : `${fc(Math.abs(opexVariance))} OVER BUDGET`}
          </span>
        </div>

        {/* Category breakdown */}
        {catList.length > 0 && (
          <div className="space-y-2">
            {catList.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[cat] || "#6b7280" }} />
                <div className="font-mono text-xs text-steel w-40 flex-shrink-0">{cat}</div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(amt / maxCat) * 100}%`, background: CAT_COLORS[cat] || "#6b7280" }} />
                </div>
                <div className="font-mono text-xs text-bone w-16 text-right flex-shrink-0">{fc(amt)}</div>
                <div className="font-mono text-xs text-steel w-8 text-right flex-shrink-0">{pfOpex > 0 ? `${((amt / pfOpex) * 100).toFixed(0)}%` : "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl p-5 mb-6" style={{ ...glass, border: "1px solid rgba(255,181,71,0.40)" }}>
          <div className="font-mono text-xs text-amber tracking-widest mb-4 flex items-center justify-between">
            ADD EXPENSE
            <button onClick={() => setShowAdd(false)} className="text-steel hover:text-bone cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block font-mono text-xs text-steel mb-1">DATE</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">AMOUNT ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">CATEGORY</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">VENDOR</label>
              <input type="text" placeholder="Amazon, Sunlu, etc." value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div className="md:col-span-2">
              <label className="block font-mono text-xs text-steel mb-1">DESCRIPTION</label>
              <input type="text" placeholder="What was it for?" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
          </div>
          <button onClick={addExpense} disabled={saving || !form.amount}
            className="px-6 py-2.5 rounded-xl font-display font-bold text-sm text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            {saving ? "SAVING…" : "ADD EXPENSE"}
          </button>
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="text-center py-20 text-bone/40">
          <TrendingDown size={40} className="mx-auto mb-4 opacity-30" />
          <div className="font-display text-2xl mb-2">No expenses yet</div>
          <div className="font-mono text-xs">Start tracking your operating costs</div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={glass}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="font-mono text-xs text-amber tracking-widest">{expenses.length} EXPENSES · {fc(totalSpent)} TOTAL</div>
          </div>
          <div>
            {expenses.map(e => (
              <div key={e.id} className="px-5 py-3 border-b last:border-b-0 flex items-center gap-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[e.category] || "#6b7280" }} />
                <div className="font-mono text-xs text-steel flex-shrink-0 w-20">{e.date}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.description || e.vendor || e.category}</div>
                  <div className="font-mono text-xs text-steel">{e.category}{e.vendor ? ` · ${e.vendor}` : ""}</div>
                </div>
                <div className="font-display font-bold text-sm text-amber flex-shrink-0">{fc(Number(e.amount))}</div>
                <button onClick={() => deleteExpense(e.id)} className="text-steel hover:text-red-400 transition-colors cursor-pointer flex-shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
