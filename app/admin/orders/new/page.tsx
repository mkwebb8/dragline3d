"use client";
export const runtime = "edge";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Truck, Save, AlertCircle, Package } from "lucide-react";
import { parseSTL, computeVolume, MATERIALS, QUALITIES, MATERIAL_COLORS, type MaterialKey, type QualityKey } from "@/lib/stl";
import { parse3MF } from "@/lib/parse3mf";
import * as THREE from "three";
import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const inputSt: CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" };

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
  e.currentTarget.style.boxShadow = "none";
}

type Stats = { dims: { x: number; y: number; z: number }; volumeMm3: number };
type Quote = { grams: number; hours: number; price: number; fromSlicer: boolean };
type CartItem = { id: string; file: File | null; fileName: string; material: MaterialKey; quality: QualityKey; infill: number; qty: number; color: string; stats: Stats; quote: Quote };
type ShippingRate = { id: string; provider: string; service: string; amount: number; days?: number };

function genId() { return Math.random().toString(36).slice(2, 10); }

const MATERIALS_LIST = Object.entries(MATERIALS) as [MaterialKey, any][];

export default function NewOrderPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [token, setToken] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [material, setMaterial] = useState<MaterialKey>("PLA");
  const [quality, setQuality] = useState<QualityKey>("standard");
  const [infill, setInfill] = useState(15);
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState("Midnight Black");
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [parsing, setParsing] = useState(false);
  const [slicerLoading, setSlicerLoading] = useState(false);
  const [slicerFailed, setSlicerFailed] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [zip, setZip] = useState("");

  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t);
  }, [router]);

  useEffect(() => {
    const colors = MATERIAL_COLORS[material];
    if (!colors.find((c: any) => c.name === color)) setColor(colors[0].name);
  }, [material]);

  const customerName = `${firstName} ${lastName}`.trim();
  const selectedRate = shippingRates.find(r => r.id === selectedRateId);
  const subtotal = cartItems.reduce((s, i) => s + i.quote.price * i.qty, 0);
  const taxAmount = Math.round(subtotal * 0.06 * 100) / 100;
  const shipping = selectedRate?.amount || 0;
  const total = subtotal + taxAmount + shipping;

  function runSlicer(f: File, mat: MaterialKey, q: QualityKey, inf: number) {
    setSlicerLoading(true); setSlicerFailed(false);
    const form = new FormData();
    form.append("stl", f); form.append("material", mat); form.append("quality", q); form.append("infill", String(inf));
    fetch("/api/slice", { method: "POST", body: form })
      .then(r => r.json())
      .then(data => {
        if (data.price && !data.fallback) setCurrentQuote({ grams: data.grams, hours: data.hours, price: data.price, fromSlicer: true });
        else setSlicerFailed(true);
      })
      .catch(() => setSlicerFailed(true))
      .finally(() => setSlicerLoading(false));
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    if (!/\.(stl|3mf)$/i.test(f.name)) { setFileError("STL or 3MF only."); return; }
    setFileError(null); setFile(f); setParsing(true); setStats(null); setCurrentQuote(null); setSlicerFailed(false);
    try {
      const buffer = await f.arrayBuffer();
      const geo = /\.3mf$/i.test(f.name) ? await parse3MF(buffer) : parseSTL(buffer);
      geo.computeBoundingBox();
      const size = new THREE.Vector3(); geo.boundingBox!.getSize(size);
      const s: Stats = { dims: { x: size.x, y: size.y, z: size.z }, volumeMm3: computeVolume(geo) };
      setStats(s); runSlicer(f, material, quality, infill);
    } catch { setFileError("Could not parse file."); }
    setParsing(false);
  }

  function addToCart() {
    if (!file || !stats || !currentQuote?.fromSlicer) return;
    setCartItems(prev => [...prev, { id: genId(), file, fileName: file.name, material, quality, infill, qty, color, stats, quote: currentQuote }]);
    setFile(null); setStats(null); setCurrentQuote(null); setSlicerFailed(false);
    setMaterial("PLA"); setQuality("standard"); setInfill(15); setQty(1); setColor("Midnight Black");
    setShippingRates([]); setSelectedRateId(null);
  }

  function removeFromCart(id: string) {
    setCartItems(prev => prev.filter(i => i.id !== id));
    setShippingRates([]); setSelectedRateId(null);
  }

  async function getShippingRates() {
    if (!firstName || !lastName || !address || !city || !stateField || !zip) { setRateError("Fill in all shipping fields first."); return; }
    setFetchingRates(true); setRateError(null); setShippingRates([]); setSelectedRateId(null);
    const totalGrams = cartItems.reduce((s, i) => s + i.quote.grams * i.qty, 0);
    try {
      const res = await fetch("/api/shipping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toName: customerName, toStreet: address, toCity: city, toState: stateField, toZip: zip, weightGrams: totalGrams }) });
      const data = await res.json();
      if (!res.ok || !data.rates) throw new Error(data.error || "Rate calculation failed");
      setShippingRates(data.rates);
      if (data.rates.length > 0) setSelectedRateId(data.rates[0].id);
    } catch (e: any) { setRateError(e.message || "Could not get rates"); }
    setFetchingRates(false);
  }

  async function handleSubmit() {
    if (cartItems.length === 0) { setSubmitError("Add at least one part."); return; }
    if (!firstName || !lastName || !email || !address || !city || !stateField || !zip) { setSubmitError("Fill in all customer fields."); return; }
    if (!selectedRate && shippingRates.length > 0) { setSubmitError("Select a shipping option."); return; }
    setSubmitting(true); setSubmitError(null);
    const orderId = `DL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const dbItems = cartItems.map(i => ({ file_name: i.fileName, material: i.material, quality: i.quality, infill: i.infill, grams: i.quote.grams, hours: i.quote.hours, price: i.quote.price, qty: i.qty, color: i.color }));
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, customer_name: customerName, customer_email: email, address, city, state: stateField, zip, shipping_service: selectedRate?.service || "", shipping_cost: shipping, subtotal, total, status: "received", items: dbItems }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to create order"); }
      router.push(`/admin/orders/${orderId}`);
    } catch (e: any) { setSubmitError(e.message || "Something went wrong."); }
    setSubmitting(false);
  }

  const availableColors = MATERIAL_COLORS[material];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors cursor-pointer"><ArrowLeft size={20} /></Link>
        <div>
          <div className="font-mono text-xs text-amber font-bold">NEW ORDER</div>
          <div className="font-display font-extrabold text-2xl">Manual Entry</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        {/* Left: file upload + part config */}
        <div className="xl:col-span-3 space-y-6">
          {/* File upload */}
          <div onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-xl flex flex-col items-center justify-center gap-4 p-10 transition-colors hover:opacity-90"
            style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.09)" }}>
            <input ref={inputRef} type="file" accept=".stl,.3mf" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            <div className="rounded-full grid place-items-center w-14 h-14" style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
              <Plus size={24} color="#0f0f10" />
            </div>
            <div className="text-center">
              <div className="font-display font-bold text-lg">{cartItems.length > 0 ? "Add another part" : "Upload STL or 3MF"}</div>
              <div className="font-mono text-xs text-steel mt-1">click to browse</div>
            </div>
            {fileError && <div className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} />{fileError}</div>}
          </div>

          {/* Part config */}
          {stats && file && (
            <div className="rounded-xl p-5" style={glass}>
              <div className="font-mono text-xs text-amber tracking-widest mb-4 flex items-center gap-2"><Package size={12} />Configure: {file.name}</div>

              <div className="mb-4">
                <div className="font-mono text-xs text-steel mb-2 tracking-wider">MATERIAL</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MATERIALS_LIST.map(([key, m]) => (
                    <button key={key} onClick={() => { setMaterial(key); if (file) runSlicer(file, key, quality, infill); }}
                      className="p-2 rounded-xl text-left transition-all cursor-pointer"
                      style={material === key
                        ? { border: "1px solid #ffb547", background: "rgba(255,181,71,0.08)" }
                        : { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ background: m.swatch }} />
                        <span className="font-display font-bold text-xs">{m.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="font-mono text-xs text-steel mb-2 tracking-wider">COLOR — {color}</div>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((c: any) => (
                    <button key={c.name} title={c.name} onClick={() => setColor(c.name)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${color === c.name ? "scale-110" : ""}`}
                      style={{ background: c.hex, borderColor: color === c.name ? "#ffb547" : "rgba(255,255,255,0.15)" }} />
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="font-mono text-xs text-steel mb-2 tracking-wider">LAYER HEIGHT</div>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(QUALITIES) as [QualityKey, any][]).map(([key, q]) => (
                    <button key={key} onClick={() => { setQuality(key); if (file) runSlicer(file, material, key, infill); }}
                      className="p-2 rounded-xl text-center transition-all cursor-pointer"
                      style={quality === key
                        ? { border: "1px solid #ffb547", background: "rgba(255,181,71,0.08)" }
                        : { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                      <div className="font-mono font-semibold text-sm text-amber">{q.label}<span className="text-xs text-steel">mm</span></div>
                      <div className="text-xs text-bone/50">{q.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <div className="font-mono text-xs text-steel tracking-wider">INFILL</div>
                  <div className="font-mono text-xs text-amber font-bold">{infill}%</div>
                </div>
                <input type="range" min="5" max="100" step="5" value={infill}
                  onChange={e => { const v = +e.target.value; setInfill(v); if (file) runSlicer(file, material, quality, v); }}
                  className="w-full accent-amber" />
              </div>

              <div className="mb-5">
                <div className="font-mono text-xs text-steel mb-2 tracking-wider">QUANTITY</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-xl text-bone/60 hover:text-bone flex items-center justify-center cursor-pointer transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><Minus size={12} /></button>
                  <span className="font-display font-bold text-lg w-8 text-center">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(50, q + 1))} className="w-8 h-8 rounded-xl text-bone/60 hover:text-bone flex items-center justify-center cursor-pointer transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)" }}><Plus size={12} /></button>
                </div>
              </div>

              {slicerFailed ? (
                <div className="w-full py-3 rounded-xl text-red-400 font-mono text-xs text-center flex items-center justify-center gap-2" style={{ border: "1px solid rgba(239,68,68,0.50)" }}>
                  <AlertCircle size={12} />SLICER UNAVAILABLE — check TrueNAS tunnel
                </div>
              ) : (
                <button onClick={addToCart} disabled={slicerLoading || !currentQuote?.fromSlicer}
                  className="w-full py-3 rounded-xl font-display font-bold text-ironworks flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
                  {slicerLoading ? (
                    <><span className="inline-block w-4 h-4 border-2 border-ironworks/30 border-t-ironworks rounded-full animate-spin" />SLICING…</>
                  ) : currentQuote?.fromSlicer ? (
                    <><ShoppingCart size={16} />ADD TO ORDER — ${(currentQuote.price * qty).toFixed(2)}</>
                  ) : (
                    <><span className="inline-block w-4 h-4 border-2 border-ironworks/30 border-t-ironworks rounded-full animate-spin" />CALCULATING…</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Cart */}
          {cartItems.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={glass}>
              <div className="px-5 py-4 border-b flex items-center justify-between font-mono text-xs text-amber tracking-widest" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <span>PARTS ({cartItems.length})</span>
                <span className="text-bone">${subtotal.toFixed(2)}</span>
              </div>
              <div>
                {cartItems.map(item => (
                  <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.fileName.replace(/\.(stl|3mf)$/i, "")}</div>
                      <div className="font-mono text-xs text-steel">{item.material} · {item.color} · {item.quality} · {item.infill}% · {item.quote.grams}g · {item.quote.hours}h</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-display font-bold text-amber">${(item.quote.price * item.qty).toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.id)} className="text-steel hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: customer + shipping + submit */}
        <div className="xl:col-span-2 space-y-4">
          {/* Customer */}
          <div className="rounded-xl p-5" style={glass}>
            <div className="font-mono text-xs text-amber tracking-widest mb-4">CUSTOMER</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs text-steel mb-1">FIRST NAME</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First"
                    className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
                    style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div>
                  <label className="block font-mono text-xs text-steel mb-1">LAST NAME</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last"
                    className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
                    style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                </div>
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@email.com"
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
                  style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="rounded-xl p-5" style={glass}>
            <div className="font-mono text-xs text-amber tracking-widest mb-4 flex items-center gap-2"><Truck size={12} />SHIPPING</div>
            <div className="space-y-3">
              <div>
                <label className="block font-mono text-xs text-steel mb-1">ADDRESS</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St"
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
                  style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block font-mono text-xs text-steel mb-1">CITY</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="Louisville"
                    className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
                    style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div>
                  <label className="block font-mono text-xs text-steel mb-1">STATE</label>
                  <input value={stateField} onChange={e => setStateField(e.target.value)} maxLength={2} placeholder="KY"
                    className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
                    style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div>
                  <label className="block font-mono text-xs text-steel mb-1">ZIP</label>
                  <input value={zip} onChange={e => setZip(e.target.value)} placeholder="40201"
                    className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
                    style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                </div>
              </div>
              <button onClick={getShippingRates} disabled={fetchingRates || cartItems.length === 0}
                className="w-full py-2.5 rounded-xl font-display font-bold text-sm text-amber border cursor-pointer transition-colors hover:bg-amber hover:text-ironworks disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ borderColor: "#ffb547" }}>
                {fetchingRates ? (<><span className="inline-block w-4 h-4 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />Getting rates…</>) : "GET SHIPPING RATES"}
              </button>
              {rateError && <div className="text-red-400 text-xs">{rateError}</div>}
              {shippingRates.length > 0 && (
                <div className="space-y-2">
                  {shippingRates.map(rate => (
                    <label key={rate.id}
                      className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all"
                      style={selectedRateId === rate.id
                        ? { border: "1px solid #ffb547", background: "rgba(255,181,71,0.05)" }
                        : { border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="shipping" value={rate.id} checked={selectedRateId === rate.id} onChange={() => setSelectedRateId(rate.id)} className="accent-amber" />
                        <div>
                          <div className="text-sm font-medium">{rate.service}</div>
                          <div className="font-mono text-xs text-steel">{rate.provider}{rate.days ? ` · ${rate.days} days` : ""}</div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-amber">${rate.amount.toFixed(2)}</div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Total + submit */}
          {cartItems.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "rgba(255,181,71,0.12)", border: "1px solid rgba(255,181,71,0.25)", boxShadow: "0 0 40px rgba(255,181,71,0.08)" }}>
              <div className="space-y-1.5 font-mono text-sm mb-4">
                <div className="flex justify-between"><span className="text-bone/60">Parts ({cartItems.reduce((s, i) => s + i.qty, 0)})</span><span className="font-bold">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-bone/60">KY Sales Tax (6%)</span><span className="font-bold">${taxAmount.toFixed(2)}</span></div>
                {selectedRate && <div className="flex justify-between"><span className="text-bone/60">Shipping</span><span className="font-bold">${shipping.toFixed(2)}</span></div>}
              </div>
              <div className="font-display font-black text-5xl leading-none mb-5 text-bone" style={{ letterSpacing: "-0.04em" }}>${total.toFixed(2)}</div>
              <button onClick={handleSubmit} disabled={submitting || cartItems.length === 0}
                className="w-full py-3 rounded-xl font-display font-bold text-ironworks flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
                <Save size={16} />{submitting ? "CREATING…" : "CREATE ORDER"}
              </button>
              {submitError && <div className="mt-3 text-sm text-red-400 font-mono text-center">{submitError}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
