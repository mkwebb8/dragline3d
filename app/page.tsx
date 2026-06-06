import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Upload, Cog, Package, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden border-b border-ironworks3">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full bg-amber/[0.03] blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-14 pb-20 md:pt-18 md:pb-24">
          {/* Meta bar */}
          <div className="flex items-center gap-5 mb-12 border-b border-ironworks3 pb-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">Est. 2026</span>
            <span className="w-px h-3 bg-ironworks3" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">Louisville, Kentucky</span>
            <span className="w-px h-3 bg-ironworks3" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel hidden sm:inline">FDM Additive Manufacturing</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-black leading-[0.84] tracking-tight mb-12">
            <span className="block text-bone" style={{ fontSize: "clamp(4rem, 11vw, 9.5rem)" }}>LAYER</span>
            <span className="block text-amber" style={{ fontSize: "clamp(4rem, 11vw, 9.5rem)" }}>BY LAYER.</span>
          </h1>

          {/* Body + CTA + spec tags */}
          <div className="grid md:grid-cols-[1fr_auto] gap-10 items-end border-t border-ironworks3 pt-8">
            <div>
              <p className="text-bone/70 text-lg md:text-xl max-w-lg leading-relaxed mb-8">
                Industrial-grade FDM 3D printing out of Louisville. Drop a file,
                get a quote, get a part. Quoted Tuesday. Shipped Friday.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/quote"
                  className="group font-display font-bold bg-amber text-ironworks px-7 py-4 rounded-sm hover:bg-amber-dark transition-colors duration-150 flex items-center gap-2 text-sm cursor-pointer"
                >
                  GET A QUOTE
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                </Link>
                <Link
                  href="/gallery"
                  className="font-display font-bold border border-ironworks3 text-bone/80 px-7 py-4 rounded-sm hover:border-amber/40 hover:text-bone transition-colors duration-150 text-sm cursor-pointer"
                >
                  SEE THE WORK
                </Link>
              </div>
            </div>

            {/* Spec badges */}
            <div className="flex md:flex-col flex-wrap gap-2">
              {[".STL", ".3MF", "350mm³", "0.12mm RES", "11 MATS"].map((tag) => (
                <div key={tag} className="font-mono text-[9px] uppercase tracking-[0.18em] text-steel border border-ironworks3 px-3 py-1.5 rounded-sm whitespace-nowrap">
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── STATS BAR ─────────── */}
      <section className="border-b border-ironworks3 bg-ironworks2">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ironworks3">
            <Stat label="Build volume" value="350mm³" detail="Large-format FDM" />
            <Stat label="Materials" value="11+" detail="Standard & engineering" />
            <Stat label="Layer resolution" value="0.12mm" detail="Down to fine" />
            <Stat label="Lead time" value="2–5d" detail="Typical FDM job" />
          </div>
        </div>
      </section>

      {/* ─────────── PROCESS ─────────── */}
      <section className="py-24 border-b border-ironworks3">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel index="01" label="Process" />

          <div className="grid md:grid-cols-[1fr_2fr] gap-12 mb-16">
            <h2 className="font-display font-black text-5xl md:text-6xl leading-[0.88] tracking-tight">
              Four<br />steps.<br />
              <span className="text-bone/25">No BS.</span>
            </h2>
            <div className="flex items-end">
              <p className="text-bone/60 text-base max-w-md leading-relaxed">
                From file upload to finished part. No phone tag, no surprise charges,
                no waiting for someone to "circle back."
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-px bg-ironworks3">
            <Step num="01" icon={<Upload size={18} />} title="Upload" body="Drop an STL or 3MF. We render it in 3D so you can confirm geometry before quoting." />
            <Step num="02" icon={<Cog size={18} />} title="Configure" body="Pick material, layer height, infill, and quantity. Quote updates from real slicer data." />
            <Step num="03" icon={<CheckCircle2 size={18} />} title="Approve" body="Lock in the price. Pay by card. Receive a confirmation with timeline." />
            <Step num="04" icon={<Package size={18} />} title="Receive" body="Pick up locally or ship to your door. Every part labeled, packed, and ready." />
          </div>
        </div>
      </section>

      {/* ─────────── WHY DRAGLINE ─────────── */}
      <section className="border-b border-ironworks3 bg-ironworks2">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-px bg-ironworks3">
            <Why title="Real slicer data" body="Prices come from actual slicer output — not guesswork. You pay for the material and machine time, nothing more." />
            <Why title="No minimums" body="One part or one hundred. Same quality, same process. Small-run and one-off production is our specialty." />
            <Why title="Louisville-local" body="Based in Louisville, KY. Local pickup available. Talk to the person running your parts, not a ticket queue." />
          </div>
        </div>
      </section>

      {/* ─────────── MATERIALS ─────────── */}
      <section className="py-24 border-b border-ironworks3">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel index="02" label="Materials" />

          <div className="grid md:grid-cols-[1fr_2fr] gap-12 mb-16">
            <h2 className="font-display font-black text-5xl md:text-6xl leading-[0.88] tracking-tight">
              Eleven<br />plastics.<br />
              <span className="text-bone/25">One nozzle.</span>
            </h2>
            <div className="flex items-end">
              <p className="text-bone/60 text-base max-w-md leading-relaxed">
                From everyday prototypes to high-temp engineering parts. Don't see what you need?
                Ask — chances are it's on the spool.
              </p>
            </div>
          </div>

          <div className="space-y-10">
            <MaterialTier
              label="Standard"
              materials={[
                { name: "PLA", desc: "General-purpose, biodegradable. Best for prototypes, models, and indoor parts.", specs: ["Easy printing", "Stiff but brittle", "60°C softening"], swatch: "#e8e6e1" },
                { name: "Pro PCTG", desc: "Up to 20× tougher than PETG. UV stable, chemical resistant, easy to print.", specs: ["Impact resistant", "UV & chemical stable", "80°C softening"], swatch: "#c8d4d1" },
                { name: "TPU", desc: "Flexible rubber-like filament for gaskets, grips, and shock absorbers.", specs: ["Shore 95A", "Tear resistant", "Vibration damping"], swatch: "#6a6a6e" },
              ]}
            />
            <MaterialTier
              label="Engineering"
              materials={[
                { name: "ABS", desc: "High temperature, impact resistant. Automotive interiors and tooling.", specs: ["Thermally stable", "Solvent weldable", "105°C softening"], swatch: "#5a5a5e" },
                { name: "ASA", desc: "ABS's UV-stable cousin. Outdoor parts that need to hold up in the sun.", specs: ["UV resistant", "Weatherproof", "100°C softening"], swatch: "#8a8a8e" },
                { name: "PET-GF15", desc: "Glass fiber reinforced PET. Precision jigs, fixtures, and structural parts.", specs: ["Dimensionally stable", "155°C heat resistance", "Low moisture uptake"], swatch: "#a8c4b0" },
                { name: "PETG-ESD", desc: "Electrostatic dissipative PETG. For electronics enclosures and sensitive assemblies.", specs: ["ESD safe", "PETG toughness", "Protects sensitive components"], swatch: "#4a90d9" },
                { name: "PA (Nylon)", desc: "Wear-resistant and flexible. Gears, living hinges, and load-bearing parts.", specs: ["Low friction", "Fatigue resistant", "180°C softening"], swatch: "#d4cfb5" },
              ]}
            />
            <MaterialTier
              label="Carbon Fiber Composites"
              materials={[
                { name: "ASA-CF", desc: "Carbon-reinforced ASA. Stiff, UV stable, and dimensionally precise outdoors.", specs: ["Reduced warping", "UV resistant", "Matte black finish"], swatch: "#3a3a3c" },
                { name: "PETG-CF", desc: "Reinforced PETG. Stiffness of carbon with PETG's toughness and weather resistance.", specs: ["Stiff + tough", "UV stable", "Functional parts"], swatch: "#2e2e30" },
                { name: "PA-CF", desc: "Carbon-reinforced nylon. Aerospace-grade strength-to-weight. Top tier.", specs: ["Highest stiffness", "Heat & chemical resistant", "Replaces aluminum in some apps"], swatch: "#ffb547" },
              ]}
            />
          </div>

          <p className="mt-10 font-mono text-xs text-steel max-w-2xl leading-relaxed border-t border-ironworks3 pt-6">
            Engineering and composite materials carry a higher price per gram and may require longer lead times.
            Final pricing reflects material and machine wear.
          </p>
        </div>
      </section>

      {/* ─────────── CTA ─────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-8">
            Ready to build?
          </div>
          <h2
            className="font-display font-black leading-[0.88] tracking-tight mb-8"
            style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}
          >
            Got a file?<br />
            <span className="text-amber">Get a quote.</span>
          </h2>
          <p className="text-bone/60 text-lg mb-10 max-w-xl leading-relaxed">
            Real prices in seconds. No signup, no email gate, no waiting for someone to "circle back."
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="group font-display font-bold inline-flex items-center gap-2 bg-amber text-ironworks px-8 py-5 rounded-sm hover:bg-amber-dark transition-colors duration-150 text-base cursor-pointer"
            >
              UPLOAD YOUR STL
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform duration-150" />
            </Link>
            <Link
              href="/contact"
              className="font-display font-bold inline-flex items-center border border-ironworks3 text-bone/80 px-8 py-5 rounded-sm hover:border-amber/40 hover:text-bone transition-colors duration-150 text-base cursor-pointer"
            >
              CONTACT US
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Section label with extending rule ─── */
function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-16">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber whitespace-nowrap">
        {index} — {label}
      </div>
      <div className="flex-1 h-px bg-ironworks3" />
    </div>
  );
}

/* ─── Stat cell ─── */
function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-ironworks2 px-6 py-8">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-steel mb-2">{label}</div>
      <div className="font-display font-black text-4xl text-amber leading-none mb-1">{value}</div>
      <div className="font-mono text-xs text-bone/40">{detail}</div>
    </div>
  );
}

/* ─── Process step card ─── */
function Step({
  num,
  icon,
  title,
  body,
}: {
  num: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-ironworks p-8 hover:bg-ironworks2 transition-colors duration-150 group cursor-default">
      <div className="flex items-center justify-between mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">{num}</div>
        <div className="text-amber/60 group-hover:text-amber transition-colors duration-150">{icon}</div>
      </div>
      <div className="font-display font-black text-2xl mb-3 group-hover:text-amber transition-colors duration-150">
        {title}
      </div>
      <p className="text-bone/50 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

/* ─── Why Dragline card ─── */
function Why({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-ironworks px-8 py-10">
      <div className="w-8 h-0.5 bg-amber mb-6" />
      <div className="font-display font-extrabold text-lg mb-3">{title}</div>
      <p className="text-bone/50 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

/* ─── Material tier wrapper ─── */
type MaterialProps = {
  name: string;
  desc: string;
  specs: string[];
  swatch: string;
};

function MaterialTier({ label, materials }: { label: string; materials: MaterialProps[] }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber">▸ {label}</div>
        <div className="flex-1 h-px bg-ironworks3" />
      </div>
      <div className="grid md:grid-cols-3 gap-px bg-ironworks3">
        {materials.map((m) => (
          <Material key={m.name} name={m.name} desc={m.desc} specs={m.specs} swatch={m.swatch} />
        ))}
      </div>
    </div>
  );
}

/* ─── Material card ─── */
function Material({ name, desc, specs, swatch }: MaterialProps) {
  return (
    <div
      className="bg-ironworks p-6 hover:bg-ironworks2 transition-colors duration-150 group cursor-default border-l-2"
      style={{ borderLeftColor: swatch }}
    >
      <div className="font-display font-black text-2xl mb-3 group-hover:text-amber transition-colors duration-150">
        {name}
      </div>
      <p className="text-bone/50 text-sm leading-relaxed mb-5">{desc}</p>
      <ul className="space-y-1 font-mono text-xs">
        {specs.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className="text-amber/50">▸</span>
            <span className="text-bone/60">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
