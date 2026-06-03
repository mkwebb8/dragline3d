import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-12">
        <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">
          About
        </div>
        <h1 className="font-display font-black text-5xl md:text-7xl leading-[0.92] mb-5">
          One printer.<br />
          <span className="text-amber">Done right.</span>
        </h1>
      </div>

      <div className="prose prose-invert max-w-none space-y-6 text-bone/80 text-lg leading-relaxed">
        <p>
          Dragline 3D is a woman-owned additive manufacturing shop in Louisville, Kentucky.
          Industrial-grade large-format FDM printing across eleven-plus filaments — from
          everyday PLA and Pro PCTG to engineering-grade nylons and carbon-fiber composites —
          for prototypes, replacement parts, fixtures, jigs, and small production runs.
        </p>

        <p>
          The name comes from a spider's <em>dragline</em>: the strongest silk thread it
          spins, the one that anchors every web and catches its weight when it falls.
          It's also the heaviest cable in mining. Both meanings land on the same thing —
          parts that hold up under load. That's the promise.
        </p>

        <h2 className="font-display font-extrabold text-3xl text-bone pt-8">
          What I do.
        </h2>

        <p>
          Single parts to short runs (≤100 units). One-off prototypes, replacement parts
          for things that broke, custom enclosures, brackets, jigs, fixtures, and any
          part where a 350×350×350mm FDM print makes sense. If you can model it, send the
          file. If you can't, send a sketch and we'll figure it out.
        </p>

        <h2 className="font-display font-extrabold text-3xl text-bone pt-8">
          What we don't do.
        </h2>

        <p>
          Resin printing, metal, multi-color production work, or anything that requires
          higher resolution than what FDM can deliver. If your part needs that, we will tell
          you up front and point you toward a shop that can.
        </p>

        <h2 className="font-display font-extrabold text-3xl text-bone pt-8">
          How we work.
        </h2>

        <p>
          You upload a file, get a real quote, approve it, and pay. I print it on a
          calibrated machine with profiled materials. You get the part in your hands in
          2–5 business days (pending stock), locally or shipped to your door. Every quote is firm — no surprise
          charges. Every part is checked before it ships.
        </p>

        <h2 className="font-display font-extrabold text-3xl text-bone pt-8">
          Why bother.
        </h2>

        <p>
          Because the alternative is hunting down a CAD-literate manufacturer, waiting
          for someone to "circle back" with pricing, getting a quote three days later
          with a $200 setup fee, and finding out they can't actually do FDM in PCTG
          anyway. Dragline 3D is for the parts that should take a phone call but somehow
          take a week. We cut the week out.
        </p>
      </div>

      <div className="mt-16 pt-12 border-t border-ironworks3 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <div className="font-display font-extrabold text-2xl">Ready to print?</div>
          <div className="text-bone/60 mt-1">Get a quote in under a minute.</div>
        </div>
        <Link
          href="/quote"
          className="font-display font-bold inline-flex items-center gap-2 bg-amber text-ironworks px-6 py-4 rounded-sm hover:bg-amber-dark transition-colors"
        >
          GET A QUOTE <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
