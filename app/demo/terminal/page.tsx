import Link from "next/link";

export default function TerminalDemo() {
  return (
    <div
      className="min-h-screen relative"
      style={{ background: "#050507" }}
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 4px)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-20">

        {/* System status bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 mb-8 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ border: "1px solid rgba(255,181,71,0.20)" }}
        >
          <span className="text-amber/50">DRAGLINE-3D :: SYS v2.6.0</span>
          <span className="text-amber/40 hidden md:block">38.2527°N 85.7585°W · LOUISVILLE KY</span>
          <span className="flex items-center gap-2 text-amber/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            ONLINE
          </span>
        </div>

        {/* Main terminal block */}
        <div
          className="relative p-8 md:p-14 mb-3"
          style={{
            border: "1px solid rgba(255,181,71,0.18)",
            boxShadow: "0 0 60px rgba(255,181,71,0.05), inset 0 0 100px rgba(255,181,71,0.02)",
          }}
        >
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-5 h-5" style={{ borderTop: "2px solid #ffb547", borderLeft: "2px solid #ffb547", transform: "translate(-1px,-1px)" }} />
          <div className="absolute top-0 right-0 w-5 h-5" style={{ borderTop: "2px solid #ffb547", borderRight: "2px solid #ffb547", transform: "translate(1px,-1px)" }} />
          <div className="absolute bottom-0 left-0 w-5 h-5" style={{ borderBottom: "2px solid #ffb547", borderLeft: "2px solid #ffb547", transform: "translate(-1px,1px)" }} />
          <div className="absolute bottom-0 right-0 w-5 h-5" style={{ borderBottom: "2px solid #ffb547", borderRight: "2px solid #ffb547", transform: "translate(1px,1px)" }} />

          {/* Terminal prompt header */}
          <div className="font-mono text-[10px] text-amber/35 mb-8 leading-relaxed">
            <div>&gt; SYSTEM INITIALIZED — FDM_PRINT_SERVICE ACTIVE</div>
            <div>&gt; BUILD_QUEUE: READY · MATERIAL_BANK: LOADED · PRINTER: ONLINE</div>
          </div>

          {/* Headline */}
          <h1
            className="font-mono font-bold leading-[0.86] mb-10"
            style={{
              fontSize: "clamp(3rem, 10vw, 9rem)",
              color: "#ffb547",
              textShadow: "0 0 40px rgba(255,181,71,0.45), 0 0 80px rgba(255,181,71,0.15)",
            }}
          >
            LAYER<br />BY LAYER.
          </h1>

          {/* Body copy as terminal output */}
          <div className="font-mono text-sm text-bone/55 mb-10 max-w-xl leading-relaxed">
            <span className="text-amber/40">&gt;_ </span>
            Industrial-grade FDM 3D printing · Louisville, KY<br />
            <span className="text-amber/40">&gt;_ </span>
            Drop a file. Get a quote. Get a part.<br />
            <span className="text-amber/40">&gt;_ </span>
            Quoted Tuesday. Shipped Friday.
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="font-mono text-sm text-ironworks font-bold px-6 py-3.5 cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                background: "#ffb547",
                boxShadow: "0 0 24px rgba(255,181,71,0.40)",
              }}
            >
              [ GET_QUOTE.exe ]
            </Link>
            <Link
              href="/gallery"
              className="font-mono text-sm font-bold px-6 py-3.5 cursor-pointer transition-colors duration-150 hover:bg-amber/5"
              style={{
                color: "#ffb547",
                border: "1px solid rgba(255,181,71,0.35)",
              }}
            >
              [ VIEW_WORK ]
            </Link>
          </div>
        </div>

        {/* Stats as terminal readout */}
        <div className="grid grid-cols-4 gap-px" style={{ background: "rgba(255,181,71,0.08)" }}>
          {[
            ["350mm³", "BUILD_VOL"],
            ["11+",    "MATERIALS"],
            ["0.12mm", "RESOLUTION"],
            ["2–5d",   "LEAD_TIME"],
          ].map(([v, l]) => (
            <div key={l} className="px-6 py-6" style={{ background: "#050507" }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber/35 mb-2">{l}</div>
              <div
                className="font-mono font-bold text-2xl"
                style={{ color: "#ffb547", textShadow: "0 0 16px rgba(255,181,71,0.35)" }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Footer line */}
        <div className="mt-8 font-mono text-[9px] uppercase tracking-[0.2em] text-amber/20 text-center">
          Style: Cyberpunk / Terminal — dragline3d.com
        </div>
      </div>
    </div>
  );
}
