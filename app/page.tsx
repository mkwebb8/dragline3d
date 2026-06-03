import Link from "next/link";
import { ArrowRight, Upload, Cog, Package, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* ─────────── HERO ─────────── */}
      <section className="grid-bg border-b border-ironworks3">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="font-mono text-xs uppercase tracking-widest text-amber mb-6">
            EST 2026 · LOUISVILLE, KENTUCKY
          </div>
          <h1 className="font-display font-black text-6xl md:text-8xl leading-[0.88] mb-8 max-w-4xl">
            Layer<br />
            <span className="text-amber">by layer.</span>
          </h1>
          <p className="text-bone/70 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Industrial-grade FDM 3D printing out of Louisville. Drop a file, get a quote, get a part.
            Quoted Tuesday. Shipped Friday.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="font-display font-bold bg-amber text-ironworks px-6 py-4 rounded-sm hover:bg-amber-dark transition-colors flex items-center gap-2"
            >
              GET A QUOTE <ArrowRight size={18} />
            </Link>
            <Link
              href="/gallery"
              className="font-display font-bold border border-ironworks3 text-bone px-6 py-4 rounded-sm hover:border-bone/40 transition-colors"
            >
              SEE THE WORK
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── STATS BAR ─────────── */}
      <section className="border-b border-ironworks3 bg-ironworks2">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat label="Build volume" value="350mm³" detail="Large-format FDM" />
          <Stat label="Materials" value="11+" detail="Standard & engineering" />
          <Stat label="Layer resolution" value="0.12mm" detail="Down from 0.28" />
          <Stat label="Lead time" value="2–5d" detail="Typical FDM job" />
        </div>
      </section>

      {/* ─────────── PROCESS ─────────── */}
      <section className="py-24 border-b border-ironworks3">
        <div className="max-w-6xl mx-auto px-6">
          <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">
            01 — Process
          </div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-4 max-w-2xl">
            Four steps.<br />
            <span className="text-bone/50">No BS.</span>
          </h2>
          <p className="text-bone/60 max-w-xl mb-16">
            From file upload to finished part. No phone tag, no surprise charges.
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            <Step
              num="01"
              icon={<Upload size={22} />}
              title="Upload"
              body="Drop an STL or 3MF. We render it in 3D so you can confirm geometry before quoting."
            />
            <Step
              num="02"
              icon={<Cog size={22} />}
              title="Configure"
              body="Pick material, layer height, infill, and quantity. Quote updates from real slicer data."
            />
            <Step
              num="03"
              icon={<CheckCircle2 size={22} />}
              title="Approve"
              body="Lock in the price. Pay by card. Receive a confirmation with timeline."
            />
            <Step
              num="04"
              icon={<Package size={22} />}
              title="Receive"
              body="Pick up locally or ship to your door. Every part labeled, packed, and ready."
            />
          </div>
        </div>
      </section>

      {/* ─────────── MATERIALS ─────────── */}
      <section className="py-24 border-b border-ironworks3">
        <div className="max-w-6xl mx-auto px-6">
          <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">
            02 — Materials
          </div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-4 max-w-2xl">
            Eleven plastics.<br />
            <span className="text-bone/50">One nozzle.</span>
          </h2>
          <p className="text-bone/60 max-w-xl mb-16">
            From everyday prototypes to high-temp engineering parts. Don't see what you need?
            Ask — chances are it's on the spool.
          </p>

          {/* STANDARD TIER */}
          <div className="mb-12">
            <div className="font-mono text-xs tracking-widest text-amber mb-4">▸ STANDARD</div>
            <div className="grid md:grid-cols-3 gap-4">
              <Material
                name="PLA"
                desc="General-purpose, biodegradable. Best for prototypes, models, and indoor parts."
                specs={["Easy printing", "Stiff but brittle", "60°C softening"]}
                swatch="#e8e6e1"
              />
              <Material
                name="Pro PCTG"
                desc="Up to 20× tougher than PETG. UV stable, chemical resistant, easy to print."
                specs={["Impact resistant", "UV & chemical stable", "80°C softening"]}
                swatch="#c8d4d1"
              />
              <Material
                name="TPU"
                desc="Flexible rubber-like filament for gaskets, grips, and shock absorbers."
                specs={["Shore 95A", "Tear resistant", "Vibration damping"]}
                swatch="#3a3a3c"
              />
            </div>
          </div>

          {/* ENGINEERING TIER */}
          <div className="mb-12">
            <div className="font-mono text-xs tracking-widest text-amber mb-4">▸ ENGINEERING</div>
            <div className="grid md:grid-cols-3 gap-4">
              <Material
                name="ABS"
                desc="High temperature, impact resistant. Automotive interiors and tooling."
                specs={["Thermally stable", "Solvent weldable", "105°C softening"]}
                swatch="#5a5a5e"
              />
              <Material
                name="ASA"
                desc="ABS's UV-stable cousin. Outdoor parts that need to hold up in the sun."
                specs={["UV resistant", "Weatherproof", "100°C softening"]}
                swatch="#7a7a7e"
              />
              <Material
                name="PET-GF15"
                desc="Glass fiber reinforced PET. Precision jigs, fixtures, and structural parts."
                specs={["Dimensionally stable", "155°C heat resistance", "Low moisture uptake"]}
                swatch="#a8c4b0"
              />
              <Material
                name="PETG-ESD"
                desc="Electrostatic dissipative PETG. For electronics enclosures and sensitive assemblies."
                specs={["ESD safe", "PETG toughness", "Protects sensitive components"]}
                swatch="#4a90d9"
              />
              <Material
                name="PA (Nylon)"
                desc="Wear-resistant and flexible. Gears, living hinges, and load-bearing parts."
                specs={["Low friction", "Fatigue resistant", "180°C softening"]}
                swatch="#d4cfb5"
              />
            </div>
          </div>

          {/* COMPOSITE TIER */}
          <div>
            <div className="font-mono text-xs tracking-widest text-amber mb-4">▸ CARBON FIBER COMPOSITES</div>
            <div className="grid md:grid-cols-3 gap-4">
              <Material
                name="ASA-CF"
                desc="Carbon-reinforced ASA. Stiff, UV stable, and dimensionally precise outdoors."
                specs={["Reduced warping", "UV resistant", "Matte black finish"]}
                swatch="#1a1a1c"
              />
              <Material
                name="PETG-CF"
                desc="Reinforced PETG. Stiffness of carbon with PETG's toughness and weather resistance."
                specs={["Stiff + tough", "UV stable", "Functional parts"]}
                swatch="#1a1a1c"
              />
              <Material
                name="PA-CF"
                desc="Carbon-reinforced nylon. Aerospace-grade strength-to-weight. Top tier."
                specs={["Highest stiffness", "Heat & chemical resistant", "Replaces aluminum in some apps"]}
                swatch="#1a1a1c"
              />
            </div>
          </div>

          <div className="mt-10 font-mono text-xs text-steel max-w-2xl leading-relaxed">
            Engineering and composite materials carry a higher price per gram and may require longer lead times.
            Final pricing reflects material and machine wear.
          </div>
        </div>
      </section>

      {/* ─────────── CTA ─────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display font-black text-5xl md:text-7xl mb-6 leading-[0.9]">
            Got a file?<br />
            <span className="text-amber">Get a quote.</span>
          </h2>
          <p className="text-bone/60 text-lg mb-10 max-w-xl mx-auto">
            Real prices in seconds. No signup, no email gate, no waiting for someone to "circle back."
          </p>
          <Link
            href="/quote"
            className="font-display font-bold inline-flex items-center gap-2 bg-amber text-ironworks px-8 py-5 rounded-sm hover:bg-amber-dark transition-colors text-lg"
          >
            UPLOAD YOUR STL <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] text-steel tracking-widest mb-1">{label.toUpperCase()}</div>
      <div className="font-display font-extrabold text-3xl text-amber">{value}</div>
      <div className="font-mono text-xs text-bone/50 mt-1">{detail}</div>
    </div>
  );
}

function Step({
  num,
  icon,
  title,
  body,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-6 hover:border-amber/40 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="font-mono text-amber text-sm tracking-widest">{num}</div>
        <div className="text-amber">{icon}</div>
      </div>
      <div className="font-display font-extrabold text-2xl mb-3">{title}</div>
      <p className="text-bone/60 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Material({
  name,
  desc,
  specs,
  swatch,
}: {
  name: string;
  desc: string;
  specs: string[];
  swatch: string;
}) {
  return (
    <div className="rounded-sm p-6 bg-ironworks2 border border-ironworks3">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-5 h-5 rounded-full border"
          style={{ background: swatch, borderColor: "#3a3a3c" }}
        />
        <div className="font-display font-extrabold text-3xl">{name}</div>
      </div>
      <p className="text-sm leading-relaxed mb-6 text-bone/60">{desc}</p>
      <ul className="space-y-1.5 font-mono text-xs">
        {specs.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className="text-amber">▸</span>
            <span className="text-bone/70">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
