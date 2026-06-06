"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { DraglineMark } from "./DraglineMark";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/quote", label: "Quote" },
  { href: "/gallery", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "My Orders" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-ironworks3 bg-ironworks sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <DraglineMark size={38} />
          <div>
            <div className="font-display font-extrabold text-xl leading-none">
              DRAGLINE<span className="text-amber">.</span>
              <span className="text-amber text-sm font-bold ml-1">3D</span>
            </div>
            <div className="font-mono text-[10px] text-steel tracking-[0.18em] mt-1">
              ADDITIVE MFG · LOUISVILLE KY
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors font-medium ${
                pathname === item.href ? "text-amber" : "text-bone/70 hover:text-bone"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/quote"
            className="font-display font-bold text-sm bg-amber text-ironworks px-4 py-2 rounded-sm hover:bg-amber-dark transition-colors"
          >
            GET A QUOTE
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-bone"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden border-t border-ironworks3 bg-ironworks2 px-6 py-4 flex flex-col gap-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`py-2 text-base font-medium ${
                pathname === item.href ? "text-amber" : "text-bone/80"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
