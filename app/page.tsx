import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Upload, Cog, Package, CheckCircle2 } from "lucide-react";

/* ─── Shared glass style ─── */
const glass = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
} as CSSProperties;

const softBorder = { borderColor: "rgba(255,255,255,0.07)" } as CSSProperties;

export default function Home() {
  return (
    <>
      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[700px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,181,71,0.07) 0%, transparent 65%)", filter: "blur(70px)" }} />
          <div className="absolute -bottom-20 right-10 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,181,71,0.04) 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20">
          {/* Cinematic top bar */}
          <div className="flex items-center justify-between border-b pb-6 mb-28" style={softBorder}>
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">
              Dragline 3D · Est. 2026
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber"
                style={{ boxShadow: "0 0 6px rgba(255,181,71,0.9)" }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel hidden sm:inline">
                Louisville, Kentucky
              </span>
            </div>
          </div>

          {/* Cinematic headline */}
          <div className="mb-28">
            <h1 className="font-display font-black leading-[0.82] tracking-tight"
              style={{ fontSize: "clamp(4.5rem, 14vw, 13rem)" }}>
              <span className="block text-bone">Layer</span>
              <span className="block"
                style={{ WebkitTextStroke: "2px #ffb547", color: "transparent",
                  textShadow: "0 0 80px rgba(255,181,71,0.12)" }}>
                by layer.
              </span>
            </h1>
          </div>

          {/* Two-col: body + glass stats */}
          <div className="grid md:grid-cols-2 gap-16 border-t pt-12" style={softBorder}>
            {/* Left */}
            <div className="flex flex-col justify-between gap-10">
              <p className="text-bone/65 text-lg leading-relaxed max-w-md">
                Industrial-grade FDM 3D printing out of Louisville. Drop a file,
                get a quote, get a part. Quoted Tuesday. Shipped Friday.
                No phone tag, no surprise charges.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/quote"
                  className="group inline-flex items-center gap-2 font-display font-bold text-sm text-ironworks px-7 py-4 rounded-xl cursor-pointer transition-opacity duration-150 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
                    boxShadow: "0 0 32px rgba(255,181,71,0.35), 0 4px 16px rgba(0,0,0,0.4)" }}>
                  GET A QUOTE
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                </Link>
                <Link href="/gallery"
                  className="inline-flex items-center font-display font-bold text-sm text-bone/70 px-7 py-4 rounded-xl cursor-pointer hover:text-bone transition-colors duration-150"
                  style={glass}>
                  SEE THE WORK
                </Link>
              </div>
            </div>

            {/* Right — glass stat cards */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "350mm³", l: "Build Volume",    s: "Large-format FDM" },
                  { v: "11+",    l: "Materials",        s: "Std. & engineering" },
                  { v: "0.12mm", l: "Layer Resolution", s: "Fine detail" },
                  { v: "2–5d",   l: "Lead Time",        s: "Typical FDM job" },
                ].map((stat) => (
                  <div key={stat.l} className="rounded-xl p-5" style={glass}>
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-steel mb-2">{stat.l}</div>
                    <div className="font-display font-black text-3xl leading-none mb-1"
                      style={{ color: "#ffb547", textShadow: "0 0 20px rgba(255,181,71,0.25)" }}>
                      {stat.v}
                    </div>
                    <div className="font-mono text-[9px] text-bone/30">{stat.s}</div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4" style={softBorder}>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-steel/50">
                  Standard · Engineering · Carbon Fiber Composites
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── PROCESS ─────────── */}
      <section className="py-28 border-t" style={softBorder}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel index="01" label="Process" />
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 mb-16">
            <h2 className="font-display font-black leading-[0.88] tracking-tight"
              style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)" }}>
              Four<br />steps.<br />
              <span className="block"
                style={{ WebkitTextStroke: "1.5px rgba(232,230,225,0.25)", color: "transparent" }}>
                No BS.
              </span>
            </h2>
            <div className="flex items-end">
              <p className="text-bone/55 text-base leading-relaxed max-w-md">
                From file upload to finished part. No phone tag, no surprise charges,
                no waiting for someone to "circle back."
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <Step num="01" icon={<Upload size={18} />} title="Upload"
              body="Drop an STL or 3MF. We render it in 3D so you can confirm geometry before quoting." />
            <Step num="02" icon={<Cog size={18} />} title="Configure"
              body="Pick material, layer height, infill, and quantity. Quote updates from real slicer data." />
            <Step num="03" icon={<CheckCircle2 size={18} />} title="Approve"
              body="Lock in the price. Pay by card. Receive a confirmation with timeline." />
            <Step num="04" icon={<Package size={18} />} title="Receive"
              body="Pick up locally or ship to your door. Every part labeled, packed, and ready." />
          </div>
        </div>
      </section>

      {/* ─────────── WHY DRAGLINE ─────────── */}
      <section className="py-6 border-t" style={softBorder}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-3">
            <Why title="Real slicer data"
              body="Prices come from actual slicer output — not guesswork. You pay for material and machine time, nothing more." />
            <Why title="No minimums"
              body="One part or one hundred. Same quality, same process. Small-run and one-off production is our specialty." />
            <Why title="Louisville-local"
              body="Based in Louisville, KY. Local pickup available. Talk to the person running your parts, not a ticket queue." />
          </div>
        </div>
      </section>

      {/* ─────────── MATERIALS ─────────── */}
      <section className="py-28 border-t" style={softBorder}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel index="02" label="Materials" />
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 mb-16">
            <h2 className="font-display font-black leading-[0.88] tracking-tight"
              style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)" }}>
              Eleven<br />plastics.<br />
              <span className="block"
                style={{ WebkitTextStroke: "1.5px rgba(232,230,225,0.25)", color: "transparent" }}>
                One nozzle.
              </span>
            </h2>
            <div className="flex items-end">
              <p className="text-bone/55 text-base leading-relaxed max-w-md">
                From everyday prototypes to high-temp engineering parts. Don't see
                what you need? Ask — chances are it's on the spool.
              </p>
            </div>
          </div>

          <div className="space-y-10">
            <MaterialTier label="Standard" materials={[
              { name: "PLA",      desc: "General-purpose, biodegradable. Best for prototypes, models, and indoor parts.",         specs: ["Easy printing", "Stiff but brittle", "60°C softening"],           swatch: "#e8e6e1" },
              { name: "Pro PCTG", desc: "Up to 20× tougher than PETG. UV stable, chemical resistant, easy to print.",            specs: ["Impact resistant", "UV & chemical stable", "80°C softening"],      swatch: "#c8d4d1" },
              { name: "TPU",      desc: "Flexible rubber-like filament for gaskets, grips, and shock absorbers.",                 specs: ["Shore 95A", "Tear resistant", "Vibration damping"],                  swatch: "#6a6a6e" },
            ]} />
            <MaterialTier label="Engineering" materials={[
              { name: "ABS",      desc: "High temperature, impact resistant. Automotive interiors and tooling.",                  specs: ["Thermally stable", "Solvent weldable", "105°C softening"],          swatch: "#5a5a5e" },
              { name: "ASA",      desc: "ABS's UV-stable cousin. Outdoor parts that need to hold up in the sun.",                 specs: ["UV resistant", "Weatherproof", "100°C softening"],                  swatch: "#8a8a8e" },
              { name: "PET-GF15", desc: "Glass fiber reinforced PET. Precision jigs, fixtures, and structural parts.",            specs: ["Dimensionally stable", "155°C heat resistance", "Low moisture"],     swatch: "#a8c4b0" },
              { name: "PETG-ESD", desc: "Electrostatic dissipative PETG. For electronics enclosures and sensitive assemblies.",   specs: ["ESD safe", "PETG toughness", "Protects sensitive components"],       swatch: "#4a90d9" },
              { name: "PA (Nylon)",desc: "Wear-resistant and flexible. Gears, living hinges, and load-bearing parts.",            specs: ["Low friction", "Fatigue resistant", "180°C softening"],              swatch: "#d4cfb5" },
            ]} />
            <MaterialTier label="Carbon Fiber Composites" materials={[
              { name: "ASA-CF",   desc: "Carbon-reinforced ASA. Stiff, UV stable, and dimensionally precise outdoors.",           specs: ["Reduced warping", "UV resistant", "Matte black finish"],            swatch: "#3a3a3c" },
              { name: "PETG-CF",  desc: "Reinforced PETG. Stiffness of carbon with PETG's toughness and weather resistance.",     specs: ["Stiff + tough", "UV stable", "Functional parts"],                   swatch: "#2e2e30" },
              { name: "PA-CF",    desc: "Carbon-reinforced nylon. Aerospace-grade strength-to-weight. Top tier.",                 specs: ["Highest stiffness", "Heat & chemical resistant", "Replaces aluminum"],swatch: "#ffb547" },
            ]} />
          </div>

          <p className="mt-10 font-mono text-xs text-steel/60 max-w-2xl leading-relaxed border-t pt-6" style={softBorder}>
            Engineering and composite materials carry a higher price per gram and may require longer lead times.
            Final pricing reflects material and machine wear.
          </p>
        </div>
      </section>

      {/* ─────────── CTA ─────────── */}
      <section className="py-32 relative overflow-hidden border-t" style={softBorder}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,181,71,0.07) 0%, transparent 65%)", filter: "blur(80px)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel mb-12">Ready to build?</div>
          <h2 className="font-display font-black leading-[0.82] tracking-tight mb-12"
            style={{ fontSize: "clamp(3.5rem, 11vw, 10rem)" }}>
            <span className="block text-bone">Got a file?</span>
            <span className="block"
              style={{ WebkitTextStroke: "2px #ffb547", color: "transparent",
                textShadow: "0 0 60px rgba(255,181,71,0.12)" }}>
              Get a quote.
            </span>
          </h2>
          <p className="text-bone/55 text-lg mb-10 max-w-xl leading-relaxed">
            Real prices in seconds. No signup, no email gate, no waiting for
            someone to "circle back."
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/quote"
              className="group inline-flex items-center gap-2 font-display font-bold text-ironworks text-base px-8 py-5 rounded-xl cursor-pointer transition-opacity duration-150 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
                boxShadow: "0 0 40px rgba(255,181,71,0.35), 0 4px 20px rgba(0,0,0,0.5)" }}>
              UPLOAD YOUR STL
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform duration-150" />
            </Link>
            <Link href="/contact"
              className="inline-flex items-center font-display font-bold text-bone/70 text-base px-8 py-5 rounded-xl cursor-pointer hover:text-bone transition-colors duration-150"
              style={glass}>
              CONTACT US
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Helpers ─── */

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-16">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber whitespace-nowrap">
        {index} — {label}
      </div>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

function Step({ num, icon, title, body }: { num: string; icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl p-8 pb-10 group cursor-default relative overflow-hidden transition-all duration-200 hover:border-amber/20"
      style={{ ...glass }}>
      <div aria-hidden="true"
        className="absolute -right-2 -top-4 font-display font-black leading-none select-none pointer-events-none"
        style={{ fontSize: "clamp(5rem,9vw,7.5rem)", color: "rgba(255,255,255,0.04)" }}>
        {num}
      </div>
      <div className="relative">
        <div className="text-amber/70 mb-6 group-hover:text-amber transition-colors duration-150">{icon}</div>
        <div className="font-display font-black text-2xl mb-3 group-hover:text-amber transition-colors duration-150">{title}</div>
        <p className="text-bone/45 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Why({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl px-8 py-10" style={glass}>
      <div className="w-8 h-0.5 mb-6" style={{ background: "#ffb547", boxShadow: "0 0 12px rgba(255,181,71,0.6)" }} />
      <div className="font-display font-extrabold text-lg mb-3">{title}</div>
      <p className="text-bone/45 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

type MaterialProps = { name: string; desc: string; specs: string[]; swatch: string };

function MaterialTier({ label, materials }: { label: string; materials: MaterialProps[] }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber">▸ {label}</div>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {materials.map((m) => (
          <Material key={m.name} name={m.name} desc={m.desc} specs={m.specs} swatch={m.swatch} />
        ))}
      </div>
    </div>
  );
}

function Material({ name, desc, specs, swatch }: MaterialProps) {
  return (
    <div className="rounded-xl p-6 group cursor-default transition-all duration-200 border-l-2"
      style={{ ...glass, borderLeftColor: swatch }}>
      <div className="font-display font-black text-3xl mb-3 group-hover:text-amber transition-colors duration-150">{name}</div>
      <p className="text-bone/45 text-sm leading-relaxed mb-5">{desc}</p>
      <ul className="space-y-1.5 font-mono text-xs">
        {specs.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span style={{ color: "rgba(255,181,71,0.5)" }}>▸</span>
            <span className="text-bone/55">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
