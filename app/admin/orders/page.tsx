"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DraglineMark } from "@/components/DraglineMark";
import { LogOut, RefreshCw, ExternalLink, Printer, Thermometer, Clock, Layers, Plus } from "lucide-react";

const STATUS_LABELS: Record<string, string> = { pending: "Payment Pending", received: "Order Received", queued: "In Queue", printing: "Printing", quality_check: "Quality Check", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const STATUS_COLORS: Record<string, string> = { pending: "#6b7280", received: "#3b82f6", queued: "#f59e0b", printing: "#f97316", quality_check: "#a855f7", shipped: "#22c55e", delivered: "#16a34a", cancelled: "#ef4444" };

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function PrinterWidget({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  const fetchPrinter = useCallback(async () => {
    try {
      const res = await fetch("/api/printer", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError(true); return; }
      setData(await res.json());
      setError(false);
    } catch { setError(true); }
  }, [token]);

  useEffect(() => {
    fetchPrinter();
    const interval = setInterval(fetchPrinter, 10000);
    return () => clearInterval(interval);
  }, [fetchPrinter]);

  if (error || !data) {
    return (
      <div className="mb-6 rounded-sm border border-ironworks3 bg-ironworks2 p-4 flex items-center gap-3">
        <Printer size={16} className="text-steel" />
        <span className="font-mono text-xs text-steel">PRINTER OFFLINE</span>
      </div>
    );
  }

  const stats = data.print_stats;
  const vsd = data.virtual_sdcard;
  const bed = data.heater_bed;
  const extruder = data.extruder;
  const state: string = stats?.state || "standby";
  const progress = vsd?.progress || 0;
  const elapsed = stats?.print_duration || 0;
  const eta = progress > 0.01 ? (elapsed / progress - elapsed) : 0;
  const filename = stats?.filename?.split("/").pop()?.replace(".gcode", "") || "";
  const isActive = state === "printing";

  return (
    <div className="mb-6 rounded-sm border border-ironworks3 bg-ironworks2 overflow-hidden">
      <div className="px-4 py-3 border-b border-ironworks3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer size={14} className={isActive ? "text-amber" : "text-steel"} />
          <span className="font-mono text-xs tracking-widest font-bold">K2 PLUS</span>
          <span className={`px-2 py-0.5 rounded-sm font-mono text-xs font-bold ${isActive ? "bg-orange-500/20 text-orange-400" : "bg-ironworks3 text-steel"}`}>
            {state.toUpperCase()}
          </span>
        </div>
        {isActive && filename && (
          <span className="font-mono text-xs text-steel truncate max-w-xs">{filename}</span>
        )}
      </div>

      {isActive && (
        <div className="p-4">
          <div className="mb-3">
            <div className="flex justify-between font-mono text-xs mb-1.5">
              <span className="text-bone/60">Progress</span>
              <span className="text-amber font-bold">{(progress * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-ironworks3 rounded-full overflow-hidden">
              <div className="h-full bg-amber transition-all duration-1000 rounded-full" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-ironworks rounded-sm p-3">
              <div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Clock size={10}/> Elapsed</div>
              <div className="font-display font-bold text-sm">{formatDuration(elapsed)}</div>
            </div>
            <div className="bg-ironworks rounded-sm p-3">
              <div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Clock size={10}/> Remaining</div>
              <div className="font-display font-bold text-sm">{eta > 0 ? formatDuration(eta) : "—"}</div>
            </div>
            <div className="bg-ironworks rounded-sm p-3">
              <div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Thermometer size={10}/> Nozzle</div>
              <div className="font-display font-bold text-sm">{extruder?.temperature?.toFixed(0)}°<span className="text-steel text-xs">/{extruder?.target?.toFixed(0)}°</span></div>
            </div>
            <div className="bg-ironworks rounded-sm p-3">
              <div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Thermometer size={10}/> Bed</div>
              <div className="font-display font-bold text-sm">{bed?.temperature?.toFixed(0)}°<span className="text-steel text-xs">/{bed?.target?.toFixed(0)}°</span></div>
            </div>
          </div>
          {vsd?.layer > 0 && (
            <div className="mt-2 font-mono text-xs text-steel flex items-center gap-1">
              <Layers size={10}/> Layer {vsd.layer} · Z {stats?.z_pos?.toFixed(2)}mm
            </div>
          )}
        </div>
      )}

      {!isActive && (
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          <div className="font-mono text-xs text-steel flex items-center gap-1.5">
            <Thermometer size={10}/> Nozzle: {extruder?.temperature?.toFixed(0)}°C
          </div>
          <div className="font-mono text-xs text-steel flex items-center gap-1.5">
            <Thermometer size={10}/> Bed: {bed?.temperature?.toFixed(0)}°C
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [token, setToken] = useState("");
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t);
    setLoading(true);
    const url = filter === "all" ? "/api/admin/orders" : `/api/admin/orders?status=${filter}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) { router.push("/admin/login"); return; }
    setOrders(await res.json());
    setLoading(false);
  }, [filter, router]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  function logout() { localStorage.removeItem("dragline_admin_token"); router.push("/admin/login"); }

  const FILTERS = ["all", "received", "queued", "printing", "quality_check", "shipped", "cancelled"];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <DraglineMark size={36} />
          <div>
            <div className="font-display font-extrabold text-xl">Order Queue</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchOrders} className="p-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone transition-colors"><RefreshCw size={16} /></button>
          <Link href="/admin/parts" className="flex items-center gap-2 px-3 py-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone text-sm transition-colors font-mono text-xs">PARTS QUEUE</Link>
          <Link href="/admin/orders/new" className="flex items-center gap-2 px-3 py-2 rounded-sm bg-amber text-ironworks font-mono text-xs font-bold hover:opacity-90 transition-colors"><Plus size={14}/>NEW ORDER</Link>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone text-sm transition-colors"><LogOut size={14} /> Logout</button>
        </div>
      </div>

      {token && <PrinterWidget token={token} />}

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-sm font-mono text-xs tracking-wide transition-colors ${filter === f ? "bg-amber text-ironworks" : "border border-ironworks3 text-bone/60 hover:text-bone"}`}>
            {f === "all" ? "ALL" : STATUS_LABELS[f]?.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-bone/40">
          <div className="font-display text-2xl mb-2">No orders</div>
          <div className="font-mono text-xs">Orders appear here when customers checkout</div>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <Link key={order.id} href={`/admin/orders/${order.id}`}
              className="block bg-ironworks2 border border-ironworks3 rounded-sm p-4 hover:border-amber/40 transition-colors group">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-xs text-amber font-bold">{order.id}</div>
                  <div className="font-medium text-sm mt-0.5">{order.customer_name}</div>
                  <div className="font-mono text-xs text-steel">{order.customer_email}</div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-display font-bold text-lg text-amber">${order.total?.toFixed(2)}</div>
                    <div className="font-mono text-xs text-steel">{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-sm text-xs font-mono font-bold"
                    style={{ background: `${STATUS_COLORS[order.status]}22`, color: STATUS_COLORS[order.status] }}>
                    {STATUS_LABELS[order.status]}
                  </div>
                  <ExternalLink size={14} className="text-bone/30 group-hover:text-bone/60 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
