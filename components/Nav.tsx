"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { DraglineMark } from "./DraglineMark";

const links = [
  { href: "/", label: "Home" }, { href: "/capabilities", label: "Capabilities" },
  { href: "/materials", label: "Materials" }, { href: "/gallery", label: "Our Work" },
  { href: "/catalog", label: "Shop" }, { href: "/account", label: "Account" },
];
export function Nav() {
  const pathname = usePathname(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0c0d]/95 backdrop-blur-xl">
    <div className="public-container flex h-[72px] items-center justify-between gap-6">
      <Link href="/" className="flex min-h-11 items-center gap-3" aria-label="Dragline 3D home"><DraglineMark size={34}/><div><div className="font-display text-lg font-black leading-none tracking-tight">DRAGLINE<span className="text-amber">/</span>3D</div><div className="mt-1 font-mono text-[8px] uppercase tracking-[.19em] text-steel">Additive manufacturing</div></div></Link>
      <nav className="hidden lg:flex items-center gap-1" aria-label="Primary navigation">{links.map(l=><Link key={l.href} href={l.href} className={`flex min-h-11 items-center px-3 text-[13px] font-semibold transition-colors ${active(l.href)?"text-amber":"text-[#aaa8a1] hover:text-bone"}`}>{l.label}</Link>)}<Link href="/quote" className="btn-primary ml-3">Get a Quote<ArrowUpRight size={15}/></Link></nav>
      <button className="flex h-11 w-11 items-center justify-center rounded-md border border-white/15 text-bone lg:hidden" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open?"Close navigation":"Open navigation"}>{open?<X size={21}/>:<Menu size={21}/>}</button>
    </div>
    {open && <nav id="mobile-menu" className="border-t border-white/10 bg-[#0b0c0d] px-3 pb-5 pt-3 lg:hidden" aria-label="Mobile navigation"><div className="mx-auto flex max-w-content flex-col">{links.map(l=><Link key={l.href} href={l.href} className={`flex min-h-12 items-center border-b border-white/[.06] px-3 font-semibold ${active(l.href)?"text-amber":"text-bone/75"}`}>{l.label}</Link>)}<Link href="/quote" className="btn-primary mt-4 w-full">Get a Quote<ArrowUpRight size={15}/></Link></div></nav>}
  </header>;
}
