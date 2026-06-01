"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Clock, Scale, Maximize2, DollarSign, Settings, ArrowRight, FileCheck, AlertCircle } from "lucide-react";
import { parseSTL, computeVolume, quoteFromGeometry, MATERIALS, QUALITIES, type MaterialKey, type QualityKey } from "@/lib/stl";
import dynamic from "next/dynamic";

const STLViewer = dynamic(() => import("@/components/STLViewer").then(m => ({ default: m.STLViewer })), { ssr: false });

type Stats = { dims: { x: number; y: number; z: number }; volumeMm3: number };
type Quote = ReturnType<typeof quoteFromGeometry>;

export default function QuotePage() {
  const [file, setFile] = useState<File | null>(null);
  const [geometry, setGeometry] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [material, setMaterial] = useState<MaterialKey>("PLA");
  const [quality, setQuality] = useState<QualityKey>("standard");
  const [infill, setInfill] = useState(20);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteSource, setQuoteSource] = useState<"slicer"|"estimate"|null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (stats && file) runQuote(); }, [stats, material, quality, infill]);

  async function runQuote() {
    if (!stats || !file) return;
    setLoading(true); setQuote(null); setQuoteSource(null);
    try {
      const form = new FormData();
      form.append("stl", file);
      form.append("material", material);
      form.append("quality", quality);
      form.append("infill", String(infill));
      const res = await fetch("/api/slice", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.price && !data.fallback) {
        setQuote({ grams: data.grams, hours: data.hours, price: data.price, breakdown: data.breakdown });
        setQuoteSource("slicer"); setLoading(false); return;
      }
    } catch {}
    setQuote(quoteFromGeometry(stats.volumeMm3, material, quality, infill));
    setQuoteSource("estimate"); setLoading(false);
  }

  async function handleCheckout() {
    if (!stats || !quote) return;
    setCheckingOut(true); setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ volumeMm3: stats.volumeMm3, material, quality, infill, fileName: file?.name ?? "Custom part" }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong.");
      setCheckingOut(false);
    }
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    if (!/\.(stl|3mf)$/i.test(f.name)) { setError("STL or 3MF files only."); return; }
    setError(null); setFile(f); setLoading(true); setQuote(null); setGeometry(null); setStats(null);
    try {
      const buffer = await f.arrayBuffer();
      const geo = parseSTL(buffer);
      const bbox = geo.boundingBox!;
      const size = new (await import("three")).Vector3();
      bbox.getSize(size);
      const volumeMm3 = computeVolume(geo);
      const s: Stats = { dims: { x: size.x, y: size.y, z: size.z }, volumeMm3 };
      setStats(s);
      setGeometry(geo);
    } catch { setError("Could not parse STL."); setLoading(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
      <div className="mb-12 max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">01 — Upload your file</div>
        <h1 className="font-display font-black text-5xl md:text-7xl leading-[0.92] mb-5">Drop a file.<br /><span className="text-amber">Get a quote.</span></h1>
        <p className="text-bone/70 text-lg leading-relaxed max-w-xl">Real prices in seconds. STL and 3MF files accepted — drag and drop or click to browse.</p>
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          {!file ? (
            <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}} onClick={()=>inputRef.current?.click()} className={`grid-bg cursor-pointer rounded-sm p-12 text-center transition-all ${dragOver?"border-2 border-amber bg-ironworks2":"border-2 border-dashed border-ironworks3 bg-ironworks2/50"}`} style={{minHeight:440}}>
              <input ref={inputRef} type="file" accept=".stl" className="hidden" onChange={e=>handleFile(e.target.files?.[0])} />
              <div className="flex flex-col items-center justify-center h-full">
                <div className="rounded-full bg-amber grid place-items-center mb-6" style={{width:72,height:72}}><Upload size={28} strokeWidth={2.2} color="#0f0f10" /></div>
                <div className="font-display font-extrabold text-3xl mb-2">Drop your STL</div>
                <div className="text-bone/50 text-sm">or click to browse · max 100 MB</div>
                <div className="font-mono text-xs text-steel tracking-widest mt-7">.STL · BINARY OR ASCII</div>
                {error && <div className="mt-6 text-sm flex items-center gap-2 text-red-400"><AlertCircle size={14}/> {error}</div>}
              </div>
            </div>
          ) : (
            <div className="rounded-sm overflow-hidden border border-ironworks3" style={{height:440}}>
              {!geometry ? (
                <div className="h-full grid place-items-center bg-ironworks2">
                  <div className="text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin mb-3"/><div className="font-mono text-xs tracking-widest text-steel">PARSING MESH...</div></div>
                </div>
              ) : (
                <STLViewer geometry={geometry} onStats={()=>{}} />
              )}
            </div>
          )}
          {file && (<div className="mt-3 flex justify-between items-center text-sm"><div className="flex items-center gap-2 text-bone/70"><FileCheck size={14} className="text-green-400"/><span className="font-medium text-bone">{file.name}</span><span className="font-mono text-xs text-steel">{(file.size/1024/1024).toFixed(2)} MB</span></div><button onClick={()=>{setFile(null);setGeometry(null);setStats(null);setQuote(null)}} className="text-steel hover:text-bone transition-colors underline">Choose different file</button></div>)}
          {file && stats && (
            <div className="mt-6 rounded-sm p-6 bg-ironworks2 border border-ironworks3">
              <div className="font-mono text-xs uppercase tracking-widest mb-5 flex items-center gap-2 text-amber"><Settings size={12}/> 02 — Configure</div>
              <div className="mb-6">
                <div className="font-display font-semibold text-sm mb-3 tracking-wide">MATERIAL</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {(Object.entries(MATERIALS) as [MaterialKey, typeof MATERIALS[MaterialKey]][]).map(([key,m])=>(<button key={key} onClick={()=>setMaterial(key)} className={`p-3 rounded-sm border text-left transition-all ${material===key?"border-amber bg-ironworks":"border-ironworks3 bg-ironworks hover:border-bone/30"}`}><div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full border border-ironworks3 flex-shrink-0" style={{background:m.swatch}}/><span className="font-display font-bold text-sm">{m.label}</span></div><div className="text-xs text-bone/50 leading-tight">{m.desc}</div></button>))}
                </div>
              </div>
              <div className="mb-6">
                <div className="font-display font-semibold text-sm mb-3 tracking-wide">LAYER HEIGHT</div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(QUALITIES) as [QualityKey, typeof QUALITIES[QualityKey]][]).map(([key,q])=>(<button key={key} onClick={()=>setQuality(key)} className={`p-3 rounded-sm border text-center transition-all ${quality===key?"border-amber bg-ironworks":"border-ironworks3 bg-ironworks hover:border-bone/30"}`}><div className="font-mono font-semibold text-base text-amber">{q.label}<span className="text-xs text-steel">mm</span></div><div className="text-xs mt-1 text-bone/50">{q.desc}</div></button>))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-3"><div className="font-display font-semibold text-sm tracking-wide">INFILL</div><div className="font-mono text-sm font-semibold text-amber">{infill}%</div></div>
                <input type="range" min="5" max="100" step="5" value={infill} onChange={e=>setInfill(+e.target.value)} className="w-full"/>
                <div className="flex justify-between font-mono text-xs mt-1 text-steel"><span>LIGHT</span><span>SOLID</span></div>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-sm p-6 sticky top-24 bg-amber text-ironworks">
            <div className="font-mono text-xs uppercase tracking-widest mb-4 flex items-center gap-2 text-ironworks/70"><DollarSign size={12}/> 03 — Your quote</div>
            {!file && (<div className="py-16 text-center text-ironworks/50"><AlertCircle size={32} strokeWidth={1.5} className="mx-auto mb-3"/><div className="text-sm font-medium">Upload a file to see pricing</div></div>)}
            {file && !quote && (<div className="py-16 text-center"><div className="inline-block w-7 h-7 border-2 border-ironworks/20 border-t-ironworks rounded-full animate-spin mb-3"/><div className="font-mono text-xs tracking-widest font-semibold text-ironworks">CALCULATING...</div></div>)}
            {file && quote && stats && (<>
              <div className="mb-6">
                <div className="font-display font-extrabold leading-[0.9]" style={{fontSize:76,letterSpacing:"-0.04em"}}>${quote.price.toFixed(2)}</div>
                <div className="font-mono text-xs mt-3 font-semibold tracking-widest text-ironworks/60">PER UNIT · USD</div>
                {quoteSource && (<div className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-sm text-xs font-mono font-semibold bg-ironworks/10" style={{color:quoteSource==="slicer"?"rgba(15,15,16,0.7)":"rgba(15,15,16,0.5)"}}><span className="w-1.5 h-1.5 rounded-full" style={{background:quoteSource==="slicer"?"#16a34a":"#ca8a04"}}/>{quoteSource==="slicer"?"SLICER ACCURATE":"VOLUME ESTIMATE"}</div>)}
              </div>
              <div className="space-y-3 mb-5 pb-5 border-b border-ironworks/15">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-ironworks/70"><Scale size={14}/><span>Weight</span></div><div className="font-mono text-sm font-bold text-ironworks">{quote.grams} g</div></div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-ironworks/70"><Clock size={14}/><span>Print time</span></div><div className="font-mono text-sm font-bold text-ironworks">{quote.hours} h</div></div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-ironworks/70"><Maximize2 size={14}/><span>Size</span></div><div className="font-mono text-sm font-bold text-ironworks">{stats.dims.x.toFixed(0)}x{stats.dims.y.toFixed(0)}x{stats.dims.z.toFixed(0)} mm</div></div>
              </div>
              <div className="space-y-1.5 mb-6 font-mono text-sm">
                <div className="flex justify-between text-ironworks/65"><span>Material</span><span className="font-semibold text-ironworks">${quote.breakdown.material.toFixed(2)}</span></div>
                <div className="flex justify-between text-ironworks/65"><span>Machine time</span><span className="font-semibold text-ironworks">${quote.breakdown.machine.toFixed(2)}</span></div>
                <div className="flex justify-between text-ironworks/65"><span>Setup</span><span className="font-semibold text-ironworks">${quote.breakdown.setup.toFixed(2)}</span></div>
              </div>
              <button onClick={handleCheckout} disabled={checkingOut} className="font-display w-full py-4 rounded-sm font-bold flex items-center justify-center gap-2 bg-ironworks text-amber hover:bg-black transition-colors tracking-wide disabled:opacity-60 disabled:cursor-not-allowed">
                {checkingOut?(<><span className="inline-block w-4 h-4 border-2 border-amber/30 border-t-amber rounded-full animate-spin"/>REDIRECTING...</>):(<>PAY WITH SQUARE <ArrowRight size={16}/></>)}
              </button>
              {checkoutError && <div className="mt-2 text-sm text-center text-red-700 font-medium">{checkoutError}</div>}
              <div className="w-full mt-3 text-xs text-center text-ironworks/50 font-mono">SECURE CHECKOUT · CARD · APPLE PAY · GOOGLE PAY</div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}
