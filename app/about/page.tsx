import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const glass = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
} as CSSProperties;

const softBorder = { borderColor: "rgba(255,255,255,0.07)" } as CSSProperties;

export default function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient orb */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,181,71,0.06) 0%, transparent 65%)", filter: "blur(80px)" }} />

      <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-24">
        {/* Cinematic top bar */}
        <div className="flex items-center justify-between border-b pb-6 mb-20" style={softBorder}>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">About</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">Dragline 3D</span>
        </div>

        {/* Headline */}
        <div className="mb-20">
          <h1 className="font-display font-black leading-[0.82] tracking-tight"
            style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)" }}>
            <span className="block text-bone">One printer.</span>
            <span className="block"
              style={{ WebkitTextStroke: "2px #ffb547", color: "transparent",
                textShadow: "0 0 60px rgba(255,181,71,0.12)" }}>
              Done right.
            </span>
          </h1>
        </div>

        {/* Lead paragraph */}
        <div className="border-t pt-12 mb-16" style={softBorder}>
          <p className="text-bone/70 text-xl leading-relaxed max-w-2xl">
            Dragline 3D is a woman-owned additive manufacturing shop in Louisville, Kentucky.
            Industrial-grade large-format FDM printing across eleven-plus filaments — from
            everyday PLA and Pro PCTG to engineering-grade nylons and carbon-fiber composites —
            for prototypes, replacement parts, fixtures, jigs, and small production runs.
          </p>
        </div>

        {/* Body sections */}
        <div className="space-y-16">
          <AboutSection label="The name">
            <p>
              Dragline 3D is named after a spider's <em className="text-bone/80 not-italic font-medium">dragline</em>: the strongest silk
              thread it spins, the one that anchors every web and catches its weight when it falls.
              It's also the heaviest cable in mining. Both meanings land on the same thing —
              parts that hold up under load. That's the promise.
            </p>
          </AboutSection>

          <AboutSection label="What we do">
            <p>
              Single parts to short runs (≤100 units). One-off prototypes, replacement parts
              for things that broke, custom enclosures, brackets, jigs, fixtures, and any
              part where a 400×400×400mm FDM print makes sense. If you can model it, send the
              file. If you can't, send a sketch and we'll figure it out.
            </p>
          </AboutSection>

          <AboutSection label="What we don't do">
            <p>
              Resin printing, metal, multi-color production work, or anything that requires
              higher resolution than what FDM can deliver. If your part needs that, we will tell
              you up front and point you toward a shop that can.
            </p>
          </AboutSection>

          <AboutSection label="How we work">
            <p>
              You upload a file, get a real quote, approve it, and pay. We print it on a
              calibrated machine with profiled materials. You get the part in your hands in
              2–5 business days (pending stock), locally or shipped to your door. Every quote
              is firm — no surprise charges. Every part is checked before it ships.
            </p>
          </AboutSection>

          <AboutSection label="Why bother">
            <p>
              Because the alternative is hunting down a CAD-literate manufacturer, waiting
              for someone to "circle back" with pricing, getting a quote three days later
              with a $200 setup fee, and finding out they can't actually do FDM in PCTG
              anyway. Dragline 3D is for the parts that should take a phone call but somehow
              take a week. We cut the week out.
            </p>
          </AboutSection>
        </div>

        {/* CTA */}
        <div className="mt-20 rounded-2xl p-10 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center"
          style={glass}>
          <div>
            <div className="font-display font-black text-2xl mb-2">Ready to print?</div>
            <div className="text-bone/50 text-sm">Get a quote in under a minute.</div>
          </div>
          <Link href="/quote"
            className="group inline-flex items-center gap-2 font-display font-bold text-ironworks text-sm px-6 py-4 rounded-xl cursor-pointer transition-opacity duration-150 hover:opacity-90 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
              boxShadow: "0 0 24px rgba(255,181,71,0.30)" }}>
            GET A QUOTE
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function AboutSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-8 border-t pt-8" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber pt-1">{label}</div>
      <div className="text-bone/65 text-base leading-relaxed">{children}</div>
    </div>
  );
}
