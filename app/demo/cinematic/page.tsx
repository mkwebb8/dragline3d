import Link from "next/link";

export default function CinematicDemo() {
  return (
    <div className="bg-ironworks min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">

        {/* Top bar — thin, sparse */}
        <div className="flex items-center justify-between mb-28 border-b border-ironworks3 pb-6">
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">
            Dragline 3D · Est. 2026
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">
            Louisville, Kentucky
          </span>
        </div>

        {/* Giant headline — outline second line */}
        <div className="mb-28">
          <h1
            className="font-display font-black leading-[0.82] tracking-tight"
            style={{ fontSize: "clamp(4.5rem, 14vw, 13rem)" }}
          >
            <span className="block text-bone">Layer</span>
            <span
              className="block"
              style={{
                WebkitTextStroke: "2px #ffb547",
                color: "transparent",
              }}
            >
              by layer.
            </span>
          </h1>
        </div>

        {/* Two-column footer row */}
        <div className="grid md:grid-cols-2 gap-16 border-t border-ironworks3 pt-12">
          {/* Left — body copy */}
          <div>
            <p className="text-bone/65 text-lg leading-relaxed max-w-md mb-10">
              Industrial-grade FDM 3D printing out of Louisville. Drop a file,
              get a quote, get a part. Quoted Tuesday. Shipped Friday.
              No phone tag, no surprise charges.
            </p>
            <Link
              href="/quote"
              className="inline-block font-display font-black text-sm uppercase tracking-[0.15em] text-bone border-b-2 border-amber pb-0.5 hover:text-amber transition-colors duration-150 cursor-pointer"
            >
              Upload your STL →
            </Link>
          </div>

          {/* Right — stats + secondary CTA */}
          <div className="flex flex-col justify-between gap-10">
            <div className="grid grid-cols-3 gap-8">
              {[
                ["350mm³", "Build"],
                ["11+",    "Materials"],
                ["2–5d",   "Lead time"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display font-black text-3xl md:text-4xl text-amber leading-none mb-1">{v}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel">{l}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-ironworks3 pt-8">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-3">
                FDM Additive Manufacturing
              </div>
              <p className="text-bone/40 text-xs leading-relaxed font-mono">
                Standard · Engineering · Carbon Fiber Composites<br />
                Local pickup or USPS shipping from Louisville, KY
              </p>
            </div>
          </div>
        </div>

        <div className="mt-24 font-mono text-[9px] uppercase tracking-[0.2em] text-steel/30 text-center">
          Style: Cinematic / Editorial — dragline3d.com
        </div>
      </div>
    </div>
  );
}
