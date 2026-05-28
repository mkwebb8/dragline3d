import Link from "next/link";
import { DraglineMark } from "./DraglineMark";

export function Footer() {
  return (
    <footer className="border-t border-ironworks3 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <DraglineMark size={36} />
              <div className="font-display font-extrabold text-xl">
                DRAGLINE<span className="text-amber">.</span>
                <span className="text-amber text-sm font-bold ml-1">3D</span>
              </div>
            </div>
            <div className="font-display font-extrabold text-2xl mb-2">
              Layer by layer<span className="text-amber">.</span>
            </div>
            <p className="text-bone/60 text-sm leading-relaxed max-w-sm">
              Industrial-grade FDM additive manufacturing out of Louisville, Kentucky.
              Functional parts, fast turnaround, fair prices.
            </p>
          </div>

          <div>
            <div className="font-mono text-xs text-amber tracking-widest mb-4">SHOP</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/quote" className="text-bone/70 hover:text-bone">Get a quote</Link></li>
              <li><Link href="/gallery" className="text-bone/70 hover:text-bone">Work</Link></li>
              <li><Link href="/about" className="text-bone/70 hover:text-bone">About</Link></li>
              <li><Link href="/contact" className="text-bone/70 hover:text-bone">Contact</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-xs text-amber tracking-widest mb-4">CONTACT</div>
            <ul className="space-y-2 text-sm text-bone/70">
              <li>info@dragline3d.com</li>
              <li>Louisville, KY</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ironworks3 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="font-mono text-xs text-steel tracking-widest">
            © {new Date().getFullYear()} DRAGLINE 3D
          </div>
          <div className="font-mono text-xs text-steel tracking-widest">
            LAYER BY LAYER<span className="text-amber">.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
