"use client";
export const runtime = "edge";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Box, Image as ImageIcon, ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};

type CatalogItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string;
  file_name: string;
  image_url: string | null;
  published: boolean;
  sort_order: number;
};

export default function PublicCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/catalog")
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.category) set.add(i.category); });
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const filtered = category === "All" ? items : items.filter(i => i.category === category);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/" className="text-steel hover:text-bone transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </Link>
        <div className="font-display font-extrabold text-2xl">Design Catalog</div>
      </div>
      <div className="font-mono text-xs text-steel mb-8">
        ROYALTY-FREE PRINTS - $12 MINIMUM, PLUS MATERIAL COST FOR ADDITIONAL ITEMS
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3 py-1.5 rounded-lg font-mono text-xs cursor-pointer transition-colors"
              style={{
                border: `1px solid ${category === c ? "rgba(255,181,71,0.5)" : "rgba(255,255,255,0.09)"}`,
                color: category === c ? "#ffb547" : "rgba(240,236,229,0.6)",
                background: category === c ? "rgba(255,181,71,0.08)" : "transparent",
              }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-24">
          <div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(item => (
            <div key={item.id} className="rounded-xl overflow-hidden flex flex-col" style={glass}>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-steel/30">
                    <Box size={28} />
                    <span className="font-mono text-[9px]">NO PREVIEW</span>
                  </div>
                )}
                {item.category && (
                  <div className="absolute top-2 right-2 font-mono text-[9px] font-bold px-2 py-0.5 rounded text-ironworks"
                    style={{ background: "#ffb547" }}>
                    {item.category}
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="font-display font-bold text-base mb-1">{item.title || "Untitled"}</div>
                {item.description && (
                  <p className="text-bone/40 text-xs leading-relaxed line-clamp-3 mb-4">{item.description}</p>
                )}
                <button
                  onClick={() => router.push(`/quote?catalog=${item.id}`)}
                  className="mt-auto flex items-center justify-center gap-2 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
                  Order This <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-24 text-steel">
              <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
              <div className="font-mono text-xs">No designs available yet - check back soon</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
