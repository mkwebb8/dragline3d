import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function GlassDemo() {
  return (
    <div
      className="min-h-screen relative"
      style={{
        background:
          "radial-gradient(ellipse at 15% 60%, rgba(255,181,71,0.10) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(255,181,71,0.07) 0%, transparent 50%), #08080a",
      }}
    >
      {/* Ambient orbs */}
      <div
        className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,181,71,0.06) 0%, transparent 70%)", filter: "blur(40px)" }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,181,71,0.04) 0%, transparent 70%)", filter: "blur(60px)" }}
      />

      <div className="relative max-w-6xl mx-auto px-6 pt-14 pb-20">
        {/* Main glass card */}
        <div
          className="rounded-2xl p-10 md:p-16 relative overflow-hidden mb-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 80px rgba(255,181,71,0.05), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* Inner glow top-right */}
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,181,71,0.18) 0%, transparent 70%)", filter: "blur(30px)" }}
          />

          <div className="relative">
            {/* Pill badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-10"
              style={{ background: "rgba(255,181,71,0.10)", border: "1px solid rgba(255,181,71,0.20)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
                Est. 2026 · Louisville, KY · FDM Additive Mfg
              </span>
            </div>

            <h1
              className="font-display font-black leading-[0.86] tracking-tight mb-8"
              style={{ fontSize: "clamp(3.5rem, 10vw, 8.5rem)" }}
            >
              Layer<br />
              <span className="text-amber">by layer.</span>
            </h1>

            <p className="text-bone/60 text-lg max-w-xl leading-relaxed mb-10">
              Industrial-grade FDM 3D printing out of Louisville. Drop a file,
              get a quote, get a part. Quoted Tuesday. Shipped Friday.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/quote"
                className="group inline-flex items-center gap-2 font-display font-bold text-sm text-ironworks px-7 py-4 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
                  boxShadow: "0 0 32px rgba(255,181,71,0.35), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                GET A QUOTE
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-150" />
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center font-display font-bold text-sm text-bone/80 px-7 py-4 rounded-xl cursor-pointer transition-all duration-200 hover:text-bone"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(8px)",
                }}
              >
                SEE THE WORK
              </Link>
            </div>
          </div>
        </div>

        {/* Floating stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { v: "350mm³", l: "Build Volume" },
            { v: "11+", l: "Materials" },
            { v: "0.12mm", l: "Resolution" },
            { v: "2–5d", l: "Lead Time" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl p-6 text-center"
              style={{
                background: "rgba(255,255,255,0.025)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="font-display font-black text-3xl text-amber mb-1">{s.v}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-steel">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Label */}
        <div className="mt-10 font-mono text-[9px] uppercase tracking-[0.2em] text-steel/40 text-center">
          Style: Glassmorphism Dark — dragline3d.com
        </div>
      </div>
    </div>
  );
}
