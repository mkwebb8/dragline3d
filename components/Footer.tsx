import Link from "next/link";
import { Facebook, ArrowUpRight } from "lucide-react";
import { DraglineMark } from "./DraglineMark";
const groups = [
  { title:"Explore", links:[["/capabilities","Capabilities"],["/materials","Materials"],["/gallery","Our Work"],["/catalog","Shop"]] },
  { title:"Company", links:[["/about","About"],["/contact","Contact"],["/account","Account"],["/terms","Terms"]] },
] as const;
export function Footer() { return <footer className="border-t border-white/10 bg-[#090a0b]">
  <div className="public-container py-14 md:py-20"><div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.7fr_.9fr]">
    <div><div className="flex items-center gap-3"><DraglineMark size={34}/><span className="font-display text-xl font-black">DRAGLINE<span className="text-amber">/</span>3D</span></div><p className="body-copy mt-5 max-w-sm">Custom 3D printing for working parts, prototypes, personal projects, gifts, collectibles, and ideas worth making.</p><div className="mt-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.15em] text-steel"><span className="status-dot"/>Louisville, Kentucky</div></div>
    {groups.map(g=><div key={g.title}><div className="mb-4 font-mono text-[10px] uppercase tracking-[.18em] text-amber">{g.title}</div><ul className="space-y-3">{g.links.map(([href,label])=><li key={href}><Link href={href} className="text-sm text-bone/60 hover:text-bone">{label}</Link></li>)}</ul></div>)}
    <div><div className="mb-4 font-mono text-[10px] uppercase tracking-[.18em] text-amber">Start a project</div><p className="text-sm leading-6 text-bone/55">Have a model ready? Upload it for slicer-based pricing.</p><Link href="/quote" className="btn-primary mt-5">Get a Quote<ArrowUpRight size={15}/></Link><a href="https://www.facebook.com/dragline3d" target="_blank" rel="noopener noreferrer" className="mt-5 flex min-h-11 items-center gap-2 text-sm text-bone/55 hover:text-bone"><Facebook size={15}/>Facebook</a></div>
  </div><div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 font-mono text-[9px] uppercase tracking-[.15em] text-steel sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} Dragline 3D LLC</span><span>Useful to unexpected. Layer by layer.</span></div></div>
  </footer>; }
