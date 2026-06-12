import Link from "next/link";
import { Facebook } from "lucide-react";
import { DraglineMark } from "./DraglineMark";

const FACEBOOK_URL = "https://www.facebook.com/dragline3d";

export function Footer() {
  return (
    <footer className="mt-24 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <DraglineMark size={34} />
              <div className="font-display font-extrabold text-xl leading-none">
                DRAGLINE<span className="text-amber">.</span>
                <span className="text-amber text-sm font-bold ml-1">3D</span>
              </div>
            </div>
            <div
              className="font-display font-black text-2xl mb-4 leading-tight"
              style={{ WebkitTextStroke: "1.5px #ffb547", color: "transparent" }}
            >
              Layer by layer.
            </div>
            <p className="text-bone/45 text-sm leading-relaxed max-w-xs">
              Industrial-grade FDM additive manufacturing out of Louisville, Kentucky.
              Functional parts, fast turnaround, fair prices.
            </p>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber mb-5">Shop</div>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/quote",   label: "Get a quote" },
                { href: "/gallery", label: "Work" },
                { href: "/about",   label: "About" },
                { href: "/contact", label: "Contact" },
                { href: "/terms",   label: "Terms & Conditions" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-bone/50 hover:text-bone transition-colors duration-150"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber mb-5">Contact</div>
            <ul className="space-y-3 text-sm text-bone/50">
              <li>info@dragline3d.com</li>
              <li>Louisville, KY</li>
              <li className="text-bone/30 text-xs pt-1">Local pickup available</li>
              <li className="pt-1">
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-bone/50 hover:text-bone transition-colors duration-150 cursor-pointer">
                  <Facebook size={13} />
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div
          className="border-t pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel">
            © {new Date().getFullYear()} Dragline 3D LLC · All rights reserved.
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,181,71,0.35)" }}>
            Layer by layer<span style={{ color: "#ffb547" }}>.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
