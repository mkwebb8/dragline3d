"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DraglineMark } from "@/components/DraglineMark";
import { LogOut, RefreshCw, ExternalLink, Printer, Thermometer, Clock, Layers, Plus, Zap } from "lucide-react";
import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const innerCell: CSSProperties = { background: "rgba(255,255,255,0.04)", borderRadius: 12 };

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
  const [shellyData, setShellyData] = useState<any>(null);
  const lastAutoRef = useRef<string>("");

  const fetchPrinter = useCallback(async () => {
    try {
      const res = await fetch("/api/printer", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError(true); return; }
      const json = await res.json();
      setData(json);
      setError(false);
      // Auto-status: when print starts, match filename to order and flip status
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

  const stats = data.print_stats;
  const vsd = data.virtual_sdcard;
  const bed = data.heater_bed;
  const extruder = data.extruder;
  const state: string = stats?.state || "standby";
  const progress = vsd?.progress || 0;
  const elapsed = stats?.print_duration || 0;
  const eta = progress > 0.01 ? (elapsed / progress - elapsed) : 0;
  const filename = (stats?.filename || vsd?.file_path || "").split("/").pop()?.replace(".gcode", "") || "";
  // Creality touchscreen prints bypass Moonraker job tracking — infer from nozzle temp alone
  // Touchscreen prints bypass Moonraker entirely — target stays 0, only temperature rises
  const tempInferred = state !== "printing" &&
    (extruder?.temperature || 0) > 150;
  const isActive = state === "printing" || tempInferred;
  const displayState = state === "printing" ? "PRINTING"
    : tempInferred ? "PRINTING*"
    : state.toUpperCase();
  const watts: number | null = shellyData?.apower ?? null;
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
          {watts !== null && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold text-yellow-400"
              style={{ background: "rgba(250,204,21,0.12)" }}>
              <Zap size={9} /> {watts.toFixed(0)}W
            </span>
          )}
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
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchOrders}
            className="p-2 rounded-xl text-bone/60 hover:text-bone transition-colors cursor-pointer"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <RefreshCw size={16} />
          </button>
          {[
            { href: "/admin/parts", label: "PARTS QUEUE" },
            { href: "/admin/analytics", label: "ANALYTICS" },
            { href: "/admin/inventory", label: "INVENTORY" },
            { href: "/admin/gallery", label: "GALLERY" },
            { href: "/admin/manual-quote", label: "MANUAL QUOTE" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              {label}
            </Link>
          ))}
          <Link href="/admin/orders/new"
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            <Plus size={14} />NEW ORDER
          </Link>
          <button onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs text-bone/60 hover:text-bone transitio