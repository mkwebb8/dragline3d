"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Scan, Package, RefreshCw, Box } from "lucide-react";
import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const inputSt: CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" };
const innerCell: CSSProperties = { background: "rgba(255,255,255,0.04)", borderRadius: 12 };

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
  e.currentTarget.style.boxShadow = "none";
}

// Shown in the pricing grid (editable $/kg)
const PRICING_MATERIALS = [
  "PLA","PETG","TPU","ABS","ASA","PET-GF15","PETG-ESD","PA","ASA-CF","PETG-CF","PA-CF","PCTG",
];
// Full list available when adding a spool (includes specialty materials)
const MATERIALS = [
  ...PRICING_MATERIALS,
  "Hyper PLA","Hyper PETG","PET-CF17",
];
const BRANDS = [
  "Sunlu","Bambu","eSUN","Hatchbox","Polymaker","Fiberon","Prusament","Overture",
  "Inland","CookieCad","Creality","Generic","Other",
];
const SHEEN_OPTIONS = ["Matte", "Standard", "Glossy"] as const;
const SWATCH_COLORS = [
  { name: "Midnight Black", hex: "#1a1a1a" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Brown", hex: "#92400e" },
  { name: "Transparent", hex: "#e5e7eb" },
  { name: "Silk Gold", hex: "#d4af37" },
  { name: "Silk Silver", hex: "#c0c0c0" },
  { name: "Rainbow", hex: "rainbow" },
];

function ColorSwatch({ hex, size = 16 }: { hex: string; size?: number }) {
  const isRainbow = hex === "rainbow";
  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: size, height: size,
        background: isRainbow
          ? "linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899)"
          : hex,
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    />
  );
}

function fc(n: any) { return `$${Number(n).toFixed(2)}`; }

const DEFAULT_SPOOL = {
  brand: "Sunlu", material: "PLA", color: "Midnight Black", color_hex: "#1a1a1a",
  weight_full_g: 1000, weight_remaining_g: 1000,
  empty_spool_weight_g: "", total_measured_weight_g: "",
  cost_per_kg: 16, purchase_price: "", barcode: "",
  sheen: "Standard" as string, glow_in_dark: false, notes: "",
};

const DEFAULT_BOX = {
  name: "",
  length_in: "",
  width_in: "",
  height_in: "",
  quantity: "1",
  cost_each: "",
  notes: "",
};

export default function InventoryPage() {
  // ── Filament state ──────────────────────────────────────────────────────────
  const [spools, setSpools] = useState<any[]>([]);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceEdit, setPriceEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanningRef = useRef(false);
  const router = useRouter();
  const [form, setForm] = useState({ ...DEFAULT_SPOOL });
  const [editForm, setEditForm] = useState<any>({});

  // ── Box state ───────────────────────────────────────────────────────────────
  const [boxes, setBoxes] = useState<any[]>([]);
  const [showAddBox, setShowAddBox] = useState(false);
  const [boxForm, setBoxForm] = useState({ ...DEFAULT_BOX });
  const [editBoxId, setEditBoxId] = useState<string | null>(null);
  const [editBoxForm, setEditBoxForm] = useState<any>({});
  const [savingBox, setSavingBox] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t); setLoading(true);
    const [spoolRes, priceRes, boxRes] = await Promise.all([
      fetch("/api/admin/inventory", { headers: { Authorization: `Bearer ${t}` } }),
      fetch("/api/admin/inventory/pricing", { headers: { Authorization: `Bearer ${t}` } }),
      fetch("/api/admin/inventory/boxes", { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    if (spoolRes.ok) setSpools(await spoolRes.json());
    if (priceRes.ok) {
      const rows = await priceRes.json();
      const map: Record<string, number> = {};
      for (const r of rows) map[r.material] = r.cost_per_kg;
      setPricing(map);
    }
    if (boxRes.ok) setBoxes(await boxRes.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filament helpers ────────────────────────────────────────────────────────
  function handleMeasuredWeight(val: string) {
    const measured = parseFloat(val);
    const empty = parseFloat(form.empty_spool_weight_g as string);
    const updates: any = { total_measured_weight_g: val };
    if (!isNaN(measured) && !isNaN(empty) && empty > 0) {
      updates.weight_remaining_g = Math.max(0, Math.round(measured - empty));
    }
    setForm(f => ({ ...f, ...updates }));
  }

  function handleEmptySpoolWeight(val: string) {
    const empty = parseFloat(val);
    const measured = parseFloat(form.total_measured_weight_g as string);
    const updates: any = { empty_spool_weight_g: val };
    if (!isNaN(empty) && !isNaN(measured) && measured > 0) {
      updates.weight_remaining_g = Math.max(0, Math.round(measured - empty));
    }
    setForm(f => ({ ...f, ...updates }));
  }

  async function addSpool() {
    setSaving(true);
    // Sanitize: empty strings → null for numeric fields so Supabase doesn't reject
    const payload = {
      ...form,
      empty_spool_weight_g: form.empty_spool_weight_g !== "" ? Number(form.empty_spool_weight_g) : null,
      total_measured_weight_g: form.total_measured_weight_g !== "" ? Number(form.total_measured_weight_g) : null,
      purchase_price: form.purchase_price !== "" ? Number(form.purchase_price) : null,
    };
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchData(); setShowAdd(false); setForm({ ...DEFAULT_SPOOL });
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Failed to add spool: ${err.error || res.status}`);
    }
    setSaving(false);
  }

  async function updateSpool(id: string, updates: any) {
    setSaving(true);
    await fetch(`/api/admin/inventory/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await fetchData(); setEditId(null); setSaving(false);
  }

  async function deleteSpool(id: string) {
    if (!confirm("Delete this spool?")) return;
    await fetch(`/api/admin/inventory/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setSpools(prev => prev.filter(s => s.id !== id));
  }

  async function updatePrice(material: string, newPrice: number) {
    setSaving(true);
    await fetch("/api/admin/inventory/pricing", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ material, cost_per_kg: newPrice }),
    });
    setPricing(prev => ({ ...prev, [material]: newPrice }));
    setEditingPrice(null); setSaving(false);
  }

  async function startScan() {
    setScanError(""); scanningRef.current = true; setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13","ean_8","code_128","code_39","upc_a","upc_e","qr_code","data_matrix"],
        });
        const loop = async () => {
          if (!scanningRef.current) return;
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try { const r = await detector.detect(videoRef.current); if (r.length > 0) { stopScan(r[0].rawValue); return; } } catch {}
          }
          if (scanningRef.current) setTimeout(loop, 250);
        };
        setTimeout(loop, 600);
      } else { setScanError("Auto-detect not supported in this browser — enter barcode below"); }
    } catch { scanningRef.current = false; setScanning(false); alert("Camera access denied"); }
  }

  function stopScan(barcode?: string) {
    scanningRef.current = false;
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
    setScanning(false); setScanError("");
    if (barcode) setForm(f => ({ ...f, barcode }));
  }

  // ── Box helpers ─────────────────────────────────────────────────────────────
  async function addBox() {
    if (!boxForm.name || !boxForm.length_in || !boxForm.width_in || !boxForm.height_in) return;
    setSavingBox(true);
    const res = await fetch("/api/admin/inventory/boxes", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: boxForm.name,
        length_in: parseFloat(boxForm.length_in),
        width_in: parseFloat(boxForm.width_in),
        height_in: parseFloat(boxForm.height_in),
        quantity: parseInt(boxForm.quantity) || 0,
        cost_each: boxForm.cost_each ? parseFloat(boxForm.cost_each) : null,
        notes: boxForm.notes || null,
      }),
    });
    if (res.ok) { const nb = await res.json(); setBoxes(prev => [...prev, nb].sort((a,b) => a.name.localeCompare(b.name))); setShowAddBox(false); setBoxForm({ ...DEFAULT_BOX }); }
    setSavingBox(false);
  }

  async function updateBox(id: string) {
    setSavingBox(true);
    const res = await fetch(`/api/admin/inventory/boxes/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editBoxForm.name,
        length_in: parseFloat(editBoxForm.length_in),
        width_in: parseFloat(editBoxForm.width_in),
        height_in: parseFloat(editBoxForm.height_in),
        quantity: parseInt(editBoxForm.quantity) || 0,
        cost_each: editBoxForm.cost_each ? parseFloat(editBoxForm.cost_each) : null,
        notes: editBoxForm.notes || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBoxes(prev => prev.map(b => b.id === id ? updated : b).sort((a,b) => a.name.localeCompare(b.name)));
      setEditBoxId(null);
    }
    setSavingBox(false);
  }

  async function deleteBox(id: string) {
    if (!confirm("Delete this box? Orders using it will have their box cleared.")) return;
    await fetch(`/api/admin/inventory/boxes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setBoxes(prev => prev.filter(b => b.id !== id));
  }

  async function adjustQty(id: string, delta: number) {
    const box = boxes.find(b => b.id === id);
    if (!box) return;
    const newQty = Math.max(0, box.quantity + delta);
    const res = await fetch(`/api/admin/inventory/boxes/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });
    if (res.ok) setBoxes(prev => prev.map(b => b.id === id ? { ...b, quantity: newQty } : b));
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const byMaterial: Record<string, any[]> = {};
  for (const s of spools) { if (!byMaterial[s.material]) byMaterial[s.material] = []; byMaterial[s.material].push(s); }
  const totalSpools = spools.length;
  const totalWeight = spools.reduce((s, sp) => s + Number(sp.weight_remaining_g || 0), 0);
  const lowStock = spools.filter(s => Number(s.weight_remaining_g) < Number(s.weight_full_g) * 0.2);
  const totalBoxes = boxes.reduce((s, b) => s + b.quantity, 0);
  const lowBoxes = boxes.filter(b => b.quantity < 3);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-6 py-16 text-center">
      <div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors cursor-pointer"><ArrowLeft size={20} /></Link>
          <div>
            <div className="font-display font-extrabold text-xl">Inventory</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D · {totalSpools} spools · {(totalWeight / 1000).toFixed(2)}kg · {totalBoxes} boxes</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-xl text-bone/60 hover:text-bone transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><RefreshCw size={16} /></button>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            <Plus size={14} /> ADD SPOOL
          </button>
        </div>
      </div>

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(239,68,68,0.30)", background: "rgba(239,68,68,0.05)" }}>
          <Package size={14} className="text-red-400 flex-shrink-0" />
          <span className="font-mono text-xs text-red-400">LOW FILAMENT: {lowStock.map(s => `${s.brand} ${s.material} ${s.color}`).join(", ")}</span>
        </div>
      )}
      {lowBoxes.length > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(245,158,11,0.30)", background: "rgba(245,158,11,0.05)" }}>
          <Box size={14} className="text-amber flex-shrink-0" />
          <span className="font-mono text-xs text-amber">LOW BOXES: {lowBoxes.map(b => `${b.name} (${b.quantity} left)`).join(", ")}</span>
        </div>
      )}

      {/* Material pricing */}
      <div className="rounded-xl overflow-hidden mb-6" style={glass}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="font-mono text-xs text-amber tracking-widest">MATERIAL PRICING ($/kg)</div>
        </div>
        <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {PRICING_MATERIALS.map(mat => (
            <div key={mat} className="p-2 rounded-xl" style={innerCell}>
              <div className="font-mono text-xs text-steel mb-1">{mat}</div>
              {editingPrice === mat ? (
                <div className="flex items-center gap-1">
                  <input type="number" step="0.01" value={priceEdit} onChange={e => setPriceEdit(e.target.value)}
                    className="w-full px-1.5 py-1 rounded-xl text-bone text-xs font-mono transition-colors"
                    style={inputSt} autoFocus onFocus={focusOn} onBlur={focusOff} />
                  <button onClick={() => updatePrice(mat, parseFloat(priceEdit))} className="text-green-400 hover:text-green-300 cursor-pointer"><Save size={12} /></button>
                  <button onClick={() => setEditingPrice(null)} className="text-steel hover:text-bone cursor-pointer"><X size={12} /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-amber">${pricing[mat]?.toFixed(2) || "—"}</span>
                  <button onClick={() => { setEditingPrice(mat); setPriceEdit(String(pricing[mat] || "")); }} className="text-steel hover:text-amber cursor-pointer"><Edit2 size={10} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add spool form */}
      {showAdd && (
        <div className="rounded-xl p-5 mb-6" style={{ ...glass, border: "1px solid rgba(255,181,71,0.40)" }}>
          <div className="font-mono text-xs text-amber tracking-widest mb-4 flex items-center justify-between">
            ADD NEW SPOOL
            <button onClick={() => setShowAdd(false)} className="text-steel hover:text-bone cursor-pointer"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block font-mono text-xs text-steel mb-1">BRAND</label>
              <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                {BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">MATERIAL</label>
              <select value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value, cost_per_kg: pricing[e.target.value] || 16 }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                {MATERIALS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">COLOR</label>
              <div className="flex items-center gap-2">
                <ColorSwatch hex={form.color_hex} size={20} />
                <select value={form.color}
                  onChange={e => { const c = SWATCH_COLORS.find(s => s.name === e.target.value); setForm(f => ({ ...f, color: e.target.value, color_hex: c?.hex || "#ffffff" })); }}
                  className="flex-1 px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                  {SWATCH_COLORS.map(c => <option key={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">SHEEN</label>
              <select value={form.sheen} onChange={e => setForm(f => ({ ...f, sheen: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                {SHEEN_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">GLOW IN THE DARK</label>
              <div className="flex gap-2 pt-1">
                {[true, false].map(val => (
                  <button key={String(val)} type="button"
                    onClick={() => setForm(f => ({ ...f, glow_in_dark: val }))}
                    className="flex-1 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
                    style={form.glow_in_dark === val
                      ? { background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)", color: "#1a1a1a" }
                      : { ...inputSt, color: "rgba(255,255,255,0.5)" }}>
                    {val ? "YES" : "NO"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">SPOOL SIZE</label>
              <select value={form.weight_full_g}
                onChange={e => setForm(f => ({ ...f, weight_full_g: parseInt(e.target.value), weight_remaining_g: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                {[250, 500, 1000, 2000, 5000].map(v => <option key={v} value={v}>{v < 1000 ? `${v}g` : `${v / 1000}kg`}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="font-mono text-xs text-steel tracking-widest mb-3">WEIGHT MEASUREMENT</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-mono text-xs text-steel mb-1">EMPTY SPOOL (g)</label>
                <input type="number" placeholder="e.g. 200" value={form.empty_spool_weight_g}
                  onChange={e => handleEmptySpoolWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">TOTAL ON SCALE (g)</label>
                <input type="number" placeholder="Weigh spool + filament" value={form.total_measured_weight_g}
                  onChange={e => handleMeasuredWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">REMAINING (g)</label>
                <input type="number" value={form.weight_remaining_g}
                  onChange={e => setForm(f => ({ ...f, weight_remaining_g: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">PURCHASE PRICE ($)</label>
                <input type="number" step="0.01" placeholder="0.00" value={form.purchase_price}
                  onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>
            {form.empty_spool_weight_g && form.total_measured_weight_g && (
              <div className="mt-2 font-mono text-xs text-amber">
                ↳ {form.total_measured_weight_g}g total − {form.empty_spool_weight_g}g spool = {form.weight_remaining_g}g filament
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block font-mono text-xs text-steel mb-1">BARCODE</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Scan or type" value={form.barcode}
                  onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-xl text-bone text-sm font-mono transition-colors"
                  style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                <button onClick={startScan} className="px-3 py-2 rounded-xl text-steel hover:text-amber transition-colors cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><Scan size={14} /></button>
              </div>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">NOTES</label>
              <input type="text" placeholder="Optional notes" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
                style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
          </div>

          {scanning && (
            <div className="mb-4">
              <div className="rounded-xl overflow-hidden mb-2 relative" style={{ height: 200, border: "1px solid rgba(255,255,255,0.07)" }}>
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-24 border-2 border-amber/60 rounded-lg" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)" }} />
                </div>
              </div>
              {scanError && <div className="font-mono text-xs text-amber mb-2">{scanError}</div>}
              <div className="flex gap-2">
                <input type="text" placeholder="Or type barcode + Enter"
                  onKeyDown={e => { if (e.key === "Enter") stopScan((e.target as HTMLInputElement).value); }}
                  className="flex-1 px-3 py-2 rounded-xl text-bone text-sm font-mono transition-colors"
                  style={inputSt} autoFocus onFocus={focusOn} onBlur={focusOff} />
                <button onClick={() => stopScan()} className="px-3 py-2 rounded-xl text-steel hover:text-bone cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>Cancel</button>
              </div>
            </div>
          )}

          <button onClick={addSpool} disabled={saving}
            className="px-6 py-2.5 rounded-xl font-display font-bold text-sm text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            {saving ? "SAVING…" : "ADD SPOOL"}
          </button>
        </div>
      )}

      {/* ── Filament spool list ────────────────────────────────────────────── */}
      {spools.length === 0 ? (
        <div className="text-center py-16 text-bone/40">
          <Package size={40} className="mx-auto mb-4 opacity-30" />
          <div className="font-display text-2xl mb-2">No spools yet</div>
          <div className="font-mono text-xs">Add your first spool to get started</div>
        </div>
      ) : (
        <div className="space-y-4 mb-10">
          {Object.entries(byMaterial).sort().map(([mat, matSpools]) => (
            <div key={mat} className="rounded-xl overflow-hidden" style={glass}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="font-mono text-xs text-amber tracking-widest">{mat}</div>
                <div className="font-mono text-xs text-steel">{matSpools.length} spool{matSpools.length !== 1 ? "s" : ""} · {(matSpools.reduce((s, sp) => s + Number(sp.weight_remaining_g), 0) / 1000).toFixed(3)}kg remaining</div>
              </div>
              <div>
                {matSpools.map(spool => {
                  const pct = Math.max(0, Math.min(100, (Number(spool.weight_remaining_g) / Number(spool.weight_full_g)) * 100));
                  const isLow = pct < 20;
                  const isEditing = editId === spool.id;
                  return (
                    <div key={spool.id} className="px-5 py-4 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">BRAND</label>
                              <select value={editForm.brand} onChange={e => setEditForm((f: any) => ({ ...f, brand: e.target.value }))}
                                className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                                {BRANDS.map(b => <option key={b}>{b}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">COLOR</label>
                              <select value={editForm.color}
                                onChange={e => { const c = SWATCH_COLORS.find(s => s.name === e.target.value); setEditForm((f: any) => ({ ...f, color: e.target.value, color_hex: c?.hex || "#ffffff" })); }}
                                className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                                {SWATCH_COLORS.map(c => <option key={c.name}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">SHEEN</label>
                              <select value={editForm.sheen || "Standard"} onChange={e => setEditForm((f: any) => ({ ...f, sheen: e.target.value }))}
                                className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                                {SHEEN_OPTIONS.map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">GLOW</label>
                              <div className="flex gap-1.5 pt-0.5">
                                {[true, false].map(val => (
                                  <button key={String(val)} type="button"
                                    onClick={() => setEditForm((f: any) => ({ ...f, glow_in_dark: val }))}
                                    className="flex-1 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
                                    style={editForm.glow_in_dark === val
                                      ? { background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)", color: "#1a1a1a" }
                                      : { ...inputSt, color: "rgba(255,255,255,0.5)" }}>
                                    {val ? "YES" : "NO"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">REMAINING (g)</label>
                              <input type="number" value={editForm.weight_remaining_g}
                                onChange={e => setEditForm((f: any) => ({ ...f, weight_remaining_g: parseFloat(e.target.value) }))}
                                className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">EMPTY SPOOL (g)</label>
                              <input type="number" placeholder="e.g. 200" value={editForm.empty_spool_weight_g || ""}
                                onChange={e => setEditForm((f: any) => ({ ...f, empty_spool_weight_g: e.target.value }))}
                                className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">BARCODE</label>
                              <input type="text" value={editForm.barcode || ""}
                                onChange={e => setEditForm((f: any) => ({ ...f, barcode: e.target.value }))}
                                className="w-full px-2 py-1.5 rounded-xl text-bone text-xs font-mono transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">NOTES</label>
                              <input type="text" value={editForm.notes || ""}
                                onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))}
                                className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                            </div>
                          </div>
                          <div>
                            <label className="block font-mono text-xs text-steel mb-1">WEIGHT REMAINING: {editForm.weight_remaining_g}g</label>
                            <input type="range" min="0" max={spool.weight_full_g} value={editForm.weight_remaining_g}
                              onChange={e => setEditForm((f: any) => ({ ...f, weight_remaining_g: parseInt(e.target.value) }))}
                              className="w-full accent-amber" />
                            <div className="flex justify-between font-mono text-xs text-steel mt-0.5"><span>0g</span><span>{spool.weight_full_g}g</span></div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateSpool(spool.id, editForm)} disabled={saving}
                              className="px-4 py-1.5 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>SAVE</button>
                            <button onClick={() => setEditId(null)} className="px-4 py-1.5 rounded-xl font-mono text-xs text-steel hover:text-bone cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>CANCEL</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <ColorSwatch hex={spool.color_hex || "#6b7280"} size={16} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-sm">{spool.brand} · {spool.color}</span>
                              {spool.sheen && spool.sheen !== "Standard" && (
                                <span className="font-mono text-xs text-steel/70 px-1.5 py-0.5 rounded-md" style={innerCell}>{spool.sheen}</span>
                              )}
                              {spool.glow_in_dark && (
                                <span className="font-mono text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(134,239,172,0.10)", color: "#86efac" }}>✦ Glow</span>
                              )}
                              {spool.barcode && <span className="font-mono text-xs text-steel px-1.5 py-0.5 rounded-md" style={innerCell}>{spool.barcode}</span>}
                              {isLow && <span className="font-mono text-xs text-red-400 px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.10)" }}>LOW</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct < 20 ? "#ef4444" : pct < 50 ? "#f59e0b" : "#22c55e" }} />
                              </div>
                              <span className={`font-mono text-xs flex-shrink-0 ${isLow ? "text-red-400" : "text-steel"}`}>{Number(spool.weight_remaining_g).toFixed(0)}g / {spool.weight_full_g}g</span>
                              <span className="font-mono text-xs text-steel flex-shrink-0">{pct.toFixed(0)}%</span>
                            </div>
                            {spool.notes && <div className="font-mono text-xs text-steel/60 mt-1">{spool.notes}</div>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {spool.purchase_price && <span className="font-mono text-xs text-steel">{fc(spool.purchase_price)}</span>}
                            <button onClick={() => { setEditId(spool.id); setEditForm({ ...spool }); }} className="text-steel hover:text-amber transition-colors cursor-pointer"><Edit2 size={14} /></button>
                            <button onClick={() => deleteSpool(spool.id)} className="text-steel hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SHIPPING BOXES
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-display font-extrabold text-lg">Shipping Boxes</div>
          <div className="font-mono text-xs text-steel">{boxes.length} size{boxes.length !== 1 ? "s" : ""} · {totalBoxes} total in stock</div>
        </div>
        <button onClick={() => setShowAddBox(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
          <Plus size={14} /> ADD BOX
        </button>
      </div>

      {/* Add box form */}
      {showAddBox && (
        <div className="rounded-xl p-5 mb-4" style={{ ...glass, border: "1px solid rgba(255,181,71,0.40)" }}>
          <div className="font-mono text-xs text-amber tracking-widest mb-4 flex items-center justify-between">
            ADD SHIPPING BOX
            <button onClick={() => setShowAddBox(false)} className="text-steel hover:text-bone cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="block font-mono text-xs text-steel mb-1">NAME / SIZE LABEL</label>
              <input type="text" placeholder='e.g. "6×6×6 Small Cube"' value={boxForm.name}
                onChange={e => setBoxForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">QTY IN STOCK</label>
              <input type="number" min="0" value={boxForm.quantity}
                onChange={e => setBoxForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">COST EACH ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={boxForm.cost_each}
                onChange={e => setBoxForm(f => ({ ...f, cost_each: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block font-mono text-xs text-steel mb-1">LENGTH (in)</label>
              <input type="number" step="0.25" placeholder="0.00" value={boxForm.length_in}
                onChange={e => setBoxForm(f => ({ ...f, length_in: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">WIDTH (in)</label>
              <input type="number" step="0.25" placeholder="0.00" value={boxForm.width_in}
                onChange={e => setBoxForm(f => ({ ...f, width_in: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">HEIGHT (in)</label>
              <input type="number" step="0.25" placeholder="0.00" value={boxForm.height_in}
                onChange={e => setBoxForm(f => ({ ...f, height_in: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">NOTES</label>
              <input type="text" placeholder="Optional" value={boxForm.notes}
                onChange={e => setBoxForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
          </div>
          <button onClick={addBox} disabled={savingBox || !boxForm.name || !boxForm.length_in || !boxForm.width_in || !boxForm.height_in}
            className="px-6 py-2.5 rounded-xl font-display font-bold text-sm text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            {savingBox ? "SAVING…" : "ADD BOX"}
          </button>
        </div>
      )}

      {/* Box list */}
      {boxes.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={glass}>
          <Box size={36} className="mx-auto mb-3 text-bone/20" />
          <div className="font-display text-lg text-bone/40 mb-1">No boxes yet</div>
          <div className="font-mono text-xs text-steel/50">Add your shipping box sizes to track stock and link them to orders</div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={glass}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="font-mono text-xs text-amber tracking-widest">BOX INVENTORY</div>
          </div>
          <div>
            {boxes.map(box => {
              const isEditing = editBoxId === box.id;
              const isLow = box.quantity < 3;
              return (
                <div key={box.id} className="px-5 py-4 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="md:col-span-2">
                          <label className="block font-mono text-xs text-steel mb-1">NAME</label>
                          <input type="text" value={editBoxForm.name}
                            onChange={e => setEditBoxForm((f: any) => ({ ...f, name: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                        </div>
                        <div>
                          <label className="block font-mono text-xs text-steel mb-1">QTY</label>
                          <input type="number" min="0" value={editBoxForm.quantity}
                            onChange={e => setEditBoxForm((f: any) => ({ ...f, quantity: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                        </div>
                        <div>
                          <label className="block font-mono text-xs text-steel mb-1">COST EACH ($)</label>
                          <input type="number" step="0.01" value={editBoxForm.cost_each || ""}
                            onChange={e => setEditBoxForm((f: any) => ({ ...f, cost_each: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        <div>
                          <label className="block font-mono text-xs text-steel mb-1">L (in)</label>
                          <input type="number" step="0.25" value={editBoxForm.length_in}
                            onChange={e => setEditBoxForm((f: any) => ({ ...f, length_in: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                        </div>
                        <div>
                          <label className="block font-mono text-xs text-steel mb-1">W (in)</label>
                          <input type="number" step="0.25" value={editBoxForm.width_in}
                            onChange={e => setEditBoxForm((f: any) => ({ ...f, width_in: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                        </div>
                        <div>
                          <label className="block font-mono text-xs text-steel mb-1">H (in)</label>
                          <input type="number" step="0.25" value={editBoxForm.height_in}
                            onChange={e => setEditBoxForm((f: any) => ({ ...f, height_in: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                        </div>
                        <div>
                          <label className="block font-mono text-xs text-steel mb-1">NOTES</label>
                          <input type="text" value={editBoxForm.notes || ""}
                            onChange={e => setEditBoxForm((f: any) => ({ ...f, notes: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-xl text-bone text-xs transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateBox(box.id)} disabled={savingBox}
                          className="px-4 py-1.5 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>SAVE</button>
                        <button onClick={() => setEditBoxId(null)} className="px-4 py-1.5 rounded-xl font-mono text-xs text-steel hover:text-bone cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>CANCEL</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <Box size={16} className="text-steel flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-sm">{box.name}</span>
                          <span className="font-mono text-xs text-steel/60">{box.length_in}″ × {box.width_in}″ × {box.height_in}″</span>
                          {box.cost_each && <span className="font-mono text-xs text-steel">{fc(box.cost_each)} ea</span>}
                          {isLow && box.quantity > 0 && <span className="font-mono text-xs text-amber px-1.5 py-0.5 rounded-md" style={{ background: "rgba(245,158,11,0.10)" }}>LOW</span>}
                          {box.quantity === 0 && <span className="font-mono text-xs text-red-400 px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.10)" }}>OUT</span>}
                        </div>
                        {box.notes && <div className="font-mono text-xs text-steel/50">{box.notes}</div>}
                      </div>
                      {/* Quick ± quantity */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => adjustQty(box.id, -1)} disabled={box.quantity <= 0}
                          className="w-7 h-7 rounded-lg font-mono text-sm font-bold transition-colors cursor-pointer disabled:opacity-30"
                          style={innerCell}>−</button>
                        <span className={`font-mono text-sm font-bold w-8 text-center ${isLow ? "text-amber" : box.quantity === 0 ? "text-red-400" : "text-bone"}`}>{box.quantity}</span>
                        <button onClick={() => adjustQty(box.id, 1)}
                          className="w-7 h-7 rounded-lg font-mono text-sm font-bold transition-colors cursor-pointer"
                          style={innerCell}>+</button>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => { setEditBoxId(box.id); setEditBoxForm({ ...box }); }} className="text-steel hover:text-amber transition-colors cursor-pointer"><Edit2 size={14} /></button>
                        <button onClick={() => deleteBox(box.id)} className="text-steel hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
