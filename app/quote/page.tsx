"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, ShoppingCart, ArrowRight, AlertCircle, Package, Truck, DollarSign, Plus, Minus } from "lucide-react";
import { parseSTL, computeVolume, quoteFromGeometry, MATERIALS, QUALITIES, MATERIAL_COLORS, type MaterialKey, type QualityKey } from "@/lib/stl";
import { parse3MF } from "@/lib/parse3mf";
import dynamic from "next/dynamic";
import * as THREE from "three";

const STLViewer = dynamic(() => import("@/components/STLViewer").then(m => ({ default: m.STLViewer })), { ssr: false });

type Stats = { dims: { x: number; y: number; z: number }; volumeMm3: number };
type Quote = { grams: number; hours: number; price: number; fromSlicer: boolean; breakdown: { material: number; machine: number; setup: number } };
type CartItem = { id: string; file: File | null; fileName: string; material: MaterialKey; quality: QualityKey; infill: number; qty: number; color: string; stats: Stats; quote: Quote; geometry: any };
type ShippingRate = { id: string; provider: string; service: string; amount: number; currency: string; days?: number };

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function QuotePage() {
  const [file, setFile] = useState<File | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [material, setMaterial] = useState<MaterialKey>("PLA");
  const [quality, setQuality] = useState<QualityKey>("standard");
  const [infill, setInfill] = useState(15);
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState("Midnight Black");
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [slicerLoading, setSlicerLoading] = useState(false);
  const [slicerFailed, setSlicerFailed] = useState(false);
  const [slicerComplete, setSlicerComplete] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [zip, setZip] = useState("");
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const customerName = `${firstName} ${lastName}`.trim();

  useEffect(() => {
    const colors = MATERIAL_COLORS[material];
    if (!colors.find(c => c.name === color)) setColor(colors[0].name);
  }, [material]);

  useEffect(() => {
    const serializable = cartItems.map(i => ({
      id: i.id, fileName: i.fileName, material: i.material, quality: i.quality,
      infill: i.infill, qty: i.qty, color: i.color, stats: i.stats, quote: i.quote,
    }));
    localStorage.setItem("dragline_cart", JSON.stringify(serializable));
  }, [cartItems]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dragline_cart");
      if (saved) {
        const items = JSON.parse(saved);
        setCartItems(items.map((i: any) => ({ ...i, file: null, geometry: null })));
      }
    } catch {}
  }, []);

  const selectedRate = shippingRates.find(r => r.id === selectedRateId);
  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.quote.price * i.qty, 0);
  const taxAmount = Math.round(cartSubtotal * 0.06 * 100) / 100;
  const orderTotal = cartSubtotal + taxAmount + (selectedRate?.amount || 0);
  const totalHours = cartItems.reduce((s, i) => s + i.quote.hours * i.qty, 0);
  const totalLbs = cartItems.reduce((s, i) => s + i.quote.grams * i.qty, 0) / 453.592;

  function runSlicer(f: File, mat: MaterialKey, q: QualityKey, inf: number) {
    setSlicerLoading(true);
    setSlicerFailed(false);
    setSlicerComplete(false);
    const form = new FormData();
    form.append("stl", f);
    form.append("material", mat);
    form.append("quality", q);
    form.append("infill", String(inf));
    fetch("/api/slice", { method: "POST", body: form })
      .then(r => r.json())
      .then(data => {
        if (data.price && !data.fallback) {
          setCurrentQuote({ grams: data.grams, hours: data.hours, price: data.price, fromSlicer: true, breakdown: data.breakdown });
          setSlicerFailed(false);
        } else {
          setSlicerFailed(true);
        }
      })
      .catch(() => { setSlicerFailed(true); })
      .finally(() => { setSlicerLoading(false); setSlicerComplete(true); });
  }

  function recalc(s: Stats, mat: MaterialKey, q: QualityKey, inf: number) {
    if (slicerLoading) return;
    setCurrentQuote(quoteFromGeometry(s.volumeMm3, mat, q, inf));
    if (slicerComplete && file) runSlicer(file, mat, q, inf);
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    if (!/\.(stl|3mf)$/i.test(f.name)) { setFileError("STL or 3MF files only."); return; }
    setFileError(null); setFile(f); setParsing(true); setStats(null); setGeometry(null);
    setCurrentQuote(null); setSlicerFailed(false); setSlicerComplete(false);
    try {
      const buffer = await f.arrayBuffer();
      const geo = /\.3mf$/i.test(f.name) ? await parse3MF(buffer) : parseSTL(buffer);
      geo.computeBoundingBox();
      const size = new THREE.Vector3();
      geo.boundingBox!.getSize(size);
      const s: Stats = { dims: { x: size.x, y: size.y, z: size.z }, volumeMm3: computeVolume(geo) };
      setStats(s); setGeometry(geo);
      runSlicer(f, material, quality, infill);
    } catch { setFileError("Could not parse file."); }
    setParsing(false);
  }

  function addToCart() {
    if (!file || !stats || !currentQuote || !geometry || !currentQuote.fromSlicer) return;
    setCartItems(prev => [...prev, { id: genId(), file, fileName: file.name, material, quality, infill, qty, color, stats, quote: currentQuote, geometry }]);
    setFile(null); setGeometry(null); setStats(null); setCurrentQuote(null);
    setMaterial("PLA"); setQuality("standard"); setInfill(15); setQty(1); setColor("Midnight Black");
    setSlicerComplete(false); setSlicerFailed(false);
    setShippingRates([]); setSelectedRateId(null);
  }

  function updateQty(id: string, delta: number) {
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, Math.min(50, i.qty + delta)) } : i));
  }

  function removeFromCart(id: string) {
    setCartItems(prev => prev.filter(i => i.id !== id));
    setShippingRates([]); setSelectedRateId(null);
  }

  async function getShippingRates() {
    if (cartItems.length === 0) return;
    if (!firstName || !lastName || !address || !city || !stateField || !zip) {
      setRateError("Fill in all shipping fields first.");
      return;
    }
    setFetchingRates(true); setRateError(null); setShippingRates([]); setSelectedRateId(null);
    const totalGrams = cartItems.reduce((sum, i) => sum + i.quote.grams * i.qty, 0);
    try {
      const res = await fetch("/api/shipping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toName: customerName, toStreet: address, toCity: city, toState: stateField, toZip: zip, weightGrams: totalGrams }) });
      const data = await res.json();
      if (!res.ok || !data.rates) throw new Error(data.error || "Rate calculation failed");
      setShippingRates(data.rates);
      if (data.rates.length > 0) setSelectedRateId(data.rates[0].id);
    } catch (e: any) { setRateError(e.message || "Could not get rates"); }
    setFetchingRates(false);
  }

  async function handleCheckout() {
    if (cartItems.length === 0) return;
    if (!firstName || !lastName || !customerEmail || !address || !city || !stateField || !zip) {
      setCheckoutError("Please fill in all shipping fields.");
      return;
    }
    if (!selectedRate && shippingRates.length > 0) { setCheckoutError("Please select a shipping option."); return; }
    setCheckingOut(true); setCheckoutError(null);
    try {
      const notifyForm = new FormData();
      notifyForm.append("customerName", customerName); notifyForm.append("customerEmail", customerEmail);
      notifyForm.append("address", address); notifyForm.append("city", city);
      notifyForm.append("state", stateField); notifyForm.append("zip", zip);
      notifyForm.append("shippingLabel", selectedRate?.service || "Standard");
      notifyForm.append("shippingCost", String(selectedRate?.amount || 0));
      notifyForm.append("total", String(orderTotal));
      notifyForm.append("items", JSON.stringify(cartItems.map(i => ({ id: i.id, fileName: i.fileName, material: i.material, quality: i.quality, infill: i.infill, qty: i.qty, color: i.color, grams: i.quote.grams, hours: i.quote.hours, price: i.quote.price, lineTotal: i.quote.price * i.qty }))));
      for (const item of cartItems) { if (item.file) notifyForm.append(`file_${item.id}`, item.file); }
      fetch("/api/notify", { method: "POST", body: notifyForm }).catch(() => {});
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cartItems.map(i => ({ fileName: i.fileName, material: i.material, quality: i.quality, infill: i.infill, qty: i.qty, color: i.color, volumeMm3: i.stats.volumeMm3, price: i.quote.price })), shippingCost: selectedRate?.amount || 0, shippingLabel: selectedRate?.service || "", customerEmail, customerName }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e: any) { setCheckoutError(e.message || "Something went wrong."); setCheckingOut(false); }
  }

  const availableColors = MATERIAL_COLORS[material];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
      <div className="mb-10 max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">Dragline 3D · Quote &amp; Order</div>
        <h1 className="font-display font-black text-5xl md:text-6xl leading-[0.92] mb-4">Build your order<span className="text-amber">.</span></h1>
        <p className="text-bone/70 text-lg leading-relaxed max-w-xl">Upload STL or 3MF files, configure each part, add them to your cart, then checkout.</p>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          {!file ? (
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }} onClick={() => inputRef.current?.click()}
              className={`grid-bg cursor-pointer rounded-sm text-center transition-all flex flex-col items-center justify-center gap-4 ${dragOver ? "border-2 border-amber bg-ironworks2" : "border-2 border-dashed border-ironworks3 bg-ironworks2/50"}`}
              style={{ minHeight: 300, padding: "48px 32px" }}>
              <input ref={inputRef} type="file" accept=".stl,.3mf" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              <div className="rounded-full bg-amber grid place-items-center" style={{ width: 64, height: 64 }}><Plus size={28} color="#0f0f10" /></div>
              <div>
                <div className="font-display font-extrabold text-2xl mb-1">{cartItems.length > 0 ? "Add another part" : "Drop your file"}</div>
                <div className="text-bone/50 text-sm">or click to browse · .STL or .3MF</div>
              </div>
              {fileError && <div className="text-sm flex items-center gap-2 text-red-400"><AlertCircle size={14} /> {fileError}</div>}
            </div>
          ) : (
            <div>
              <div className="rounded-sm overflow-hidden border border-ironworks3" style={{ height: 380 }}>
                {parsing || !geometry ? (
                  <div className="h-full grid place-items-center bg-ironworks2">
                    <div className="text-center">
                      <div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin mb-3" />
                      <div className="font-mono text-xs tracking-widest text-steel">PARSING MESH...</div>
                    </div>
                  </div>
                ) : <STLViewer geometry={geometry} onStats={() => {}} />}
              </div>
              <div className="mt-2 flex justify-between items-center text-sm">
                <span className="font-mono text-xs text-steel">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <button onClick={() => { setFile(null); setGeometry(null); setStats(null); setCurrentQuote(null); setSlicerFailed(false); setSlicerComplete(false); }} className="text-steel hover:text-bone transition-colors underline text-xs">Remove</button>
              </div>
            </div>
          )}

          {stats && (
            <div className="rounded-sm p-6 bg-ironworks2 border border-ironworks3">
              <div className="font-mono text-xs uppercase tracking-widest mb-5 flex items-center gap-2 text-amber"><Package size={12} /> Configure this part</div>

              <div className="mb-5">
                <div className="font-display font-semibold text-sm mb-3 tracking-wide">MATERIAL</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {(Object.entries(MATERIALS) as [MaterialKey, typeof MATERIALS[MaterialKey]][]).map(([key, m]) => (
                    <button key={key} onClick={() => { setMaterial(key); recalc(stats, key, quality, infill); }}
                      className={`p-3 rounded-sm border text-left transition-all ${material === key ? "border-amber bg-ironworks" : "border-ironworks3 bg-ironworks hover:border-bone/30"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full border border-ironworks3 flex-shrink-0" style={{ background: m.swatch }} />
                        <span className="font-display font-bold text-sm">{m.label}</span>
                      </div>
                      <div className="text-xs text-bone/50 leading-tight">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="font-display font-semibold text-sm mb-3 tracking-wide flex items-center gap-2">
                  COLOR <span className="font-mono font-normal text-xs text-steel normal-case">{color}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map(c => (
                    <button key={c.name} title={c.name} onClick={() => setColor(c.name)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.name ? "border-amber scale-110" : "border-ironworks3 hover:border-bone/40"}`}
                      style={{ background: c.hex }} />
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="font-display font-semibold text-sm mb-3 tracking-wide">LAYER HEIGHT</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.entries(QUALITIES) as [QualityKey, typeof QUALITIES[QualityKey]][]).map(([key, q]) => (
                    <button key={key} onClick={() => { setQuality(key); recalc(stats, material, key, infill); }}
                      className={`p-3 rounded-sm border text-center transition-all ${quality === key ? "border-amber bg-ironworks" : "border-ironworks3 bg-ironworks hover:border-bone/30"}`}>
                      <div className="font-mono font-semibold text-base text-amber">{q.label}<span className="text-xs text-steel">mm</span></div>
                      <div className="text-xs mt-1 text-bone/50">{q.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="flex justify-between items-baseline mb-3">
                  <div className="font-display font-semibold text-sm tracking-wide">INFILL</div>
                  <div className="font-mono text-sm font-semibold text-amber">{infill}%</div>
                </div>
                <input type="range" min="5" max="100" step="5" value={infill} onChange={e => { const v = +e.target.value; setInfill(v); recalc(stats, material, quality, v); }} className="w-full" />
                <div className="flex justify-between font-mono text-xs mt-1 text-steel"><span>LIGHT</span><span>SOLID</span></div>
              </div>

              <div className="mb-6">
                <div className="font-display font-semibold text-sm mb-3 tracking-wide">QUANTITY</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-sm border border-ironworks3 bg-ironworks flex items-center justify-center hover:border-amber transition-colors"><Minus size={14} /></button>
                  <div className="font-display font-bold text-xl w-12 text-center">{qty}</div>
                  <button onClick={() => setQty(q => Math.min(50, q + 1))} className="w-9 h-9 rounded-sm border border-ironworks3 bg-ironworks flex items-center justify-center hover:border-amber transition-colors"><Plus size={14} /></button>
                  {qty > 1 && currentQuote?.fromSlicer && !slicerLoading && (
                    <div className="font-mono text-xs text-steel ml-2">${currentQuote.price.toFixed(2)} × {qty} = <span className="text-amber font-bold">${(currentQuote.price * qty).toFixed(2)}</span></div>
                  )}
                </div>
              </div>

              {slicerFailed ? (
                <div className="w-full py-4 rounded-sm border border-red-400/50 text-red-400 font-mono text-xs text-center flex items-center justify-center gap-2">
                  <AlertCircle size={14} /> SLICER UNAVAILABLE — cannot calculate price. Try again shortly.
                </div>
              ) : (
                <button onClick={addToCart} disabled={slicerLoading || !currentQuote?.fromSlicer}
                  className="w-full py-4 rounded-sm font-display font-bold flex items-center justify-center gap-3 bg-amber text-ironworks hover:bg-amber-dark transition-colors tracking-wide disabled:opacity-70 disabled:cursor-wait">
                  {slicerLoading ? (
                    <><span className="inline-block w-5 h-5 border-2 border-ironworks/30 border-t-ironworks rounded-full animate-spin"/> CALCULATING...</>
                  ) : currentQuote?.fromSlicer ? (
                    <><ShoppingCart size={18}/> ADD TO CART — ${(currentQuote.price * qty).toFixed(2)}{qty > 1 ? ` (${qty}×)` : ""}</>
                  ) : (
                    <><span className="inline-block w-5 h-5 border-2 border-ironworks/30 border-t-ironworks rounded-full animate-spin"/> CALCULATING...</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-sm border border-ironworks3 bg-ironworks2">
            <div className="px-5 py-4 border-b border-ironworks3 flex items-center justify-between">
              <div className="font-display font-bold text-lg flex items-center gap-2">
                <ShoppingCart size={18} className="text-amber" />
                Cart {cartItems.length > 0 && <span className="bg-amber text-ironworks text-xs font-mono px-2 py-0.5 rounded-full">{cartItems.length}</span>}
              </div>
              {cartItems.length > 0 && <div className="font-mono text-sm text-amber font-bold">${cartSubtotal.toFixed(2)}</div>}
            </div>

            {cartItems.length === 0 ? (
              <div className="px-5 py-10 text-center text-bone/40 text-sm">
                <ShoppingCart size={28} className="mx-auto mb-3 opacity-30" />
                No parts yet — upload an STL or 3MF and add it to your cart.
              </div>
            ) : (
              <div className="divide-y divide-ironworks3">
                {cartItems.map(item => {
                  const itemColor = MATERIAL_COLORS[item.material]?.find(c => c.name === item.color);
                  return (
                    <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-bone truncate">{item.fileName.replace(/\.(stl|3mf)$/i, "")}</div>
                        <div className="mt-1">
                          <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs text-steel">
                            {itemColor && <span className="inline-block w-2.5 h-2.5 rounded-full border border-ironworks3 flex-shrink-0" style={{ background: itemColor.hex }} />}
                            <span>{item.material} · {item.color} · {QUALITIES[item.quality].label}mm · {item.infill}% · {item.quote.grams}g{item.quote.hours > 0 ? ` · ${item.quote.hours}h` : ""}</span>
                          </div>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {MATERIAL_COLORS[item.material]?.map(c => (
                              <button key={c.name} title={c.name}
                                onClick={() => setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, color: c.name } : i))}
                                className={`w-5 h-5 rounded-full border transition-all ${item.color === c.name ? "border-amber scale-110" : "border-ironworks3 hover:border-bone/40"}`}
                                style={{ background: c.hex }} />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-sm border border-ironworks3 flex items-center justify-center hover:border-amber transition-colors"><Minus size={10} /></button>
                          <span className="font-mono text-xs font-bold w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-sm border border-ironworks3 flex items-center justify-center hover:border-amber transition-colors"><Plus size={10} /></button>
                          {item.qty > 1 && <span className="font-mono text-xs text-steel">${item.quote.price.toFixed(2)} ea</span>}
                        </div>
                      </div>
                      <div className="flex items-start gap-3 flex-shrink-0">
                        <div className="font-display font-bold text-amber">${(item.quote.price * item.qty).toFixed(2)}</div>
                        <button onClick={() => removeFromCart(item.id)} className="text-steel hover:text-red-400 transition-colors mt-0.5"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="rounded-sm border border-ironworks3 bg-ironworks2">
              <div className="px-5 py-4 border-b border-ironworks3">
                <div className="font-display font-bold text-lg flex items-center gap-2"><Truck size={18} className="text-amber" /> Shipping</div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-xs text-steel mb-1 tracking-wider">FIRST NAME</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" placeholder="First name" />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-steel mb-1 tracking-wider">LAST NAME</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" placeholder="Last name" />
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-xs text-steel mb-1 tracking-wider">EMAIL</label>
                  <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block font-mono text-xs text-steel mb-1 tracking-wider">ADDRESS</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" placeholder="123 Main St" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block font-mono text-xs text-steel mb-1 tracking-wider">CITY</label>
                    <input value={city} onChange={e => setCity(e.target.value)} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" placeholder="Louisville" />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-steel mb-1 tracking-wider">STATE</label>
                    <input value={stateField} onChange={e => setStateField(e.target.value)} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" placeholder="KY" maxLength={2} />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-steel mb-1 tracking-wider">ZIP</label>
                    <input value={zip} onChange={e => setZip(e.target.value)} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm" placeholder="40201" />
                  </div>
                </div>
                <button onClick={getShippingRates} disabled={fetchingRates}
                  className="w-full py-2.5 rounded-sm border border-amber text-amber font-display font-bold text-sm hover:bg-amber hover:text-ironworks transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {fetchingRates ? (<><span className="inline-block w-4 h-4 border-2 border-amber/30 border-t-amber rounded-full animate-spin" /> Getting rates...</>) : "GET SHIPPING RATES"}
                </button>
                {rateError && <div className="text-red-400 text-xs">{rateError}</div>}
                {shippingRates.length > 0 && (
                  <div className="space-y-2">
                    {shippingRates.map(rate => (
                      <label key={rate.id} className={`flex items-center justify-between p-3 rounded-sm border cursor-pointer transition-all ${selectedRateId === rate.id ? "border-amber bg-ironworks" : "border-ironworks3 hover:border-bone/30"}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="shipping" value={rate.id} checked={selectedRateId === rate.id} onChange={() => setSelectedRateId(rate.id)} className="accent-amber" />
                          <div>
                            <div className="text-sm font-medium">{rate.service}</div>
                            <div className="font-mono text-xs text-steel">{rate.provider}{rate.days ? ` · ${rate.days} business days` : ""}</div>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-amber">${rate.amount.toFixed(2)}</div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="rounded-sm bg-amber text-ironworks p-5">
              <div className="font-mono text-xs uppercase tracking-widest mb-4 flex items-center gap-2 text-ironworks/70"><DollarSign size={12} /> Order Total</div>
              <div className="space-y-1.5 mb-5 font-mono text-sm">
                <div className="flex justify-between text-ironworks/70"><span>Parts ({cartItems.reduce((s, i) => s + i.qty, 0)} units)</span><span className="font-bold text-ironworks">${cartSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-ironworks/70"><span>KY Sales Tax (6%)</span><span className="font-bold text-ironworks">${taxAmount.toFixed(2)}</span></div>
                {totalHours > 0 && <div className="flex justify-between text-ironworks/70"><span>Est. print time</span><span className="font-bold text-ironworks">{totalHours.toFixed(1)}h</span></div>}
                <div className="flex justify-between text-ironworks/70"><span>Total weight</span><span className="font-bold text-ironworks">{totalLbs.toFixed(2)} lbs</span></div>
                {selectedRate && <div className="flex justify-between text-ironworks/70"><span>Shipping</span><span className="font-bold text-ironworks">${selectedRate.amount.toFixed(2)}</span></div>}
                {!selectedRate && shippingRates.length === 0 && <div className="text-ironworks/50 text-xs">Enter address above to calculate shipping</div>}
              </div>
              {(selectedRate || shippingRates.length === 0) && (
                <div className="font-display font-black leading-none mb-5" style={{ fontSize: 56, letterSpacing: "-0.04em" }}>${orderTotal.toFixed(2)}</div>
              )}
              <button onClick={handleCheckout} disabled={checkingOut || (!selectedRate && shippingRates.length > 0)}
                className="w-full py-4 rounded-sm font-display font-bold flex items-center justify-center gap-2 bg-ironworks text-amber hover:bg-black transition-colors tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">
                {checkingOut ? (<><span className="inline-block w-4 h-4 border-2 border-amber/30 border-t-amber rounded-full animate-spin" /> REDIRECTING...</>) : (<>PAY WITH SQUARE <ArrowRight size={16} /></>)}
              </button>
              {checkoutError && <div className="mt-3 text-sm text-center text-red-800 font-medium">{checkoutError}</div>}
              <div className="mt-3 text-xs text-center text-ironworks/50 font-mono">SECURE · CARD · APPLE PAY · GOOGLE PAY</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
