import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DraglineMark } from "@/components/DraglineMark";

const glass = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
} as CSSProperties;

const softBorder = { borderColor: "rgba(255,255,255,0.07)" } as CSSProperties;

const PROJECTS = [
  { title: "Custom enclosure",    client: "Local electronics shop",  material: "PETG",    notes: "Snap-fit lid, threaded inserts for repeated access." },
  { title: "Replacement bracket", client: "Industrial maintenance",  material: "ABS",     notes: "Reverse-engineered from a broken OEM part, 30% infill, cost less than the original." },
  { title: "Production jig",      client: "Manufacturing client",    material: "PETG",    notes: "Run-of-50 fixture for a small assembly line. Iterated twice in a week." },
  { title: "Architectural model", client: "Design studio",           material: "PLA",     notes: "1:50 scale building section. Fine layer height for clean facade detail." },
  { title: "Cable management",    client: "Home install",            material: "PETG",    notes: "Custom wall plates and clips matched to existing trim." },
  { title: "Prototype housing",   client: "Hardware startup",        material: "ABS",     notes: "Three iterations to dial in fit before tooling. Cheaper than CNC for early rounds." },
];

export default function GalleryPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient orb */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,181,71,0.055) 0%, transparent 65%)", filter: "blur(70px)" }} />

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
        {/* Cinematic top bar */}
        <div className="flex items-center justify-between border-b pb-6 mb-20" style={softBorder}>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">The Work</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">Dragline 3D</span>
        </div>

        {/* Headline */}
        <div className="mb-20">
          <h1 className="font-display font-black leading-[0.82] tracking-tight"
            style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)" }}>
            <span className="block text-bone">Real parts.</span>
            <span className="block"
              style={{ WebkitTextStroke: "2px #ffb547", color: "transparent",
                textShadow: "0 0 60px rgba(255,181,71,0.12)" }}>
              Real customers.
            </span>
          </h1>
        </div>

        {/* Body intro */}
        <div className="border-t pt-10 mb-16" style={softBorder}>
          <p className="text-bone/60 text-lg leading-relaxed max-w-xl">
            A selection of recent work. Every part shipped, every client repeat.
            Custom photography incoming — placeholders until then.
          </p>
        </div>

        {/* Project cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROJECTS.map((p, i) => (
            <div key={i} className="rounded-xl overflow-hidden group cursor-default transition-all duration-200"
              style={{ ...glass }}>
              {/* Placeholder visual */}
              <div className="aspect-[4/3] grid-bg grid place-items-center relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.015)" }}>
                <div className="opacity-10 group-hover:opacity-20 transition-opacity duration-200">
                  <DraglineMark size={100} />
                </div>
                <div className="absolute top-3 left-3 font-mono text-[9px] tracking-[0.2em] text-steel">
                  #{String(i + 1).padStart(3, "0")}
                </div>
                <div className="absolute top-3 right-3 font-mono text-[9px] tracking-[0.15em] text-ironworks font-bold px-2 py-1 rounded-md"
                  style={{ background: "#ffb547", boxShadow: "0 0 12px rgba(255,181,71,0.4)" }}>
                  {p.material}
                </div>
              </div>
              <div className="p-6">
                <div className="font-display font-black text-xl mb-1 group-hover:text-amber transition-colors duration-150">
                  {p.title}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber/70 mb-3">
                  {p.client}
                </div>
                <p className="text-bone/50 text-sm leading-relaxed">{p.notes}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <h2 className="font-display font-black leading-[0.88] tracking-tight mb-8"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
            <span className="block text-bone">Your part</span>
            <span className="block"
              style={{ WebkitTextStroke: "1.5px #ffb547", color: "transparent" }}>
              could be next.
            </span>
          </h2>
          <p className="text-bone/50 mb-8 text-base">Upload a file and get a quote in under a minute.</p>
          <Link href="/quote"
            className="group inline-flex items-center gap-2 font-display font-bold text-ironworks text-sm px-7 py-4 rounded-xl cursor-pointer transition-opacity duration-150 hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
              boxShadow: "0 0 28px rgba(255,181,71,0.30)" }}>
            GET A QUOTE
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
        </div>
      </div>
    </div>
  );
}
