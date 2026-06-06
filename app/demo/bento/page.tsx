import Link from "next/link";
import { ArrowRight, Upload, Cog, CheckCircle2, Package } from "lucide-react";

export default function BentoDemo() {
  return (
    <div className="bg-ironworks min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-20">
        {/* Top label */}
        <div className="flex items-center justify-between mb-6">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-steel">
            Dragline 3D · Additive Manufacturing
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber">
            Est. 2026
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-3 auto-rows-[minmax(0,auto)]">

          {/* Hero headline — 8 cols */}
          <div className="col-span-12 md:col-span-8 bg-ironworks2 border border-ironworks3 rounded-xl p-10 flex flex-col justify-between min-h-[300px]">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber">
              Industrial FDM · Louisville, KY
            </div>
            <div>
              <h1
                className="font-display font-black leading-[0.86] tracking-tight mb-4"
                style={{ fontSize: "clamp(2.8rem, 7vw, 6.5rem)" }}
              >
                Layer<br />
                <span className="text-amber">by layer.</span>
              </h1>
              <p className="text-bone/50 text-sm max-w-sm leading-relaxed">
                Industrial-grade FDM 3D printing. Drop a file, get a quote, get a part.
              </p>
            </div>
          </div>

          {/* CTA card — amber — 4 cols */}
          <div className="col-span-12 md:col-span-4 bg-amber rounded-xl p-8 flex flex-col justify-between min-h-[300px]">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ironworks/50">
              Start now
            </div>
            <div>
              <div className="font-display font-black text-ironworks text-2xl leading-tight mb-6">
                Upload your file.<br />Get a quote.
              </div>
              <Link
                href="/quote"
                className="w-full flex items-center justify-center gap-2 bg-ironworks text-amber font-display font-bold text-sm py-3.5 rounded-lg cursor-pointer hover:bg-ironworks2 transition-colors duration-150"
              >
                GET A QUOTE <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* 4 stat cards */}
          {[
            { v: "350", unit: "mm³", l: "Build Volume" },
            { v: "11",  unit: "+",   l: "Materials" },
            { v: "0.12",unit: "mm",  l: "Resolution" },
            { v: "2–5", unit: "d",   l: "Lead Time" },
          ].map((s) => (
            <div
              key={s.l}
              className="col-span-6 md:col-span-3 bg-ironworks2 border border-ironworks3 rounded-xl p-6"
            >
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-3">{s.l}</div>
              <div className="font-display font-black text-4xl leading-none">
                <span className="text-bone">{s.v}</span>
                <span className="text-amber">{s.unit}</span>
              </div>
            </div>
          ))}

          {/* Process card — wide */}
          <div className="col-span-12 md:col-span-8 bg-ironworks2 border border-ironworks3 rounded-xl p-8">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber mb-6">
              How it works
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { n: "01", icon: <Upload size={16} />, t: "Upload" },
                { n: "02", icon: <Cog size={16} />, t: "Configure" },
                { n: "03", icon: <CheckCircle2 size={16} />, t: "Approve" },
                { n: "04", icon: <Package size={16} />, t: "Receive" },
              ].map((step) => (
                <div key={step.n} className="bg-ironworks border border-ironworks3 rounded-lg p-4">
                  <div className="font-mono text-[9px] text-amber mb-3">{step.n}</div>
                  <div className="text-amber/70 mb-2">{step.icon}</div>
                  <div className="font-display font-black text-sm text-bone">{step.t}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Location card */}
          <div className="col-span-12 md:col-span-4 bg-ironworks2 border border-ironworks3 rounded-xl p-8 flex flex-col justify-between">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel">Location</div>
            <div>
              <div className="font-display font-black text-2xl leading-tight mb-2">
                Louisville,<br />
                <span className="text-amber">Kentucky</span>
              </div>
              <div className="font-mono text-[10px] text-bone/40">Local pickup · USPS ship</div>
            </div>
          </div>

          {/* Materials teaser — full width */}
          <div className="col-span-12 bg-ironworks2 border border-ironworks3 rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber">Materials · 11 available</div>
              <Link href="/quote" className="font-mono text-[9px] uppercase tracking-[0.2em] text-bone/40 hover:text-bone transition-colors cursor-pointer">
                View all →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {["PLA", "Pro PCTG", "TPU", "ABS", "ASA", "PET-GF15", "PETG-ESD", "PA", "ASA-CF", "PETG-CF", "PA-CF"].map((m) => (
                <div
                  key={m}
                  className="font-mono text-[10px] uppercase tracking-wider text-bone/70 bg-ironworks border border-ironworks3 px-3 py-1.5 rounded-md"
                >
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 font-mono text-[9px] uppercase tracking-[0.2em] text-steel/30 text-center">
          Style: Bento Grid — dragline3d.com
        </div>
      </div>
    </div>
  );
}
