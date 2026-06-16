"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Clock, CheckCircle2, Printer, Thermometer, Layers, List, Minus, Plus, Zap, PrinterCheck } from "lucide-react";
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

const PART_STATUSES = [
  { value: "pending", label: "Pending", color: "#6b7280" },
  { value: "sliced", label: "Sliced", color: "#3b82f6" },
  { value: "sent_to_printer", label: "Sent to Printer", color: "#f59e0b" },
  { value: "printing", label: "Printing", color: "#f97316" },
  { value: "completed", label: "Completed", color: "#22c55e" },
];

function formatHours(h: number) {
  const hrs = Math.floor(h); const mins = Math.round((h - hrs) * 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`; return `${m}m`;
}

function hoursToHM(h: number): { h: number; m: number } {
  return { h: Math.floor(h), m: Math.round((h - Math.floor(h)) * 60) };
}

function hmToHours(h: number, m: number): number {
  return h + (m / 60);
}

function PrinterWidget({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [shellyData, setShellyData] = useState<any>(null);
  const lastAutoRef = useRef<string>("");

  const fetchPrinter = useCallback(async () => {
    try {
      const res = await fetch("/api/printer", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError(true); return; }
      const json = await res.json();
      setData(json); setError(false);
      // Auto-status: if printing and filename changed, try to match order
      const fname = json.print_stats?.filename?.split("/").pop() || "";
      if (json.print_stats?.state === "printing" && fname && fname !== lastAutoRef.current) {
        lastAutoRef.current = fname;
        fetch("/api/admin/printer/auto-status", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ filename: fname, state: "printing" }),
        }).catch(() => {});
      }
    } catch { setError(true); }
  }, [token]);

  const fetchShelly = useCallback(async () => {
    try {
      const res = await fetch("/api/shelly/power");
      if (res.ok) setShellyData(await res.json());
    } catch { /* shelly optional */ }
  }, []);

  useEffect(() => {
    fetchPrinter();
    fetchShelly();
    const p = setInterval(fetchPrinter, 10000);
    const s = setInterval(fetchShelly, 15000);
    return () => { clearInterval(p); clearInterval(s); };
  }, [fetchPrinter, fetchShelly]);

  if (error || !data) {
    return (
      <div className="mb-6 rounded-xl overflow-hidden flex items-center gap-3 p-4" style={glass}>
        <Printer size={16} className="text-steel" />
        <span className="font-mono text-xs text-steel">PRINTER OFFLINE</span>
      </div>
    );
  }

  const stats = data.print_stats; const vsd = data.virtual_sdcard; const bed = data.heater_bed; const extruder = data.extruder;
  const state: string = stats?.state || "standby"; const progress = vsd?.progress || 0; const elapsed = stats?.print_duration || 0;
  const eta = progress > 0.01 ? (elapsed / progress - elapsed) : 0;
  const filename = (stats?.filename || vsd?.file_path || "").split("/").pop()?.replace(".gcode", "") || "";
  const watts: number | null = shellyData?.watts !== undefined ? shellyData.watts : (shellyData?.apower !== undefined ? shellyData.apower : null);
  // Touchscreen prints bypass Moonraker — infer from nozzle temp or Shelly draw
  const tempInferred = state !== "printing" && (extruder?.temperature || 0) > 150;
  const shellyInferred = state !== "printing" && (watts ?? 0) > 100;
  const isActive = state === "printing" || tempInferred || shellyInferred;
  const displayState = state === "printing" ? "PRINTING"
    : tempInferred ? "PRINTING*"
    : shellyInferred ? "PRINTING~"
    : state.toUpperCase();
  const pollError: string | null = shellyData?.poll_error ?? null;
  const activeSession = shellyData?.active_session ?? null;

  return (
    <div className="mb-6 rounded-xl overflow-hidden" style={glass}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <Printer size={14} className={isActive ? "text-amber" : "text-steel"} />
          <span className="font-mono text-xs tracking-widest font-bold">K2 PLUS</span>
          <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${isActive ? "bg-orange-500/20 text-orange-400" : "text-steel"}`}
            style={isActive ? {} : innerCell}
            title={tempInferred ? "Detected via nozzle temp — touchscreen print bypasses Moonraker" : undefined}>
            {displayState}
          </span>
          {watts !== null ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold text-yellow-400"
              style={{ background: "rgba(250,204,21,0.12)" }}>
              <Zap size={9} /> {watts.toFixed(0)}W
            </span>
          ) : pollError ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs text-red-400"
              title={`Shelly unreachable: ${pollError}`}
              style={{ background: "rgba(239,68,68,0.10)" }}>
              <Zap size={9} /> ?W
            </span>
          ) : null}
        </div>
        {isActive && filename && <span className="font-mono text-xs text-steel truncate max-w-xs">{filename}</span>}
      </div>

      {isActive && (
        <div className="p-4">
          <div className="mb-3">
            <div className="flex justify-between font-mono text-xs mb-1.5">
              <span className="text-bone/60">Progress</span>
              <span className="text-amber font-bold">{(progress * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-full bg-amber transition-all duration-1000 rounded-full" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Clock size={10} />, label: "Elapsed", value: formatDuration(elapsed) },
              { icon: <Clock size={10} />, label: "Remaining", value: eta > 0 ? formatDuration(eta) : "—" },
              { icon: <Thermometer size={10} />, label: "Nozzle", value: <>{extruder?.temperature?.toFixed(0)}°<span className="text-steel text-xs">/{extruder?.target?.toFixed(0)}°</span></> },
              { icon: <Thermometer size={10} />, label: "Bed", value: <>{bed?.temperature?.toFixed(0)}°<span className="text-steel text-xs">/{bed?.target?.toFixed(0)}°</span></> },
            ].map(({ icon, label, value }) => (
              <div key={label} className="p-3 rounded-xl" style={innerCell}>
                <div className="font-mono text-xs text-steel mb-1 flex items-center gap-1">{icon} {label}</div>
                <div className="font-display font-bold text-sm">{value}</div>
              </div>
            ))}
          </div>
          {activeSession && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={innerCell}>
                <div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Zap size={10} /> Session Wh</div>
                <div className="font-display font-bold text-sm">{Number(activeSession.wh_accumulated).toFixed(1)} Wh</div>
              </div>
              <div className="p-3 rounded-xl" style={innerCell}>
                <div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Zap size={10} /> Elec. Cost</div>
                <div className="font-display font-bold text-sm text-green-400">${Number(activeSession.electricity_cost).toFixed(4)}</div>
              </div>
            </div>
          )}
          {vsd?.layer > 0 && (
            <div className="mt-2 font-mono text-xs text-steel flex items-center gap-1">
              <Layers size={10} /> Layer {vsd.layer} · Z {stats?.z_pos?.toFixed(2)}mm
            </div>
          )}
        </div>
      )}

      {!isActive && (
        <div className="px-4 py-3 flex flex-wrap gap-4">
          <div className="font-mono text-xs text-steel flex items-center gap-1.5"><Thermometer size={10} /> Nozzle: {extruder?.temperature?.toFixed(0)}°C</div>
          <div className="font-mono text-xs text-steel flex items-center gap-1.5"><Thermometer size={10} /> Bed: {bed?.temperature?.toFixed(0)}°C</div>
          {watts !== null && <div className="font-mono text-xs text-yellow-400/70 flex items-center gap-1.5"><Zap size={10} /> {watts.toFixed(0)}W draw</div>}
        </div>
      )}
    </div>
  );
}

export default function PartsPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [editingHours, setEditingHours] = useState<Record<string, { h: string; m: string }>>({});
  const [editingGrams, setEditingGrams] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const fetchParts = useCallback(async () => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t); setLoading(true);
    const res = await fetch("/api/admin/orders?status=queued", { headers: { Authorization: `Bearer ${t}` } });
    const queued = res.ok ? await res.json() : [];
    const res2 = await fetch("/api/admin/orders?status=printing", { headers: { Authorization: `Bearer ${t}` } });
    const printing = res2.ok ? await res2.json() : [];
    const res3 = await fetch("/api/admin/orders?status=received", { headers: { Authorization: `Bearer ${t}` } });
    const received = res3.ok ? await res3.json() : [];
    const allOrders = [...received, ...queued, ...printing].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const flatParts = allOrders.flatMap((o: any) => (o.order_items || []).map((i: any) => ({ ...i, order_id: o.id, order_status: o.status, customer_name: o.customer_name, order_created_at: o.created_at })));
    setParts(flatParts); setLoading(false);
  }, [router]);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  async function updatePart(itemId: string, updates: Record<string, any>) {
    setSaving(s => ({ ...s, [itemId]: true }));
    await fetch(`/api/admin/orders/${parts.find(p => p.id === itemId)?.order_id}/items/${itemId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setParts(prev => prev.map(p => {
      if (p.id !== itemId) return p;
      const updated = { ...p, ...updates };
      if (updates.part_status === "completed") updated.completed = true;
      else if (updates.part_status && updates.part_status !== "completed") updated.completed = false;
      return updated;
    }));
    setSaving(s => ({ ...s, [itemId]: false }));
  }

  async function updateRuns(itemId: string, delta: number) {
    const part = parts.find(p => p.id === itemId);
    if (!part) return;
    const qty = part.qty || 1; const current = part.runs || 1;
    const next = Math.max(1, Math.min(qty, current + delta));
    if (next === current) return;
    await updatePart(itemId, { runs: next });
  }

  async function updatePrintedQty(itemId: string, delta: number) {
    const part = parts.find(p => p.id === itemId);
    if (!part) return;
    const runs = part.runs || 1; const current = part.printed_qty || 0;
    const next = Math.max(0, Math.min(runs, current + delta));
    if (next === current) return;
    const updates: Record<string, any> = { printed_qty: next };
    if (next >= runs) { updates.part_status = "completed"; updates.completed = true; }
    else if (part.part_status === "completed") { updates.part_status = "printing"; updates.completed = false; }
    await updatePart(itemId, updates);
  }

  function startEditingHours(partId: string, currentHours: number) {
    const { h, m } = hoursToHM(currentHours);
    setEditingHours(s => ({ ...s, [partId]: { h: String(h), m: String(m) } }));
  }

  async function saveHours(itemId: string) {
    const ed = editingHours[itemId];
    if (!ed) return;
    const h = parseInt(ed.h) || 0; const m = parseInt(ed.m) || 0;
    if (h === 0 && m === 0) return;
    const val = hmToHours(h, m);
    await updatePart(itemId, { print_hours: val });
    setEditingHours(s => { const n = { ...s }; delete n[itemId]; return n; });
  }

  async function saveGrams(itemId: string) {
    const val = parseFloat(editingGrams[itemId]);
    if (isNaN(val) || val <= 0) return;
    await updatePart(itemId, { grams: val });
    setEditingGrams(s => ({ ...s, [itemId]: "" }));
  }

  const incompleteParts = parts.filter(p => !p.completed);
  const backlogHours = incompleteParts.reduce((s, p) => {
    const hoursPerPiece = p.print_hours || p.hours || 0;
    const qty = p.qty || 1; const runs = p.runs || 1;
    const completedRuns = p.printed_qty || 0;
    const piecesPerRun = qty / runs;
    const remainingRuns = Math.max(0, runs - completedRuns);
    return s + hoursPerPiece * piecesPerRun * remainingRuns;
  }, 0);

  const sortedParts = (group: any[]) => [
    ...group.filter(p => p.part_status === "printing"),
    ...group.filter(p => p.part_status !== "printing"),
  ];

  const statusGroups = PART_STATUSES.map(s => ({ ...s, parts: sortedParts(parts.filter(p => (p.part_status || "pending") === s.value && !p.completed)) }));
  const completedParts = parts.filter(p => p.completed);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-6 py-16 text-center">
      <div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-display font-extrabold text-xl">Parts Queue</div>
          <div className="font-mono text-xs text-steel">DRAGLINE 3D · FIFO</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchParts} className="p-2 rounded-xl text-bone/60 hover:text-bone transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><RefreshCw size={16} /></button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><PrinterCheck size={14} />PRINT</button>
          <Link href="/admin/orders" className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><List size={14} />ORDER QUEUE</Link>
          <Link href="/admin/plates" className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><Layers size={14} />PLATE BUILDER</Link>
        </div>
      </div>

      {token && <PrinterWidget token={token} />}

      {backlogHours > 0 && (
        <div className="mb-6 px-4 py-3 rounded-xl flex items-center gap-3" style={{ ...glass, border: "1px solid rgba(255,181,71,0.20)", background: "rgba(255,181,71,0.05)" }}>
          <Clock size={14} className="text-amber" />
          <span className="font-mono text-xs text-steel">PRINT BACKLOG</span>
          <span className="font-mono text-xs font-bold text-amber">~{formatHours(backlogHours)}</span>
          <span className="font-mono text-xs text-steel">across {incompleteParts.length} line{incompleteParts.length !== 1 ? "s" : ""} · {incompleteParts.reduce((s, p) => s + (p.qty || 1), 0)} pcs</span>
        </div>
      )}

      {parts.length === 0 && (
        <div className="text-center py-20 text-bone/40">
          <div className="font-display text-2xl mb-2">No active parts</div>
          <div className="font-mono text-xs">Parts from queued and printing orders appear here</div>
        </div>
      )}

      {statusGroups.filter(g => g.parts.length > 0).map(group => (
        <div key={group.value} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
            <div className="font-mono text-xs tracking-widest" style={{ color: group.color }}>{group.label.toUpperCase()}</div>
            <div className="font-mono text-xs text-steel">({group.parts.length})</div>
          </div>
          <div className="space-y-2">
            {group.parts.map(part => {
              const hoursPerPiece = part.print_hours || part.hours || 0;
              const gramsPerPiece = Number(part.grams || 0);
              const qty = part.qty || 1;
              const runs = part.runs || 1;
              const printedRuns = part.printed_qty || 0;
              const piecesPerRun = qty / runs;
              const hoursPerRun = hoursPerPiece * piecesPerRun;
              const gramsPerRun = gramsPerPiece * piecesPerRun;
              const totalHours = hoursPerPiece * qty;
              const totalGrams = gramsPerPiece * qty;
              const isEditingH = !!editingHours[part.id];
              const hm = hoursToHM(hoursPerPiece);
              return (
                <div key={part.id} className="rounded-xl p-4" style={part.part_status === "printing"
                  ? { ...glass, border: "1px solid rgba(249,115,22,0.40)" }
                  : glass}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {qty > 1 && <span className="font-mono text-xs font-bold text-amber">{qty}×</span>}
                        <div className="font-medium text-sm truncate">{part.file_name}</div>
                        {part.print_hours && <span className="font-mono text-xs text-amber px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,181,71,0.10)" }}>custom time</span>}
                      </div>
                      <div className="font-mono text-xs text-steel mb-1">
                        {part.material} · {part.color || "Midnight Black"} · {part.quality} · {part.infill}%
                      </div>
                      <div className="font-mono text-xs text-steel/60 mb-0.5">
                        per piece: {gramsPerPiece.toFixed(1)}g · {formatHours(hoursPerPiece)}
                      </div>
                      {(runs > 1 || qty > 1) && (
                        <div className="font-mono text-xs text-amber/70 mb-0.5">
                          per run ({piecesPerRun % 1 === 0 ? piecesPerRun : piecesPerRun.toFixed(1)} pcs): {gramsPerRun.toFixed(1)}g · {formatHours(hoursPerRun)}
                        </div>
                      )}
                      <div className="font-mono text-xs text-bone/80 mb-2">
                        total ({runs} run{runs !== 1 ? "s" : ""}): {totalGrams.toFixed(1)}g · {formatHours(totalHours)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/orders/${part.order_id}`} className="font-mono text-xs text-amber hover:underline">{part.order_id}</Link>
                        <span className="font-mono text-xs text-steel">·</span>
                        <span className="font-mono text-xs text-steel">{part.customer_name}</span>
                        <span className="font-mono text-xs text-steel">·</span>
                        <span className="font-mono text-xs text-steel capitalize px-1.5 py-0.5 rounded-md" style={innerCell}>{part.order_status}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-steel">runs:</span>
                        <button onClick={() => updateRuns(part.id, -1)} disabled={saving[part.id] || runs <= 1}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-bone/60 hover:text-bone transition-colors disabled:opacity-30 cursor-pointer"
                          style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                          <Minus size={10} />
                        </button>
                        <span className="font-mono text-sm font-bold w-6 text-center text-bone">{runs}</span>
                        <button onClick={() => updateRuns(part.id, 1)} disabled={saving[part.id] || runs >= qty}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-bone/60 hover:text-bone transition-colors disabled:opacity-30 cursor-pointer"
                          style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                          <Plus size={10} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-steel">done:</span>
                        <button onClick={() => updatePrintedQty(part.id, -1)} disabled={saving[part.id] || printedRuns <= 0}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-bone/60 hover:text-bone transition-colors disabled:opacity-30 cursor-pointer"
                          style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                          <Minus size={10} />
                        </button>
                        <span className={`font-mono text-sm font-bold w-8 text-center ${printedRuns >= runs ? "text-green-400" : "text-amber"}`}>{printedRuns}/{runs}</span>
                        <button onClick={() => updatePrintedQty(part.id, 1)} disabled={saving[part.id] || printedRuns >= runs}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-bone/60 hover:text-bone transition-colors disabled:opacity-30 cursor-pointer"
                          style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                          <Plus size={10} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-steel">g/pc:</span>
                        <input type="number" step="0.1" min="0.1" placeholder={gramsPerPiece.toFixed(1)}
                          value={editingGrams[part.id] || ""} onChange={e => setEditingGrams(s => ({ ...s, [part.id]: e.target.value }))}
                          className="w-16 px-2 py-1 rounded-lg text-bone text-xs font-mono transition-colors"
                          style={inputSt}
                          onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
                          onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }} />
                        {editingGrams[part.id] && (
                          <button onClick={() => saveGrams(part.id)}
                            className="px-2 py-1 text-xs font-mono rounded-lg text-ironworks font-bold cursor-pointer"
                            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
                            save
                          </button>
                        )}
                      </div>
                      {!isEditingH ? (
                        <button onClick={() => startEditingHours(part.id, hoursPerPiece)}
                          className="font-mono text-xs text-steel hover:text-amber transition-colors cursor-pointer">
                          {formatHours(hoursPerPiece)}/pc ✎
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" placeholder={String(hm.h)}
                            value={editingHours[part.id]?.h || ""} onChange={e => setEditingHours(s => ({ ...s, [part.id]: { ...s[part.id], h: e.target.value } }))}
                            className="w-10 px-1 py-1 rounded-lg text-bone text-xs font-mono text-center"
                            style={inputSt}
                            onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; }}
                            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }} />
                          <span className="font-mono text-xs text-steel">h</span>
                          <input type="number" min="0" max="59" placeholder={String(hm.m)}
                            value={editingHours[part.id]?.m || ""} onChange={e => setEditingHours(s => ({ ...s, [part.id]: { ...s[part.id], m: e.target.value } }))}
                            className="w-10 px-1 py-1 rounded-lg text-bone text-xs font-mono text-center"
                            style={inputSt}
                            onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; }}
                            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }} />
                          <span className="font-mono text-xs text-steel">m</span>
                          <button onClick={() => saveHours(part.id)}
                            className="px-2 py-1 text-xs font-mono rounded-lg text-ironworks font-bold cursor-pointer"
                            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
                            save
                          </button>
                          <button onClick={() => setEditingHours(s => { const n = { ...s }; delete n[part.id]; return n; })}
                            className="font-mono text-xs text-steel hover:text-bone cursor-pointer">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    {PART_STATUSES.map(s => (
                      <button key={s.value} disabled={saving[part.id]} onClick={() => updatePart(part.id, { part_status: s.value })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-colors cursor-pointer"
                        style={(part.part_status || "pending") === s.value
                          ? { color: s.color, borderColor: s.color, background: `${s.color}15`, fontWeight: "bold" }
                          : { border: "1px solid rgba(255,255,255,0.07)", color: "#5a5a5e" }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {completedParts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div className="font-mono text-xs tracking-widest text-green-500">COMPLETED</div>
            <div className="font-mono text-xs text-steel">({completedParts.length})</div>
          </div>
          <div className="space-y-2 opacity-50">
            {completedParts.map(part => (
              <div key={part.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-4" style={glass}>
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm line-through text-steel truncate">
                      {(part.qty || 1) > 1 && <span className="mr-1">{part.qty}×</span>}{part.file_name}
                    </div>
                    <div className="font-mono text-xs text-steel">{part.material} · {part.quality} · {part.order_id}</div>
                  </div>
                </div>
                <button onClick={() => updatePart(part.id, { part_status: "printing", completed: false, printed_qty: 0 })}
                  className="text-xs font-mono text-steel hover:text-bone transition-colors cursor-pointer px-2 py-1 rounded-lg"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRINT-ONLY CHECKLIST ── hidden on screen, shown when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-sheet, .print-sheet * { visibility: visible !important; }
          .print-sheet {
            position: fixed !important;
            inset: 0 !important;
            padding: 24px 32px !important;
            background: #fff !important;
            color: #000 !important;
            font-family: monospace !important;
            font-size: 11px !important;
          }
        }
        @media screen { .print-sheet { display: none; } }
      `}</style>

      <div className="print-sheet">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, borderBottom: "2px solid #000", paddingBottom: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>DRAGLINE 3D — PARTS QUEUE</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {" · "}{incompleteParts.length} active part{incompleteParts.length !== 1 ? "s" : ""}
              {" · "}{incompleteParts.reduce((s, p) => s + (p.qty || 1), 0)} pcs
              {backlogHours > 0 && ` · ~${formatHours(backlogHours)} backlog`}
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#555", textAlign: "right" }}>
            Printed {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>

        {statusGroups.filter(g => g.parts.length > 0).map(group => (
          <div key={group.value} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#444", marginBottom: 4, borderBottom: "1px solid #ddd", paddingBottom: 2 }}>
              {group.label} ({group.parts.length})
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <th style={{ width: 20, paddingRight: 6 }}></th>
                  <th style={{ textAlign: "left", paddingBottom: 3, fontWeight: 700 }}>File / Customer</th>
                  <th style={{ textAlign: "left", paddingBottom: 3, fontWeight: 700 }}>Material · Color</th>
                  <th style={{ textAlign: "left", paddingBottom: 3, fontWeight: 700 }}>Quality · Infill</th>
                  <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: 700 }}>Qty</th>
                  <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: 700 }}>Grams</th>
                  <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: 700 }}>Time</th>
                  <th style={{ textAlign: "right", paddingBottom: 3, fontWeight: 700 }}>Runs</th>
                </tr>
              </thead>
              <tbody>
                {group.parts.map((part, i) => {
                  const hoursPerPiece = part.print_hours || part.hours || 0;
                  const qty = part.qty || 1;
                  const runs = part.runs || 1;
                  const printedRuns = part.printed_qty || 0;
                  const totalGrams = Number(part.grams || 0) * qty;
                  const totalHours = hoursPerPiece * qty;
                  return (
                    <tr key={part.id} style={{ borderBottom: "1px solid #eee", background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                      <td style={{ paddingTop: 5, paddingBottom: 5, paddingRight: 6 }}>
                        <div style={{ width: 14, height: 14, border: "1.5px solid #000", borderRadius: 3, display: "inline-block" }} />
                      </td>
                      <td style={{ paddingTop: 5, paddingBottom: 5 }}>
                        <div style={{ fontWeight: 700 }}>{part.file_name}</div>
                        <div style={{ color: "#555" }}>{part.customer_name} · {part.order_id}</div>
                      </td>
                      <td style={{ paddingTop: 5, paddingBottom: 5 }}>{part.material} · {part.color || "Black"}</td>
                      <td style={{ paddingTop: 5, paddingBottom: 5 }}>{part.quality} · {part.infill}%</td>
                      <td style={{ textAlign: "right", paddingTop: 5, paddingBottom: 5, fontWeight: 700 }}>{qty}</td>
                      <td style={{ textAlign: "right", paddingTop: 5, paddingBottom: 5 }}>{totalGrams.toFixed(1)}g</td>
                      <td style={{ textAlign: "right", paddingTop: 5, paddingBottom: 5 }}>{formatHours(totalHours)}</td>
                      <td style={{ textAlign: "right", paddingTop: 5, paddingBottom: 5 }}>{printedRuns}/{runs}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {completedParts.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid #ccc", paddingTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 2, color: "#444", marginBottom: 4 }}>COMPLETED ({completedParts.length})</div>
            {completedParts.map(part => (
              <div key={part.id} style={{ fontSize: 10, color: "#888", textDecoration: "line-through", marginBottom: 2 }}>
                ✓ {(part.qty || 1) > 1 ? `${part.qty}× ` : ""}{part.file_name} · {part.customer_name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
