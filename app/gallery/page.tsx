"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Play, Facebook } from "lucide-react";

const FACEBOOK_URL = "https://www.facebook.com/dragline3d";
import { DraglineMark } from "@/components/DraglineMark";

const glass = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
} as CSSProperties;

const softBorder = { borderColor: "rgba(255,255,255,0.07)" } as CSSProperties;


type GalleryItem = {
  id: string;
  title: string;
  client: string | null;
  material: string;
  notes: string | null;
  image_url: string | null;
  video_url: string | null;
  sort_order: number;
};

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gallery")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Ambient orb */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,181,71,0.055) 0%, transparent 65%)", filter: "blur(70px)" }} />

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
        {/* Cinematic top bar */}
        <div className="flex items-center justify-between border-b pb-6 mb-20" style={softBorder}>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">The Work</span>
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-steel hover:text-bone transition-colors duration-150 cursor-pointer">
            <Facebook size={11} />
            Follow on Facebook
          </a>
        </div>

        {/* Headline */}
        <div className="mb-20">
          <h1 className="font-display font-black leading-[0.82] tracking-tight"
            style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)" }}>
            <span className="block text-bone">Real parts.</span>
            <span className="block"
              style={{ WebkitTextStroke: "2px #ffb547", color: "transparent",
                textShadow: "0 0 60px rgba(255,181,71,0.12)" }}>
              Real customers.
            </span>
          </h1>
        </div>

        {/* Body intro */}
        <div className="border-t pt-10 mb-16" style={softBorder}>
          <p className="text-bone/60 text-lg leading-relaxed max-w-xl">
            A selection of recent work. Every part shipped, every client repeat.
          </p>
        </div>

        {/* Gallery grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((p, i) => {
              const hasMedia = !!(p.image_url || p.video_url);
              const isVideo = !p.image_url && !!p.video_url;

              return (
                <div key={p.id} className="rounded-xl overflow-hidden group transition-all duration-200" style={glass}>
                  {/* Media area */}
                  <div className="aspect-[4/3] relative overflow-hidden flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.015)" }}>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : p.video_url ? (
                      <a href={p.video_url} target="_blank" rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center group/vid cursor-pointer"
                        style={{ background: "rgba(255,255,255,0.015)" }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover/vid:scale-110 duration-200"
                          style={{ background: "rgba(255,181,71,0.18)", border: "1px solid rgba(255,181,71,0.35)" }}>
                          <Play size={22} className="text-amber ml-1" />
                        </div>
                      </a>
                    ) : (
                      /* Coming Soon placeholder */
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="opacity-10 group-hover:opacity-20 transition-opacity duration-200">
                          <DraglineMark size={80} />
                        </div>
                        <span className="font-mono text-[9px] tracking-[0.2em] text-steel/50 uppercase">Coming Soon</span>
                      </div>
                    )}

                    {/* Number badge */}
                    {!hasMedia && (
                      <div className="absolute top-3 left-3 font-mono text-[9px] tracking-[0.2em] text-steel">
                        #{String(i + 1).padStart(3, "0")}
                      </div>
                    )}

                    {/* Material badge */}
                    <div className="absolute top-3 right-3 font-mono text-[9px] tracking-[0.15em] text-ironworks font-bold px-2 py-1 rounded-md"
                      style={{ background: "#ffb547", boxShadow: "0 0 12px rgba(255,181,71,0.4)" }}>
                      {p.material}
                    </div>

                    {/* Video label */}
                    {isVideo && (
                      <div className="absolute top-3 left-3 font-mono text-[9px] text-bone/50 flex items-center gap-1">
                        <Play size={9} /> VIDEO
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="p-6">
                    <div className="font-display font-black text-xl mb-1 group-hover:text-amber transition-colors duration-150">
                      {p.title}
                    </div>
                    {p.client && (
                      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber/70 mb-3">
                        {p.client}
                      </div>
                    )}
                    {p.notes && (
                      <p className="text-bone/50 text-sm leading-relaxed">{p.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Follow on Facebook CTA */}
        <div className="mt-12 mb-4 flex justify-center">
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 font-mono text-xs text-bone/50 hover:text-bone transition-colors cursor-pointer">
            <Facebook size={14} />
            See more on our Facebook page
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <h2 className="font-display font-black leading-[0.88] tracking-tight mb-8"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
            <span className="block text-bone">Your part</span>
            <span className="block"
              style={{ WebkitTextStroke: "1.5px #ffb547", color: "transparent" }}>
              could be next.
            </span>
          </h2>
          <p className="text-bone/50 mb-8 text-base">Upload a file and get a quote in under a minute.</p>
          <Link href="/quote"
            className="group inline-flex items-center gap-2 font-display font-bold text-ironworks text-sm px-7 py-4 rounded-xl cursor-pointer transition-opacity duration-150 hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
              boxShadow: "0 0 28px rgba(255,181,71,0.30)" }}>
            GET A QUOTE
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
        </div>
      </div>
    </div>
  );
}
