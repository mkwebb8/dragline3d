"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Scan, Package, RefreshCw } from "lucide-react";

const MATERIALS = ["PLA","PETG","TPU","ABS","ASA","PET-GF15","PETG-ESD","PA","ASA-CF","PETG-CF","PA-CF","PCTG"];
const BRANDS = ["Sunlu","Bambu","eSUN","Hatchbox","Polymaker","Fiberon","Prusament","Overture","Generic","Other"];

const SWATCH_COLORS = [
  {name:"Midnight Black",hex:"#1a1a1a"},{name:"White",hex:"#f5f5f5"},{name:"Gray",hex:"#6b7280"},
  {name:"Red",hex:"#ef4444"},{name:"Blue",hex:"#3b82f6"},{name:"Green",hex:"#22c55e"},
  {name:"Yellow",hex:"#eab308"},{name:"Orange",hex:"#f97316"},{name:"Purple",hex:"#8b5cf6"},
  {name:"Pink",hex:"#ec4899"},{name:"Teal",hex:"#14b8a6"},{name:"Brown",hex:"#92400e"},
  {name:"Transparent",hex:"#e5e7eb"},{name:"Silk Gold",hex:"#d4af37"},{name:"Silk Silver",hex:"#c0c0c0"},
];

export default function InventoryPage() {
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    brand: "Sunlu", material: "PLA", color: "Midnight Black", color_hex: "#1a1a1a",
    weight_full_g: 1000, weight_remaining_g: 1000, cost_per_kg: 16,
    purchase_price: "", barcode: "", notes: ""
  });

  const [editForm, setEditForm] = useState<any>({});

  const fetchData = useCallback(async () => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t); setLoading(true);
    const [spoolRes, priceRes] = await Promise.all([
      fetch("/api/admin/inventory", { headers: { Authorization: `Bearer ${t}` } }),
      fetch("/api/admin/inventory/pricing", { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    if (spoolRes.ok) setSpools(await spoolRes.json());
    if (priceRes.ok) {
      const rows = await priceRes.json();
      const map: Record<string, number> = {};
      for (const r of rows) map[r.material] = r.cost_per_kg;
      setPricing(map);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addSpool() {
    setSaving(true);
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { await fetchData(); setShowAdd(false); setForm({ brand:"Sunlu",material:"PLA",color:"Midnight Black",color_hex:"#1a1a1a",weight_full_g:1000,weight_remaining_g:1000,cost_per_kg:16,purchase_price:"",barcode:"",notes:"" }); }
    setSaving(false);
  }

  async function updateSpool(id: string, updates: any) {
    setSaving(true);
    await fetch(`/api/admin/inventory/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await fetchData();
    setEditId(null);
    setSaving(false);
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
    setEditingPrice(null);
    setSaving(false);
  }

  async function startScan() {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) { setScanning(false); alert("Camera access denied"); }
  }

  function stopScan(barcode?: string) {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    if (barcode) setForm(f => ({ ...f, barcode }));
  }

  // Group spools by material
  const byMaterial: Record<string, any[]> = {};
  for (const s of spools) {
    if (!byMaterial[s.material]) byMaterial[s.material] = [];
    byMaterial[s.material].push(s);
  }

  const totalSpools = spools.length;
  const totalWeight = spools.reduce((s, sp) => s + Number(sp.weight_remaining_g || 0), 0);
  const lowStock = spools.filter(s => Number(s.weight_remaining_g) < Number(s.weight_full_g) * 0.2);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-16 text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <div className="font-display font-extrabold text-xl">Filament Inventory</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D · {totalSpools} spools · {(totalWeight/1000).toFixed(2)}kg total</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone transition-colors"><RefreshCw size={16} /></button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-3 py-2 rounded-sm bg-amber text-ironworks font-mono text-xs font-bold hover:opacity-90 transition-colors"><Plus size={14}/> ADD SPOOL</button>
        </div>
      </div>

      {/* Low stock warning */}
      {lowStock.length > 0 && (
        <div className="mb-6 rounded-sm border border-red-500/30 bg-red-500/5 px-4 py-3 flex items-center gap-3">
          <Package size={14} className="text-red-400" />
          <span className="font-mono text-xs text-red-400">LOW STOCK: {lowStock.map(s => `${s.brand} ${s.material} ${s.color}`).join(", ")}</span>
        </div>
      )}

      {/* Material pricing editor */}
      <div className="bg-ironworks2 border border-ironworks3 rounded-sm mb-6">
        <div className="px-5 py-4 border-b border-ironworks3">
          <div className="font-mono text-xs text-amber tracking-widest">MATERIAL PRICING ($/kg)</div>
        </div>
        <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {MATERIALS.map(mat => (
            <div key={mat} className="bg-ironworks rounded-sm p-2">
              <div className="font-mono text-xs text-steel mb-1">{mat}</div>
              {editingPrice === mat ? (
                <div className="flex items-center gap-1">
                  <input type="number" step="0.01" value={priceEdit} onChange={e => setPriceEdit(e.target.value)}
                    className="w-full px-1.5 py-1 rounded-sm bg-ironworks2 border border-amber focus:outline-none text-bone text-xs font-mono" autoFocus />
                  <button onClick={() => updatePrice(mat, parseFloat(priceEdit))} className="text-green-400 hover:text-green-300"><Save size={12}/></button>
                  <button onClick={() => setEditingPrice(null)} className="text-steel hover:text-bone"><X size={12}/></button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-amber">${pricing[mat]?.toFixed(2) || "—"}</span>
                  <button onClick={() => { setEditingPrice(mat); setPriceEdit(String(pricing[mat] || "")); }} className="text-steel hover:text-amber"><Edit2 size={10}/></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add spool form */}
      {showAdd && (
        <div className="bg-ironworks2 border border-amber/40 rounded-sm p-5 mb-6">
          <div className="font-mono text-xs text-amber tracking-widest mb-4 flex items-center justify-between">
            ADD NEW SPOOL
            <button onClick={() => setShowAdd(false)} className="text-steel hover:text-bone"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block font-mono text-xs text-steel mb-1">BRAND</label>
              <select value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm">
                {BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">MATERIAL</label>
              <select value={form.material} onChange={e => setForm(f => ({...f, material: e.target.value, cost_per_kg: pricing[e.target.value] || 16}))} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm">
                {MATERIALS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">COLOR</label>
              <select value={form.color} onChange={e => { const c = SWATCH_COLORS.find(s => s.name === e.target.value); setForm(f => ({...f, color: e.target.value, color_hex: c?.hex || "#ffffff"})); }} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm">
                {SWATCH_COLORS.map(c => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">SPOOL WEIGHT (g)</label>
              <select value={form.weight_full_g} onChange={e => setForm(f => ({...f, weight_full_g: parseInt(e.target.value), weight_remaining_g: parseInt(e.target.value)}))} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm">
                <option value={250}>250g</option>
                <option value={500}>500g</option>
                <option value={1000}>1kg</option>
                <option value={2000}>2kg</option>
                <option value={5000}>5kg</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">REMAINING (g)</label>
              <input type="number" value={form.weight_remaining_g} onChange={e => setForm(f => ({...f, weight_remaining_g: parseInt(e.target.value)}))} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">PURCHASE PRICE ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.purchase_price} onChange={e => setForm(f => ({...f, purchase_price: e.target.value}))} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1">BARCODE</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Scan or type" value={form.barcode} onChange={e => setForm(f => ({...f, barcode: e.target.value}))} className="flex-1 px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm font-mono" />
                <button onClick={startScan} className="px-3 py-2 rounded-sm border border-ironworks3 hover:border-amber text-steel hover:text-amber transition-colors"><Scan size={14}/></button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block font-mono text-xs text-steel mb-1">NOTES</label>
              <input type="text" placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" />
            </div>
          </div>

          {/* Camera scanner */}
          {scanning && (
            <div className="mb-4">
              <div className="rounded-sm overflow-hidden border border-ironworks3 mb-2" style={{height: 200}}>
                <video ref={videoRef} className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter barcode manually" onKeyDown={e => { if (e.key === "Enter") stopScan((e.target as HTMLInputElement).value); }} className="flex-1 px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm font-mono" autoFocus />
                <button onClick={() => stopScan()} className="px-3 py-2 rounded-sm border border-ironworks3 text-steel hover:text-bone">Cancel</button>
              </div>
              <div className="font-mono text-xs text-steel mt-1">Point camera at barcode, then type the number above and press Enter</div>
            </div>
          )}

          <button onClick={addSpool} disabled={saving} className="px-6 py-2.5 rounded-sm bg-amber text-ironworks font-display font-bold text-sm hover:opacity-90 transition-colors disabled:opacity-50">
            {saving ? "SAVING..." : "ADD SPOOL"}
          </button>
        </div>
      )}

      {/* Spool list by material */}
      {spools.length === 0 ? (
        <div className="text-center py-20 text-bone/40">
          <Package size={40} className="mx-auto mb-4 opacity-30" />
          <div className="font-display text-2xl mb-2">No spools yet</div>
          <div className="font-mono text-xs">Add your first spool to get started</div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byMaterial).sort().map(([mat, matSpools]) => (
            <div key={mat} className="bg-ironworks2 border border-ironworks3 rounded-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-ironworks3 flex items-center justify-between">
                <div className="font-mono text-xs text-amber tracking-widest">{mat}</div>
                <div className="font-mono text-xs text-steel">{matSpools.length} spool{matSpools.length !== 1 ? "s" : ""} · {(matSpools.reduce((s, sp) => s + Number(sp.weight_remaining_g), 0)/1000).toFixed(3)}kg remaining</div>
              </div>
              <div className="divide-y divide-ironworks3">
                {matSpools.map(spool => {
                  const pct = Math.max(0, Math.min(100, (Number(spool.weight_remaining_g) / Number(spool.weight_full_g)) * 100));
                  const isLow = pct < 20;
                  const isEditing = editId === spool.id;
                  return (
                    <div key={spool.id} className="px-5 py-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">BRAND</label>
                              <select value={editForm.brand} onChange={e => setEditForm((f: any) => ({...f, brand: e.target.value}))} className="w-full px-2 py-1.5 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-xs">
                                {BRANDS.map(b => <option key={b}>{b}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">COLOR</label>
                              <select value={editForm.color} onChange={e => { const c = SWATCH_COLORS.find(s => s.name === e.target.value); setEditForm((f: any) => ({...f, color: e.target.value, color_hex: c?.hex || "#ffffff"})); }} className="w-full px-2 py-1.5 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-xs">
                                {SWATCH_COLORS.map(c => <option key={c.name}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">REMAINING (g)</label>
                              <input type="number" value={editForm.weight_remaining_g} onChange={e => setEditForm((f: any) => ({...f, weight_remaining_g: parseFloat(e.target.value)}))} className="w-full px-2 py-1.5 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-xs" />
                            </div>
                            <div>
                              <label className="block font-mono text-xs text-steel mb-1">BARCODE</label>
                              <input type="text" value={editForm.barcode||""} onChange={e => setEditForm((f: any) => ({...f, barcode: e.target.value}))} className="w-full px-2 py-1.5 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-xs font-mono" />
                            </div>
                          </div>
                          <div>
                            <label className="block font-mono text-xs text-steel mb-1">NOTES</label>
                            <input type="text" value={editForm.notes||""} onChange={e => setEditForm((f: any) => ({...f, notes: e.target.value}))} className="w-full px-2 py-1.5 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-xs" />
                          </div>
                          {/* Weight slider */}
                          <div>
                            <label className="block font-mono text-xs text-steel mb-1">WEIGHT REMAINING: {editForm.weight_remaining_g}g</label>
                            <input type="range" min="0" max={spool.weight_full_g} value={editForm.weight_remaining_g} onChange={e => setEditForm((f: any) => ({...f, weight_remaining_g: parseInt(e.target.value)}))} className="w-full accent-amber" />
                            <div className="flex justify-between font-mono text-xs text-steel mt-0.5"><span>0g</span><span>{spool.weight_full_g}g</span></div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateSpool(spool.id, editForm)} disabled={saving} className="px-4 py-1.5 bg-amber text-ironworks font-mono text-xs font-bold rounded-sm hover:opacity-90 disabled:opacity-50">SAVE</button>
                            <button onClick={() => setEditId(null)} className="px-4 py-1.5 border border-ironworks3 text-steel font-mono text-xs rounded-sm hover:text-bone">CANCEL</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full flex-shrink-0 border border-ironworks3" style={{ background: spool.color_hex || "#6b7280" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{spool.brand} · {spool.color}</span>
                              {spool.barcode && <span className="font-mono text-xs text-steel bg-ironworks px-1.5 py-0.5 rounded-sm">{spool.barcode}</span>}
                              {isLow && <span className="font-mono text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-sm">LOW</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-ironworks rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct < 20 ? "#ef4444" : pct < 50 ? "#f59e0b" : "#22c55e" }} />
                              </div>
                              <span className={`font-mono text-xs flex-shrink-0 ${isLow ? "text-red-400" : "text-steel"}`}>{Number(spool.weight_remaining_g).toFixed(0)}g / {spool.weight_full_g}g</span>
                              <span className="font-mono text-xs text-steel flex-shrink-0">{pct.toFixed(0)}%</span>
                            </div>
                            {spool.notes && <div className="font-mono text-xs text-steel/60 mt-1">{spool.notes}</div>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {spool.purchase_price && <span className="font-mono text-xs text-steel">{fc(spool.purchase_price)}</span>}
                            <button onClick={() => { setEditId(spool.id); setEditForm({...spool}); }} className="text-steel hover:text-amber transition-colors"><Edit2 size={14}/></button>
                            <button onClick={() => deleteSpool(spool.id)} className="text-steel hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
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
    </div>
  );
}

function fc(n: any) { return `$${Number(n).toFixed(2)}`; }
