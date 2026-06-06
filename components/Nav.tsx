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
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(8,8,10,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
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
              className={`relative pb-px transition-colors duration-150 font-medium ${
                pathname === item.href
                  ? "text-amber"
                  : "text-bone/55 hover:text-bone"
              }`}
            >
              {item.label}
              {pathname === item.href && (
                <span
                  className="absolute -bottom-px left-0 right-0 h-px"
                  style={{
                    background: "#ffb547",
                    boxShadow: "0 0 8px rgba(255,181,71,0.9)",
                  }}
                />
              )}
            </Link>
          ))}
          <Link
            href="/quote"
            className="font-display font-bold text-sm text-ironworks px-4 py-2 rounded-xl cursor-pointer transition-opacity duration-150 hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
              boxShadow: "0 0 18px rgba(255,181,71,0.28)",
            }}
          >
            GET A QUOTE
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-bone cursor-pointer"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav
          className="md:hidden border-t px-6 py-4 flex flex-col gap-3"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: "rgba(8,8,10,0.96)",
          }}
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`py-2 text-base font-medium transition-colors duration-150 ${
                pathname === item.href ? "text-amber" : "text-bone/70"
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
