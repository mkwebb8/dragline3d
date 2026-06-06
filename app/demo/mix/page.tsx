import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function MixDemo() {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 10% 70%, rgba(255,181,71,0.08) 0%, transparent 55%), radial-gradient(ellipse at 90% 10%, rgba(255,181,71,0.05) 0%, transparent 50%), #08080b",
      }}
    >
      {/* Ambient glow orbs — glassmorphism layer */}
      <div
        className="absolute top-10 left-1/3 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,181,71,0.055) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute -bottom-20 right-10 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,181,71,0.04) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-28">

        {/* Cinematic sparse top bar */}
        <div className="flex items-center justify-between border-b pb-6 mb-28" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">
            Dragline 3D · Est. 2026
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber" style={{ boxShadow: "0 0 6px rgba(255,181,71,0.8)" }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">
              Louisville, Kentucky
            </span>
          </div>
        </div>

        {/* Cinematic headline scale + glassmorphism glow halo */}
        <div className="relative mb-28">
          {/* Subtle glow behind headline */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 30% 50%, rgba(255,181,71,0.06) 0%, transparent 60%)",
              filter: "blur(40px)",
            }}
          />
          <h1
            className="font-display font-black leading-[0.82] tracking-tight relative"
            style={{ fontSize: "clamp(4.5rem, 14vw, 13rem)" }}
          >
            <span className="block text-bone">Layer</span>
            <span
              className="block"
              style={{
                WebkitTextStroke: "2px #ffb547",
                color: "transparent",
                textShadow: "0 0 80px rgba(255,181,71,0.15)",
              }}
            >
              by layer.
            </span>
          </h1>
        </div>

        {/* Cinematic two-col layout + glassmorphism treatment on right */}
        <div className="grid md:grid-cols-2 gap-16 border-t pt-12" style={{ borderColor: "rgba(255,255,255,0.07)" }}>

          {/* Left — cinematic body copy */}
          <div className="flex flex-col justify-between gap-10">
            <p className="text-bone/65 text-lg leading-relaxed max-w-md">
              Industrial-grade FDM 3D printing out of Louisville. Drop a file,
              get a quote, get a part. Quoted Tuesday. Shipped Friday.
              No phone tag, no surprise charges.
            </p>

            {/* Glassmorphism-style CTA button with glow */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/quote"
                className="group inline-flex items-center gap-2 font-display font-bold text-sm text-ironworks px-7 py-4 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
                  boxShadow: "0 0 32px rgba(255,181,71,0.35), 0 4px 16px rgba(0,0,0,0.4)",
                }}
              >
                GET A QUOTE
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-150" />
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center font-display font-bold text-sm text-bone/70 px-7 py-4 rounded-xl cursor-pointer transition-all duration-200 hover:text-bone"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                SEE THE WORK
              </Link>
            </div>
          </div>

          {/* Right — glassmorphism floating stat cards */}
          <div className="flex flex-col justify-between gap-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: "350mm³", l: "Build Volume",    sub: "Large-format FDM" },
                { v: "11+",    l: "Materials",        sub: "Std. & engineering" },
                { v: "0.12mm", l: "Layer Resolution", sub: "Fine detail" },
                { v: "2–5d",   l: "Lead Time",        sub: "Typical FDM job" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-steel mb-2">{s.l}</div>
                  <div
                    className="font-display font-black text-3xl leading-none mb-1"
                    style={{ color: "#ffb547", textShadow: "0 0 20px rgba(255,181,71,0.25)" }}
                  >
                    {s.v}
                  </div>
                  <div className="font-mono text-[9px] text-bone/30">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Bottom detail line — cinematic */}
            <div className="border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-steel/50">
                Standard · Engineering · Carbon Fiber Composites
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 font-mono text-[9px] uppercase tracking-[0.2em] text-steel/25 text-center">
          Style: Glassmorphism Dark × Cinematic — dragline3d.com
        </div>
      </div>
    </div>
  );
}
