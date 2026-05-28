import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DraglineMark } from "@/components/DraglineMark";

// Replace with real project data once you have photos
const PROJECTS = [
  {
    title: "Custom enclosure",
    client: "Local electronics shop",
    material: "PETG",
    notes: "Snap-fit lid, threaded inserts for repeated access.",
  },
  {
    title: "Replacement bracket",
    client: "Industrial maintenance",
    material: "ABS",
    notes: "Reverse-engineered from a broken OEM part, 30% infill, cost less than the original.",
  },
  {
    title: "Production jig",
    client: "Manufacturing client",
    material: "PETG",
    notes: "Run-of-50 fixture for a small assembly line. Iterated twice in a week.",
  },
  {
    title: "Architectural model",
    client: "Design studio",
    material: "PLA",
    notes: "1:50 scale building section. Fine layer height for clean facade detail.",
  },
  {
    title: "Cable management",
    client: "Home install",
    material: "PETG",
    notes: "Custom wall plates and clips matched to existing trim.",
  },
  {
    title: "Prototype housing",
    client: "Hardware startup",
    material: "ABS",
    notes: "Three iterations to dial in fit before tooling. Cheaper than CNC for early rounds.",
  },
];

export default function GalleryPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12 max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">
          The Work
        </div>
        <h1 className="font-display font-black text-5xl md:text-7xl leading-[0.92] mb-5">
          Real parts.<br />
          <span className="text-amber">Real customers.</span>
        </h1>
        <p className="text-bone/70 text-lg leading-relaxed max-w-xl">
          A selection of recent work. Every part shipped, every client repeat.
          Custom photography incoming — placeholders until then.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROJECTS.map((p, i) => (
          <div
            key={i}
            className="bg-ironworks2 border border-ironworks3 rounded-sm overflow-hidden hover:border-amber/40 transition-colors group"
          >
            {/* Placeholder visual */}
            <div className="aspect-[4/3] bg-ironworks grid-bg grid place-items-center relative overflow-hidden">
              <div className="opacity-15 group-hover:opacity-25 transition-opacity">
                <DraglineMark size={120} />
              </div>
              <div className="absolute top-3 left-3 font-mono text-[10px] tracking-widest text-steel">
                #{String(i + 1).padStart(3, "0")}
              </div>
              <div className="absolute top-3 right-3 font-mono text-[10px] tracking-widest text-amber bg-ironworks/80 px-2 py-1 rounded-sm">
                {p.material}
              </div>
            </div>
            <div className="p-5">
              <div className="font-display font-extrabold text-lg mb-1">{p.title}</div>
              <div className="font-mono text-[10px] tracking-widest text-amber mb-3">
                {p.client.toUpperCase()}
              </div>
              <p className="text-bone/60 text-sm leading-relaxed">{p.notes}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center max-w-2xl mx-auto">
        <h2 className="font-display font-black text-4xl md:text-5xl mb-5 leading-[0.95]">
          Your part could be next.
        </h2>
        <p className="text-bone/60 mb-8">
          Upload a file and get a quote in under a minute.
        </p>
        <Link
          href="/quote"
          className="font-display font-bold inline-flex items-center gap-2 bg-amber text-ironworks px-7 py-4 rounded-sm hover:bg-amber-dark transition-colors"
        >
          GET A QUOTE <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
