"use client";

import type { CSSProperties } from "react";
import { useState, useRef, useEffect } from "react";
import { Trash2, ShoppingCart, ArrowRight, AlertCircle, Package, Truck, DollarSign, Plus, Minus, MapPin, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { parseSTL, computeVolume, quoteFromGeometry, MATERIALS, QUALITIES, MATERIAL_COLORS, type MaterialKey, type QualityKey } from "@/lib/stl";
import { parse3MF } from "@/lib/parse3mf";
import dynamic from "next/dynamic";
import * as THREE from "three";

const STLViewer = dynamic(() => import("@/components/STLViewer").then(m => ({ default: m.STLViewer })), { ssr: false });

type Stats = { dims: { x: number; y: number; z: number }; volumeMm3: number };
type Quote = { grams: number; hours: number; price: number; fromSlicer: boolean; breakdown: { material: number; machine: number; setup: number } };
type CartItem = { id: string; file: File | null; fileName: string; material: MaterialKey; quality: QualityKey; infill: number; qty: number; color: string; stats: Stats; quote: Quote; geometry: any; thumbnail?: string };
type ShippingRate = { id: string; provider: string; service: string; amount: number; currency: string; days?: number };

function genId() { return Math.random().toString(36).slice(2, 10); }
function genOrderId() { return `DL-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const softBorder: CSSProperties = { borderColor: "rgba(255,255,255,0.07)" };
const inputBase: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  outline: "none",
};
function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)";
  e.currentTarget.style.boxShadow  = "0 0 0 3px rgba(255,181,71,0.08)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
  e.currentTarget.style.boxShadow  = "none";
}

async function sliceFileAsync(form: FormData): Promise<any> {
  const r = await fetch("/api/slice", { method: "POST", body: form });
  const init = await r.json();
  if (!init.jobId) return init; // direct result or error
  // Poll until done (up to 5 minutes)
  for (let i = 0; i < 150; i++) {
    await new Promise(res => setTimeout(res, 2000));
    try {
      const sr = await fetch(`/api/slice-status?jobId=${encodeURIComponent(init.jobId)}`);
      const status = await sr.json();
      if (status.status !== "pending") return status;
    } catch {
      return { error: "Slicer unavailable", fallback: true };
    }
  }
  return { error: "Slicer timed out", fallback: true };
}

export default function QuotePage() {
  const [livePricing, setLivePricing] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/pricing").then(r => r.json()).then(setLivePricing).catch(() => {});
  }, []);

  const [file, setFile]                     = useState<File | null>(null);
  const [geometry, setGeometry]             = useState<THREE.BufferGeometry | null>(null);
  const [stats, setStats]                   = useState<Stats | null>(null);
  const [material, setMaterial]             = useState<MaterialKey>("PLA");
  const [quality, setQuality]               = useState<QualityKey>("standard");
  const [infill, setInfill]                 = useState(20);
  const [qty, setQty]                       = useState(1);
  const [color, setColor]                   = useState("Midnight Black");
  const [currentQuote, setCurrentQuote]     = useState<Quote | null>(null);
  const [parsing, setParsing]               = useState(false);
  const [dragOver, setDragOver]             = useState(false);
  const [fileError, setFileError]           = useState<string | null>(null);
  const [cartItems, setCartItems]           = useState<CartItem[]>([]);
  const [slicerLoading, setSlicerLoading]   = useState(false);
  const [slicerFailed, setSlicerFailed]     = useState(false);
  const [slicerTooLarge, setSlicerTooLarge] = useState<string | null>(null);
  const [slicerComplete, setSlicerComplete] = useState(false);
  const [isStepFile, setIsStepFile]         = useState(false);
  const [expandedCartItem, setExpandedCartItem] = useState<string | null>(null);
  const [reslicingItem, setReslicingItem]   = useState<string | null>(null);
  const [firstName, setFirstName]           = useState("");
  const [lastName, setLastName]             = useState("");
  const [customerEmail, setCustomerEmail]   = useState("");
  const [address, setAddress]               = useState("");
  const [city, setCity]                     = useState("");
  const [stateField, setStateField]         = useState("");
  const [zip, setZip]                       = useState("");
  const [localPickup, setLocalPickup]       = useState(false);
  const [shippingRates, setShippingRates]   = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [fetchingRates, setFetchingRates]   = useState(false);
  const [rateError, setRateError]           = useState<string | null>(null);
  const [checkingOut, setCheckingOut]       = useState(false);
  const [checkoutError, setCheckoutError]   = useState<string | null>(null);
  const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(null);

  const inputRef   = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const customerName = `${firstName} ${lastName}`.trim();
  // Volume pricing is the default. Slicer path preserved below for easy revert.
  // To switch back: const isVolume = process.env.NEXT_PUBLIC_PRICING_MODE === "volume";
  const isVolume = true;

  useEffect(() => {
    const colors = MATERIAL_COLORS[material];
    if (!colors.find(c => c.name === color)) setColor(colors[0].name);
  }, [material]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const serializable = cartItems.map(i => ({
      id: i.id, fileName: i.fileName, material: i.material, quality: i.quality,
      infill: i.infill, qty: i.qty, color: i.color, stats: i.stats, quote: i.quote,
      thumbnail: i.thumbnail,
    }));
    localStorage.setItem("dragline_cart", JSON.stringify(serializable));
  }, [cartItems]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dragline_cart");
      if (!saved) { initializedRef.current = true; return; }
      const items = JSON.parse(saved);

      const reorderRaw = sessionStorage.getItem("dragline_reorder_files");
      const reorderFiles: Record<string, { base64: string; mimeType: string }> = reorderRaw
        ? JSON.parse(reorderRaw)
        : {};

      const hydrated = items.map((i: any) => {
        let file: File | null = null;
        if (reorderFiles[i.fileName]) {
          const { base64, mimeType } = reorderFiles[i.fileName];
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          file = new File([bytes], i.fileName, { type: mimeType });
        }
        return { ...i, file, geometry: null };
      });

      initializedRef.current = true;
      setCartItems(hydrated);
      sessionStorage.removeItem("dragline_reorder_files");

      const shippingRaw = sessionStorage.getItem("dragline_reorder_shipping");
      if (shippingRaw) {
        const s = JSON.parse(shippingRaw);
        if (s.firstName) setFirstName(s.firstName);
        if (s.lastName) setLastName(s.lastName);
        if (s.email) setCustomerEmail(s.email);
        if (s.localPickup) {
          setLocalPickup(true);
        } else {
          if (s.address) setAddress(s.address);
          if (s.city) setCity(s.city);
          if (s.state) setStateField(s.state);
          if (s.zip) setZip(s.zip);
        }
        sessionStorage.removeItem("dragline_reorder_shipping");
      }
    } catch {}
    initializedRef.current = true;
  }, []);

  async function resliceCartItem(itemId: string, mat: MaterialKey, q: QualityKey, inf: number) {
    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;
    if (isVolume) {
      // Instant recalculation from stored volume — no slicer needed
      setCartItems(prev => prev.map(i => i.id === itemId ? {
        ...i, material: mat, quality: q, infill: inf,
        quote: quoteFromGeometry(i.stats.volumeMm3, mat, q, inf, livePricing[mat]),
      } : i));
      return;
    }
    if (!item.file) return;
    setReslicingItem(itemId);
    try {
      const form = new FormData();
      form.append("stl", item.file);
      form.append("material", mat);
      form.append("quality", q);
      form.append("infill", String(inf));
      if (livePricing[mat]) form.append("costPerKg", String(livePricing[mat]));
      const data = await sliceFileAsync(form);
      if (data.price && !data.fallback) {
        setCartItems(prev => prev.map(i => i.id === itemId ? {
          ...i, material: mat, quality: q, infill: inf,
          quote: { grams: data.grams, hours: data.hours, price: data.price, fromSlicer: true, breakdown: data.breakdown },
        } : i));
      }
    } catch {}
    setReslicingItem(null);
  }

  const selectedRate   = shippingRates.find(r => r.id === selectedRateId);
  const cartSubtotal   = cartItems.reduce((sum, i) => sum + i.quote.price * i.qty, 0);
  const taxAmount      = Math.round(cartSubtotal * 0.06 * 100) / 100;
  const orderTotal     = cartSubtotal + taxAmount + (localPickup ? 0 : (selectedRate?.amount || 0));
  const totalHours     = cartItems.reduce((s, i) => s + i.quote.hours * i.qty, 0);
  const totalLbs       = cartItems.reduce((s, i) => s + i.quote.grams * i.qty, 0) / 453.592;

  function runSlicer(f: File, mat: MaterialKey, q: QualityKey, inf: number) {
    setSlicerLoading(true); setSlicerFailed(false); setSlicerTooLarge(null); setSlicerComplete(false);
    const form = new FormData();
    form.append("stl", f); form.append("material", mat); form.append("quality", q); form.append("infill", String(inf));
    if (livePricing[mat]) form.append("costPerKg", String(livePricing[mat]));
    sliceFileAsync(form)
      .then(data => {
        if (data.tooLarge || data.needsOrientation) {
          setSlicerTooLarge(data.error || "Part requires manual orientation or exceeds build volume");
          setSlicerFailed(false);
          setIsStepFile(false);
        } else if (data.price && !data.fallback) {
          setSlicerFailed(false); setSlicerTooLarge(null);
          if (data.convertedStl) {
            try {
              const bytes = Uint8Array.from(atob(data.convertedStl), c => c.charCodeAt(0));
              const geo = parseSTL(bytes.buffer);
              geo.computeBoundingBox();
              const size = new THREE.Vector3();
              geo.boundingBox!.getSize(size);
              const vol = computeVolume(geo);
              setStats({ dims: { x: size.x, y: size.y, z: size.z }, volumeMm3: vol });
              setGeometry(geo);
              setIsStepFile(false);
              if (Math.max(size.x, size.y, size.z) > 350) {
                setSlicerTooLarge(`Part ${size.x.toFixed(0)}×${size.y.toFixed(0)}×${size.z.toFixed(0)}mm exceeds build volume (350×350×350mm)`);
              } else {
                // STEP files: slicer already ran for conversion, use its accurate output regardless of pricing mode
                setCurrentQuote({ grams: data.grams, hours: data.hours, price: data.price, fromSlicer: true, breakdown: data.breakdown });
              }
            } catch(e) {
              console.warn("Could not parse converted STL for preview", e);
              setCurrentQuote({ grams: data.grams, hours: data.hours, price: data.price, fromSlicer: true, breakdown: data.breakdown });
            }
          } else if (!isVolume) {
            setCurrentQuote({ grams: data.grams, hours: data.hours, price: data.price, fromSlicer: true, breakdown: data.breakdown });
          }
        } else if (data.error && !data.fallback) {
          setSlicerTooLarge(data.error);
          setSlicerFailed(false);
          setIsStepFile(false);
        } else {
          setSlicerFailed(true);
          setIsStepFile(false);
        }
      })
      .catch(() => { setSlicerFailed(true); setIsStepFile(false); })
      .finally(() => { setSlicerLoading(false); setSlicerComplete(true); });
  }

  function recalc(s: Stats, mat: MaterialKey, q: QualityKey, inf: number) {
    if (!isVolume && slicerLoading) return;
    setCurrentQuote(quoteFromGeometry(s.volumeMm3, mat, q, inf, livePricing[mat]));
    if (!isVolume && slicerComplete && file) runSlicer(file, mat, q, inf);
  }

  async function convertStepForPreview(f: File, mat: MaterialKey, q: QualityKey, inf: number) {
    setSlicerLoading(true); setSlicerFailed(false); setSlicerTooLarge(null);
    try {
      const form = new FormData();
      form.append("step", f);
      const r = await fetch("/api/convert-step", { method: "POST", body: form });
      const data = await r.json();
      if (!data.stl) {
        setSlicerFailed(true); setParsing(false);
        return;
      }
      const bytes = Uint8Array.from(atob(data.stl), c => c.charCodeAt(0));
      const geo = parseSTL(bytes.buffer);
      geo.computeBoundingBox();
      const size = new THREE.Vector3(); geo.boundingBox!.getSize(size);
      const vol = computeVolume(geo);
      setStats({ dims: { x: size.x, y: size.y, z: size.z }, volumeMm3: vol });
      setGeometry(geo); setIsStepFile(false);
      if (Math.max(size.x, size.y, size.z) > 350) {
        setSlicerTooLarge(`Part ${size.x.toFixed(0)}×${size.y.toFixed(0)}×${size.z.toFixed(0)}mm exceeds build volume (350×350×350mm)`);
      } else {
        setCurrentQuote(quoteFromGeometry(vol, mat, q, inf, livePricing[mat]));
        setSlicerComplete(true);
      }
    } catch {
      setSlicerFailed(true);
    } finally {
      setSlicerLoading(false); setParsing(false);
    }
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    if (!/\.(stl|3mf|step|stp)$/i.test(f.name)) { setFileError("STL, 3MF, or STEP files only."); return; }
    setFileError(null); setFile(f); setStats(null); setGeometry(null);
    setCurrentQuote(null); setCurrentThumbnail(null); setSlicerFailed(false); setSlicerTooLarge(null); setSlicerComplete(false);

    if (/\.(step|stp)$/i.test(f.name)) {
      setIsStepFile(true); setParsing(true);
      setStats({ dims: { x: 0, y: 0, z: 0 }, volumeMm3: 0 });
      // Fast path: convert STEP→STL only (no full slice), then price from volume
      convertStepForPreview(f, material, quality, infill);
      return;
    }

    setIsStepFile(false); setParsing(true);
    try {
      const buffer = await f.arrayBuffer();
      const geo = /\.3mf$/i.test(f.name) ? await parse3MF(buffer) : parseSTL(buffer);
      geo.computeBoundingBox();
      const size = new THREE.Vector3(); geo.boundingBox!.getSize(size);
      const s: Stats = { dims: { x: size.x, y: size.y, z: size.z }, volumeMm3: computeVolume(geo) };
      setStats(s); setGeometry(geo);
      if (isVolume) {
        // Client-side volume pricing — no slicer needed
        if (Math.max(size.x, size.y, size.z) > 350) {
          setSlicerTooLarge(`Part ${size.x.toFixed(0)}×${size.y.toFixed(0)}×${size.z.toFixed(0)}mm exceeds build volume (350×350×350mm)`);
        } else {
          setCurrentQuote(quoteFromGeometry(s.volumeMm3, material, quality, infill, livePricing[material]));
          setSlicerComplete(true);
        }
      } else {
        runSlicer(f, material, quality, infill);
      }
    } catch { setFileError("Could not parse file."); }
    setParsing(false);
  }

  function addToCart() {
    if (!file || !stats || !currentQuote) return;
    if (!isVolume && !currentQuote.fromSlicer) return;
    if (!isStepFile && !geometry) return;
    setCartItems(prev => [...prev, { id: genId(), file, fileName: file.name, material, quality, infill, qty, color, stats, quote: currentQuote, geometry: geometry || null, thumbnail: currentThumbnail || undefined }]);
    setCurrentThumbnail(null);
    setFile(null); setGeometry(null); setStats(null); setCurrentQuote(null); setIsStepFile(false);
    setMaterial("PLA"); setQuality("standard"); setInfill(20); setQty(1); setColor("Midnight Black");
    setSlicerComplete(false); setSlicerFailed(false); setSlicerTooLarge(null);
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
      setRateError("Fill in all shipping fields first."); return;
    }
    setLocalPickup(false);
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
    if (!firstName || !lastName || !customerEmail) { setCheckoutError("Please fill in your name and email."); return; }
    if (!localPickup && (!address || !city || !stateField || !zip)) { setCheckoutError("Please fill in your shipping address or select Local Pickup."); return; }
    if (!selectedRate && !localPickup) { setCheckoutError("Please select a shipping option or Local Pickup."); return; }
    setCheckingOut(true); setCheckoutError(null);
    const orderId = genOrderId();
    try {
      const notifyForm = new FormData();
      notifyForm.append("orderId", orderId);
      notifyForm.append("customerName", customerName); notifyForm.append("customerEmail", customerEmail);
      notifyForm.append("address", localPickup ? "Local Pickup" : address);
      notifyForm.append("city", localPickup ? "Louisville" : city);
      notifyForm.append("state", localPickup ? "KY" : stateField);
      notifyForm.append("zip", localPickup ? "" : zip);
      notifyForm.append("shippingLabel", localPickup ? "Local Pickup" : (selectedRate?.service || "Standard"));
      notifyForm.append("shippingCost", String(localPickup ? 0 : (selectedRate?.amount || 0)));
      notifyForm.append("total", String(orderTotal));
      notifyForm.append("items", JSON.stringify(cartItems.map(i => ({ id: i.id, fileName: i.fileName, material: i.material, quality: i.quality, infill: i.infill, qty: i.qty, color: i.color, grams: i.quote.grams, hours: i.quote.hours, price: i.quote.price, lineTotal: i.quote.price * i.qty, thumbnail: i.thumbnail || null }))));
      for (const item of cartItems) { if (item.file) notifyForm.append(`file_${item.id}`, item.file); }
      fetch("/api/notify", { method: "POST", body: notifyForm }).catch(() => {});
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          items: cartItems.map(i => ({ fileName: i.fileName, material: i.material, quality: i.quality, infill: i.infill, qty: i.qty, color: i.color, volumeMm3: i.stats.volumeMm3, price: i.quote.price, grams: i.quote.grams, hours: i.quote.hours })),
          shippingCost: localPickup ? 0 : (selectedRate?.amount || 0),
          shippingLabel: localPickup ? "Local Pickup" : (selectedRate?.service || ""),
          customerEmail, customerName,
          address: localPickup ? "Local Pickup" : address,
          city: localPickup ? "Louisville" : city,
          state: localPickup ? "KY" : stateField,
          zip: localPickup ? "" : zip,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e: any) { setCheckoutError(e.message || "Something went wrong."); setCheckingOut(false); }
  }

  const availableColors = MATERIAL_COLORS[material];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute -top-20 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,181,71,0.06) 0%, transparent 65%)", filter: "blur(80px)" }} />

      <div className="relative max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between border-b pb-5 mb-16" style={softBorder}>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">Quote & Order</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber" style={{ boxShadow: "0 0 6px rgba(255,181,71,0.9)" }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel hidden sm:inline">Dragline 3D</span>
          </div>
        </div>

        <div className="mb-14">
          <h1 className="font-display font-black leading-[0.82] tracking-tight mb-6"
            style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}>
            <span className="block text-bone">Build your</span>
            <span className="block"
              style={{ WebkitTextStroke: "2px #ffb547", color: "transparent", textShadow: "0 0 60px rgba(255,181,71,0.12)" }}>
              order.
            </span>
          </h1>
          <p className="text-bone/50 text-base leading-relaxed max-w-xl">
            Upload STL, STEP or 3MF files, configure each part, add them to your cart, then checkout.
          </p>
        </div>

        <div className="grid xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3 space-y-4">

            {!file ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer rounded-2xl text-center flex flex-col items-center justify-center gap-5 transition-all duration-200"
                style={{
                  ...glass,
                  border: dragOver ? "1px solid rgba(255,181,71,0.55)" : "1px dashed rgba(255,255,255,0.12)",
                  background: dragOver ? "rgba(255,181,71,0.04)" : "rgba(255,255,255,0.02)",
                  boxShadow: dragOver ? "0 0 40px rgba(255,181,71,0.10), inset 0 1px 0 rgba(255,255,255,0.05)" : "inset 0 1px 0 rgba(255,255,255,0.04)",
                  minHeight: 300, padding: "48px 32px",
                }}>
                <input ref={inputRef} type="file" accept=".stl,.3mf,.step,.stp" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                <div className="rounded-full grid place-items-center flex-shrink-0"
                  style={{ width: 64, height: 64, background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)", boxShadow: "0 0 24px rgba(255,181,71,0.35)" }}>
                  <Plus size={28} color="#08080a" />
                </div>
                <div>
                  <div className="font-display font-black text-2xl mb-2">
                    {cartItems.length > 0 ? "Add another part" : "Drop your file"}
                  </div>
                  <div className="text-bone/45 text-sm">or click to browse · .STL · .3MF · .STEP</div>
<div className="text-bone/25 text-xs mt-1">Upload individual parts — one file per part. 3MF & STEP files are priced as a single unit.</div>
                </div>
                {fileError && (
                  <div className="text-sm flex items-center gap-2 text-red-400">
                    <AlertCircle size={14} /> {fileError}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="rounded-2xl overflow-hidden" style={{ ...glass, height: 380 }}>
                  {isStepFile ? (
                    <div className="h-full grid place-items-center">
                      <div className="text-center">
                        <div className="font-mono text-[10px] tracking-[0.2em] text-steel mb-2">STEP FILE</div>
                        <div className="font-mono text-xs text-steel/40">
                          {isVolume ? "Converting to STL for preview…" : "No preview — slicing on server"}
                        </div>
                        {slicerLoading && <div className="inline-block w-6 h-6 border-2 border-t-amber rounded-full animate-spin mt-4" style={{ borderColor: "rgba(255,181,71,0.2)", borderTopColor: "#ffb547" }} />}
                      </div>
                    </div>
                  ) : parsing || !geometry ? (
                    <div className="h-full grid place-items-center">
                      <div className="text-center">
                        <div className="inline-block w-8 h-8 rounded-full animate-spin mb-4"
                          style={{ border: "2px solid rgba(255,181,71,0.2)", borderTopColor: "#ffb547" }} />
                        <div className="font-mono text-[10px] tracking-[0.2em] text-steel">PARSING MESH...</div>
                      </div>
                    </div>
                  ) : <STLViewer geometry={geometry} onStats={() => {}} onCapture={(dataUrl) => setCurrentThumbnail(dataUrl)} />}
                </div>
                <div className="mt-2.5 flex justify-between items-center">
                  <span className="font-mono text-[10px] text-steel tracking-wider">
                    {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    onClick={() => { setFile(null); setGeometry(null); setStats(null); setCurrentQuote(null); setSlicerFailed(false); setSlicerTooLarge(null); setSlicerComplete(false); setIsStepFile(false); }}
                    className="font-mono text-[10px] text-steel hover:text-bone transition-colors duration-150 underline cursor-pointer">
                    Remove
                  </button>
                </div>
              </div>
            )}

            {stats && (
              <div className="rounded-2xl p-6" style={glass}>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber mb-7 flex items-center gap-2">
                  <Package size={12} /> Configure this part
                </div>
                <div className="mb-6">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-3">Material</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {(Object.entries(MATERIALS) as [MaterialKey, typeof MATERIALS[MaterialKey]][]).map(([key, m]) => (
                      <button key={key} onClick={() => { setMaterial(key); recalc(stats, key, quality, infill); }}
                        className="p-3 rounded-xl text-left transition-all duration-150 cursor-pointer"
                        style={material === key ? { background: "rgba(255,181,71,0.07)", border: "1px solid rgba(255,181,71,0.40)", boxShadow: "0 0 16px rgba(255,181,71,0.08)" } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.swatch, border: "1px solid rgba(255,255,255,0.15)" }} />
                          <span className="font-display font-bold text-sm">{m.label}</span>
                        </div>
                        <div className="text-[10px] text-bone/40 leading-tight">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-3 flex items-center gap-2">
                    Color <span className="text-amber/70 normal-case">{color}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MATERIAL_COLORS[material].map(c => (
                      <button key={c.name} title={c.name} onClick={() => setColor(c.name)}
                        className="w-8 h-8 rounded-full transition-all duration-150 cursor-pointer"
                        style={{ background: c.hex, border: color === c.name ? "2px solid #ffb547" : "2px solid rgba(255,255,255,0.12)", boxShadow: color === c.name ? "0 0 10px rgba(255,181,71,0.40)" : "none", transform: color === c.name ? "scale(1.12)" : "scale(1)" }} />
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-3">Layer Height</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.entries(QUALITIES) as [QualityKey, typeof QUALITIES[QualityKey]][]).map(([key, q]) => (
                      <button key={key} onClick={() => { setQuality(key); recalc(stats, material, key, infill); }}
                        className="p-3 rounded-xl text-center transition-all duration-150 cursor-pointer"
                        style={quality === key ? { background: "rgba(255,181,71,0.07)", border: "1px solid rgba(255,181,71,0.40)" } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="font-mono font-semibold text-base" style={{ color: "#ffb547" }}>{q.label}<span className="text-xs text-steel/70">mm</span></div>
                        <div className="text-[10px] mt-1 text-bone/40">{q.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between items-baseline mb-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel">Infill</div>
                    <div className="font-mono text-sm font-bold" style={{ color: "#ffb547" }}>{infill}%</div>
                  </div>
                  <input type="range" min="20" max="100" step="20" value={infill}
                    onChange={e => { const v = +e.target.value; setInfill(v); recalc(stats, material, quality, v); }}
                    className="w-full" />
                  <div className="flex justify-between font-mono text-[9px] mt-1.5 text-steel"><span>20%</span><span>60%</span><span>100%</span></div>
                </div>
                <div className="mb-7">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-3">Quantity</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-amber/40" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}><Minus size={14} /></button>
                    <div className="font-display font-black text-xl w-10 text-center">{qty}</div>
                    <button onClick={() => setQty(q => Math.min(50, q + 1))} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-amber/40" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}><Plus size={14} /></button>
                    {qty > 1 && currentQuote && !slicerLoading && (isVolume || currentQuote.fromSlicer) && (
                      <div className="font-mono text-xs text-steel ml-1">${currentQuote.price.toFixed(2)} × {qty} = <span className="font-bold" style={{ color: "#ffb547" }}>${(currentQuote.price * qty).toFixed(2)}</span></div>
                    )}
                  </div>
                </div>
                {slicerTooLarge ? (
                  <div className="w-full py-4 rounded-xl font-mono text-xs text-center flex flex-col items-center gap-2 text-amber-400" style={{ background: "rgba(255,181,71,0.06)", border: "1px solid rgba(255,181,71,0.25)" }}>
                    <div className="flex items-center gap-2"><AlertCircle size={14} /> MANUAL QUOTE REQUIRED</div>
                    <div className="text-steel text-[11px]">{slicerTooLarge}</div>
                    <div className="text-steel text-[11px]">Max build volume: 350 × 350 × 350 mm · <a href="/contact" className="underline hover:text-bone">Contact us</a> for a custom quote.</div>
                  </div>
                ) : slicerFailed ? (
                  <div className="w-full py-4 rounded-xl font-mono text-xs text-center flex items-center justify-center gap-2 text-red-400" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }}>
                    <AlertCircle size={14} /> {isVolume ? "STEP conversion unavailable — try again shortly." : "SLICER UNAVAILABLE — cannot calculate price. Try again shortly."}
                  </div>
                ) : (
                  <>
                  {currentQuote && !slicerLoading && (isVolume || currentQuote.fromSlicer) && (
                    <div className="flex justify-center gap-3 mb-3 font-mono text-[10px] text-steel">
                      <span>{currentQuote.grams.toFixed(1)}g · {(currentQuote.grams / 453.592).toFixed(3)} lbs</span>
                      <span>·</span>
                      <span>{currentQuote.hours}h print est.</span>
                    </div>
                  )}
                  <button onClick={addToCart}
                    disabled={slicerLoading || !currentQuote || (!isVolume && !currentQuote.fromSlicer)}
                    className="w-full py-4 rounded-xl font-display font-bold flex items-center justify-center gap-3 text-ironworks transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)", boxShadow: "0 0 32px rgba(255,181,71,0.30)" }}>
                    {slicerLoading || !currentQuote || (!isVolume && !currentQuote.fromSlicer) ? (
                      <><span className="inline-block w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid rgba(8,8,10,0.3)", borderTopColor: "#08080a" }} />CALCULATING...</>
                    ) : (
                      <><ShoppingCart size={18} />ADD TO CART — ${(currentQuote.price * qty).toFixed(2)}{qty > 1 ? ` (${qty}×)` : ""}</>
                    )}
                  </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="xl:col-span-2 space-y-4">
            {/* Cart */}
            <div className="rounded-2xl overflow-hidden" style={glass}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="font-display font-bold text-lg flex items-center gap-2">
                  <ShoppingCart size={17} style={{ color: "#ffb547" }} />
                  Cart
                  {cartItems.length > 0 && (
                    <span className="text-ironworks text-[10px] font-mono px-2 py-0.5 rounded-full font-bold" style={{ background: "#ffb547" }}>{cartItems.length}</span>
                  )}
                </div>
                {cartItems.length > 0 && <div className="font-mono text-sm font-bold" style={{ color: "#ffb547" }}>${cartSubtotal.toFixed(2)}</div>}
              </div>

              {cartItems.length === 0 ? (
                <div className="px-5 py-12 text-center text-bone/35 text-sm">
                  <ShoppingCart size={26} className="mx-auto mb-3 opacity-25" />
                  No parts yet — upload an STL, 3MF, or STEP file and add it to your cart.
                </div>
              ) : (
                <div>
                  {cartItems.map((item, idx) => {
                    const itemColor = MATERIAL_COLORS[item.material]?.find(c => c.name === item.color);
                    const isExpanded = expandedCartItem === item.id;
                    const isReslicing = reslicingItem === item.id;
                    return (
                      <div key={item.id} style={{ borderBottom: idx < cartItems.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                        <div className="px-5 py-4 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {item.thumbnail && (
                                <img
                                  src={item.thumbnail}
                                  alt={item.fileName}
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                />
                              )}
                              <div className="font-medium text-sm text-bone truncate">{item.fileName.replace(/\.(stl|3mf|step|stp)$/i, "")}</div>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap font-mono text-[10px] text-steel">
                              {itemColor && <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: itemColor.hex, border: "1px solid rgba(255,255,255,0.15)" }} />}
                              <span>{item.material} · {item.color} · {QUALITIES[item.quality].label}mm · {item.infill}%</span>
                              {isReslicing && <span className="text-amber/60">· recalculating…</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2.5">
                              <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}><Minus size={10} /></button>
                              <span className="font-mono text-xs font-bold w-4 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}><Plus size={10} /></button>
                              {item.qty > 1 && <span className="font-mono text-[10px] text-steel">${item.quote.price.toFixed(2)} ea</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="font-display font-bold" style={{ color: "#ffb547" }}>${(item.quote.price * item.qty).toFixed(2)}</div>
                            <div className="flex items-center gap-2">
                              {item.file && (
                                <button onClick={() => setExpandedCartItem(isExpanded ? null : item.id)}
                                  className="text-steel hover:text-amber transition-colors duration-150 cursor-pointer"
                                  title="Edit settings">
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              )}
                              <button onClick={() => removeFromCart(item.id)} className="text-steel hover:text-red-400 transition-colors duration-150 cursor-pointer"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>

                        {isExpanded && item.file && (
                          <div className="px-5 pb-4 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
                            <div className="pt-3">
                              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-2">Material</div>
                              <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
                                {(Object.entries(MATERIALS) as [MaterialKey, typeof MATERIALS[MaterialKey]][]).map(([key, m]) => (
                                  <button key={key}
                                    onClick={() => {
                                      setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, material: key, color: MATERIAL_COLORS[key][0].name } : i));
                                      resliceCartItem(item.id, key, item.quality, item.infill);
                                    }}
                                    className="p-2 rounded-lg text-left transition-all duration-150 cursor-pointer"
                                    style={item.material === key ? { background: "rgba(255,181,71,0.07)", border: "1px solid rgba(255,181,71,0.40)" } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.swatch }} />
                                      <span className="font-display font-bold text-xs">{m.label}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-2">Color</div>
                              <div className="flex flex-wrap gap-1.5">
                                {MATERIAL_COLORS[item.material]?.map(c => (
                                  <button key={c.name} title={c.name}
                                    onClick={() => setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, color: c.name } : i))}
                                    className="w-6 h-6 rounded-full transition-all duration-150 cursor-pointer"
                                    style={{ background: c.hex, border: item.color === c.name ? "2px solid #ffb547" : "2px solid rgba(255,255,255,0.12)", transform: item.color === c.name ? "scale(1.15)" : "scale(1)" }} />
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-2">Layer Height</div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {(Object.entries(QUALITIES) as [QualityKey, typeof QUALITIES[QualityKey]][]).map(([key, q]) => (
                                  <button key={key}
                                    onClick={() => {
                                      setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, quality: key } : i));
                                      resliceCartItem(item.id, item.material, key, item.infill);
                                    }}
                                    className="p-2 rounded-lg text-center transition-all duration-150 cursor-pointer"
                                    style={item.quality === key ? { background: "rgba(255,181,71,0.07)", border: "1px solid rgba(255,181,71,0.40)" } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <div className="font-mono font-bold text-xs" style={{ color: "#ffb547" }}>{q.label}mm</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-baseline mb-1">
                                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel">Infill</div>
                                <div className="font-mono text-xs font-bold" style={{ color: "#ffb547" }}>{item.infill}%</div>
                              </div>
                              <input type="range" min="20" max="100" step="20" value={item.infill}
                                onChange={e => {
                                  const v = +e.target.value;
                                  setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, infill: v } : i));
                                }}
                                onMouseUp={e => resliceCartItem(item.id, item.material, item.quality, +(e.target as HTMLInputElement).value)}
                                onTouchEnd={e => resliceCartItem(item.id, item.material, item.quality, +(e.currentTarget as HTMLInputElement).value)}
                                className="w-full" />
                              <div className="flex justify-between font-mono text-[9px] mt-1 text-steel"><span>20%</span><span>60%</span><span>100%</span></div>
                            </div>
                            {isReslicing && (
                              <div className="flex items-center gap-2 text-amber/60 font-mono text-[10px]">
                                <RefreshCw size={10} className="animate-spin" /> Recalculating price…
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shipping */}
            {cartItems.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={glass}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="font-display font-bold text-lg flex items-center gap-2">
                    <Truck size={17} style={{ color: "#ffb547" }} /> Shipping
                  </div>
                </div>
                <div className="px-5 py-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: firstName, setter: setFirstName, placeholder: "First name", label: "First Name" },
                      { value: lastName,  setter: setLastName,  placeholder: "Last name",  label: "Last Name" },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-1.5">{f.label}</label>
                        <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                          className="w-full px-3 py-2.5 rounded-xl text-bone text-sm transition-all duration-150"
                          style={inputBase} onFocus={focusOn} onBlur={focusOff} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-1.5">Email</label>
                    <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="your@email.com"
                      className="w-full px-3 py-2.5 rounded-xl text-bone text-sm transition-all duration-150"
                      style={inputBase} onFocus={focusOn} onBlur={focusOff} />
                  </div>
                  <button onClick={() => { setLocalPickup(true); setShippingRates([]); setSelectedRateId(null); setRateError(null); }}
                    className="w-full py-2.5 rounded-xl font-display font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                    style={localPickup ? { background: "rgba(255,181,71,0.08)", border: "1px solid rgba(255,181,71,0.40)", color: "#ffb547" } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,230,225,0.55)" }}>
                    <MapPin size={14} /> LOCAL PICKUP — Louisville, KY
                  </button>
                  {localPickup && (
                    <div className="rounded-xl px-4 py-3 text-xs font-mono" style={{ background: "rgba(255,181,71,0.06)", border: "1px solid rgba(255,181,71,0.20)", color: "rgba(255,181,71,0.75)" }}>
                      No shipping charge. After checkout we'll email you to coordinate a pickup time.
                    </div>
                  )}
                  {!localPickup && (
                    <>
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-1.5">Address</label>
                        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St"
                          className="w-full px-3 py-2.5 rounded-xl text-bone text-sm transition-all duration-150"
                          style={inputBase} onFocus={focusOn} onBlur={focusOff} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: city, setter: setCity, placeholder: "Louisville", label: "City", cls: "col-span-1" },
                          { value: stateField, setter: setStateField, placeholder: "KY", label: "State", cls: "", max: 2 },
                          { value: zip, setter: setZip, placeholder: "40201", label: "ZIP", cls: "" },
                        ].map(f => (
                          <div key={f.label} className={f.cls}>
                            <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-1.5">{f.label}</label>
                            <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} maxLength={f.max}
                              className="w-full px-3 py-2.5 rounded-xl text-bone text-sm transition-all duration-150"
                              style={inputBase} onFocus={focusOn} onBlur={focusOff} />
                          </div>
                        ))}
                      </div>
                      <button onClick={getShippingRates} disabled={fetchingRates}
                        className="w-full py-2.5 rounded-xl font-display font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50"
                        style={{ background: "rgba(255,181,71,0.08)", border: "1px solid rgba(255,181,71,0.35)", color: "#ffb547" }}>
                        {fetchingRates ? <><span className="inline-block w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(255,181,71,0.2)", borderTopColor: "#ffb547" }} />Getting rates...</> : "GET SHIPPING RATES"}
                      </button>
                      {rateError && <div className="text-red-400 text-xs font-mono">{rateError}</div>}
                      {shippingRates.length > 0 && (
                        <div className="space-y-2">
                          {shippingRates.map(rate => (
                            <label key={rate.id} className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150"
                              style={selectedRateId === rate.id ? { background: "rgba(255,181,71,0.06)", border: "1px solid rgba(255,181,71,0.35)" } : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              <div className="flex items-center gap-3">
                                <input type="radio" name="shipping" value={rate.id} checked={selectedRateId === rate.id} onChange={() => setSelectedRateId(rate.id)} className="accent-amber" />
                                <div>
                                  <div className="text-sm font-medium">{rate.service}</div>
                                  <div className="font-mono text-[10px] text-steel">{rate.provider}{rate.days ? ` · ${rate.days} business days` : ""}</div>
                                </div>
                              </div>
                              <div className="font-mono font-bold" style={{ color: "#ffb547" }}>${rate.amount.toFixed(2)}</div>
                            </label>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {localPickup && (
                    <button onClick={() => setLocalPickup(false)} className="text-[10px] font-mono text-steel hover:text-bone underline text-center w-full cursor-pointer transition-colors duration-150">
                      Switch to shipping instead
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Order total */}
            {cartItems.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: "rgba(255,181,71,0.07)", border: "1px solid rgba(255,181,71,0.22)", boxShadow: "0 0 40px rgba(255,181,71,0.07)" }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] mb-5 flex items-center gap-2" style={{ color: "rgba(255,181,71,0.55)" }}>
                  <DollarSign size={12} /> Order Total
                </div>
                <div className="space-y-2 mb-5 font-mono text-sm">
                  <div className="flex justify-between"><span className="text-bone/50">Parts ({cartItems.reduce((s, i) => s + i.qty, 0)} units)</span><span className="font-bold text-bone">${cartSubtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-bone/50">KY Sales Tax (6%)</span><span className="font-bold text-bone">${taxAmount.toFixed(2)}</span></div>
                  {totalHours > 0 && <div className="flex justify-between"><span className="text-bone/50">Est. print time</span><span className="font-bold text-bone">{totalHours.toFixed(1)}h</span></div>}
                  <div className="flex justify-between"><span className="text-bone/50">Total weight</span><span className="font-bold text-bone">{totalLbs.toFixed(2)} lbs</span></div>
                  {localPickup && <div className="flex justify-between"><span className="text-bone/50">Shipping</span><span className="font-bold text-bone">Local Pickup</span></div>}
                  {selectedRate && !localPickup && <div className="flex justify-between"><span className="text-bone/50">Shipping</span><span className="font-bold text-bone">${selectedRate.amount.toFixed(2)}</span></div>}
                  {!selectedRate && !localPickup && shippingRates.length === 0 && <div className="font-mono text-[10px]" style={{ color: "rgba(255,181,71,0.40)" }}>Select Local Pickup or enter address above</div>}
                </div>
                {(selectedRate || localPickup || shippingRates.length === 0) && (
                  <div className="font-display font-black leading-none mb-6" style={{ fontSize: 52, letterSpacing: "-0.04em", color: "#ffb547", textShadow: "0 0 30px rgba(255,181,71,0.30)" }}>${orderTotal.toFixed(2)}</div>
                )}
                <button onClick={handleCheckout} disabled={checkingOut || (!selectedRate && !localPickup)}
                  className="w-full py-4 rounded-xl font-display font-bold flex items-center justify-center gap-2 text-ironworks transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)", boxShadow: "0 0 28px rgba(255,181,71,0.30)" }}>
                  {checkingOut ? <><span className="inline-block w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(8,8,10,0.3)", borderTopColor: "#08080a" }} />REDIRECTING...</> : <> PAY WITH SQUARE <ArrowRight size={16} /> </>}
                </button>
                <div className="mt-3 text-center font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
  By completing your order you agree to our{" "}
  <a href="/terms" target="_blank" className="underline hover:text-bone transition-colors">Terms &amp; Conditions</a>.
</div>
                {checkoutError && <div className="mt-3 text-sm text-center font-medium text-red-400">{checkoutError}</div>}
                <div className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: "rgba(255,181,71,0.35)" }}>SECURE · CARD · APPLE PAY · GOOGLE PAY</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
