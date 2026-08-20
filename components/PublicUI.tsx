import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function SectionIntro({ eyebrow, title, copy, action }: { eyebrow: string; title: ReactNode; copy?: string; action?: { href: string; label: string } }) {
  return <div className="grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-end mb-10 md:mb-14"><div><div className="eyebrow mb-5">{eyebrow}</div><h2 className="display-lg">{title}</h2></div>{(copy || action) && <div className="lg:pb-1"><p className="body-copy max-w-xl">{copy}</p>{action && <Link href={action.href} className="btn-quiet mt-5">{action.label}<ArrowRight size={15}/></Link>}</div>}</div>;
}
export function PageHero({ eyebrow, title, accent, copy, actions }: { eyebrow: string; title: string; accent?: string; copy: string; actions?: ReactNode }) {
  return <section className="relative overflow-hidden border-b border-white/10"><div className="technical-grid absolute inset-0 pointer-events-none"/><div className="public-container relative py-16 sm:py-20 lg:py-28"><div className="eyebrow mb-7">{eyebrow}</div><h1 className="display-xl max-w-5xl">{title} {accent && <span className="text-amber">{accent}</span>}</h1><div className="mt-8 md:mt-10 grid gap-7 md:grid-cols-[1fr_auto] md:items-end border-t border-white/10 pt-7"><p className="body-lg max-w-2xl">{copy}</p>{actions && <div className="flex flex-wrap gap-3">{actions}</div>}</div></div></section>;
}
export function SpecLabel({ children }: { children: ReactNode }) { return <span className="font-mono text-[10px] uppercase tracking-[.16em] text-steel">{children}</span>; }
export function EmptyState({ title, copy, icon }: { title: string; copy: string; icon?: ReactNode }) { return <div className="surface rounded-xl px-6 py-16 text-center"><div className="text-steel flex justify-center mb-4">{icon}</div><h3 className="heading-md mb-3">{title}</h3><p className="body-copy mx-auto max-w-md">{copy}</p></div>; }
export function LoadingGrid() { return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading content">{[0,1,2].map(i=><div key={i} className="surface h-80 rounded-xl animate-pulse" />)}</div>; }
