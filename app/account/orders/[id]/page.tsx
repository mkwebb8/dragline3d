"use client";
export const runtime = 'edge';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Truck, RotateCcw, ExternalLink, Loader2 } from "lucide-react";
import type { CSSProperties } from "react";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};

const STATUS_LABELS: Record<string, string> = { pending: "Payment Pending", received: "Order Received", queued: "In Queue", printing: "Printing", quality_check: "Quality Check", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const STATUS_COLORS: Record<string, string> = { pending: "#6b7280", received: "#3b82f6", queued: "#f59e0b", printing: "#f97316", quality_check: "#a855f7", shipped: "#22c55e", delivered: "#16a34a", cancelled: "#ef4444" };

export default function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderStep, setReorderStep] = useState<string>("");
  const [reorderError, setReorderError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push("/account"); return; }
      const email = data.session.user.email || "";
      const res = await fetch(`/api/account/orders/${id}?email=${encodeURIComponent(email)}`);
      if (res.ok) setOrder(await res.json());
      setLoading(false);
    });
  }, [id, router]);

  async function handleReorder() {
    if (!order?.order_items?.length) return;
    setReorderLoading(true);
    setReorderError(null);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/account"); return; }
      const email = session.user.email || "";

      // Step 1: Get order items
      setReorderStep("Loading order…");
      const filesRes = await fetch(`/api/account/orders/${id}/files?email=${encodeURIComponent(email)}`);
      if (!filesRes.ok) throw new Error("Could not load order details.");
      const { orderItems } = await filesRes.json();

      // Step 2: Fetch each unique file via proxy (browser → Cloudflare Pages → TrueNAS)
      const uniqueFileNames = [...new Set((orderItems as any[]).map((i: any) => i.file_name))] as string[];
      const fileMap: Record<string, File> = {};

      for (let i = 0; i < uniqueFileNames.length; i++) {
        const fileName = uniqueFileNames[i];
        setReorderStep(`Retrieving file ${i + 1} of ${uniqueFileNames.length}…`);
        try {
          const res = await fetch(
            `/api/account/orders/${id}/file?email=${encodeURIComponent(email)}&fileName=${encodeURIComponent(fileName)}`
          );
          if (res.ok) {
            const blob = await res.blob();
            const ext = fileName.split('.').pop()?.toLowerCase() || 'stl';
            const mimeType = ext === '3mf' ? 'model/3mf' : 'application/octet-stream';
            fileMap[fileName] = new File([blob], fileName, { type: mimeType });
          }
        } catch {
          console.warn(`Could not retrieve file: ${fileName}`);
        }
      }

      // Step 3: Re-slice each item
      const pricingRes = await fetch("/api/pricing");
      const livePricing: Record<string, number> = pricingRes.ok ? await pricingRes.json() : {};

      const cartItems = await Promise.all(
        orderItems.map(async (item: any, idx: number) => {
          setReorderStep(`Slicing part ${idx + 1} of ${orderItems.length}…`);
          const file = fileMap[item.file_name];
          const itemId = Math.random().toString(36).slice(2, 10);

          if (file) {
            try {
              const form = new FormData();
              form.append("stl", file);
              form.append("material", item.material);
              form.append("quality", item.quality);
              form.append("infill", String(item.infill));
              if (livePricing[item.material]) form.append("costPerKg", String(livePricing[item.material]));

              const sliceRes = await fetch("/api/slice", { method: "POST", body: form });
              const sliceData = await sliceRes.json();

              if (sliceData.price && !sliceData.fallback) {
                return {
                  id: itemId,
                  file,
                  fileName: item.file_name,
                  material: item.material,
                  quality: item.quality,
                  infill: item.infill,
                  qty: item.qty || 1,
                  color: item.color || "Midnight Black",
                  stats: { dims: { x: 0, y: 0, z: 0 }, volumeMm3: 0 },
                  quote: {
                    grams: sliceData.grams,
                    hours: sliceData.hours,
                    price: sliceData.price,
                    fromSlicer: true,
                    breakdown: sliceData.breakdown,
                  },
                  geometry: null,
                };
              }
            } catch {
              console.warn(`Slicer failed for ${item.file_name}, using stored price`);
            }
          }

          // Fallback: use stored price
          return {
            id: itemId,
            file: file || null,
            fileName: item.file_name,
            material: item.material,
            quality: item.quality,
            infill: item.infill,
            qty: item.qty || 1,
            color: item.color || "Midnight Black",
            stats: { dims: { x: 0, y: 0, z: 0 }, volumeMm3: 0 },
            quote: {
              grams: item.grams || 0,
              hours: item.hours || 0,
              price: item.price,
              fromSlicer: true,
              breakdown: { material: 0, machine: 0, setup: 0 },
            },
            geometry: null,
          };
        })
      );

      // Step 4: Save to localStorage and navigate
      setReorderStep("Loading your cart…");
      const serializable = cartItems.map((i: any) => ({
        id: i.id,
        fileName: i.fileName,
        material: i.material,
        quality: i.quality,
        infill: i.infill,
        qty: i.qty,
        color: i.color,
        stats: i.stats,
        quote: i.quote,
      }));
      localStorage.setItem("dragline_cart", JSON.stringify(serializable));

      // Stash files in sessionStorage for quote page
      const fileCache: Record<string, { base64: string; mimeType: string }> = {};
      for (const [fileName, file] of Object.entries(fileMap)) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        fileCache[fileName] = { base64: btoa(binary), mimeType: file.type };
      }
      sessionStorage.setItem("dragline_reorder_files", JSON.stringify(fileCache));

      router.push("/quote");
    } catch (e: any) {
      setReorderError(e.message || "Something went wrong. Please try again.");
    } finally {
      setReorderLoading(false);
      setReorderStep("");
    }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-center">
      <div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" />
    </div>
  );
  if (!order) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-bone/50">Order not found</div>;

  const statusColor = STATUS_COLORS[order.status] || "#6b7280";
  const isShipped = order.status === "shipped" || order.status === "delivered";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account/orders" className="text-bone/50 hover:text-bone transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <div className="font-mono text-xs text-amber font-bold">{order.id}</div>
          <div className="font-display font-extrabold text-2xl">Order Details</div>
        </div>
      </div>

      {/* Status banner */}
      <div className="rounded-xl p-4 mb-6 flex items-center justify-between"
        style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}44` }}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ background: statusColor }} />
          <div className="font-display font-bold" style={{ color: statusColor }}>{STATUS_LABELS[order.status]}</div>
        </div>
        <div className="font-mono text-xs text-steel">{new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
      </div>

      {/* Tracking */}
      {isShipped && order.tracking_number && (
        <div className="rounded-xl p-4 mb-6 flex items-center justify-between"
          style={{ ...glass, border: "1px solid rgba(34,197,94,0.30)" }}>
          <div className="flex items-center gap-3">
            <Truck size={16} className="text-green-400" />
            <div>
              <div className="font-mono text-xs text-green-400 font-bold">TRACKING NUMBER</div>
              <div className="font-mono text-sm text-bone mt-0.5">{order.tracking_number}</div>
            </div>
          </div>
          <a href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`} target="_blank"
            className="flex items-center gap-1 font-mono text-xs text-amber hover:underline cursor-pointer">
            Track <ExternalLink size={12} />
          </a>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5" style={glass}>
          <div className="font-mono text-xs text-amber tracking-widest mb-3">ORDER SUMMARY</div>
          <div className="space-y-1.5 text-sm font-mono">
            <div className="flex justify-between"><span className="text-steel">Subtotal</span><span>${order.subtotal?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-steel">Shipping</span><span>{order.shipping_service === "Local Pickup" ? "Local Pickup" : `$${Number(order.shipping_cost || 0).toFixed(2)}`}</span></div>
            <div className="flex justify-between font-bold text-amber pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <span>Total</span><span>${order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-5" style={glass}>
          <div className="font-mono text-xs text-amber tracking-widest mb-3">SHIP TO</div>
          <div className="text-sm font-mono text-steel space-y-1">
            <div className="text-bone">{order.customer_name}</div>
            {order.shipping_service === "Local Pickup" ? (
              <div>Local Pickup — Louisville, KY</div>
            ) : (
              <>
                <div>{order.address}</div>
                <div>{order.city}, {order.state} {order.zip}</div>
              </>
            )}
            <div className="mt-2">{order.shipping_service}</div>
          </div>
        </div>
      </div>

      {/* Parts */}
      {order.order_items?.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-6" style={glass}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="font-mono text-xs text-amber tracking-widest">PARTS ({order.order_items.reduce((s: number, i: any) => s + (i.qty || 1), 0)} pcs)</div>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            {order.order_items.map((item: any) => {
              const qty = item.qty || 1;
              return (
                <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {qty > 1 && <span className="font-mono text-xs text-amber font-bold">{qty}×</span>}
                      <span className="truncate">{item.file_name}</span>
                    </div>
                    <div className="font-mono text-xs text-steel mt-0.5">
                      {item.material} · {item.color} · {item.quality} · {item.infill}%
                    </div>
                  </div>
                  <div className="font-display font-bold text-amber flex-shrink-0">
                    ${(item.price * qty).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reorder error */}
      {reorderError && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-mono text-red-400"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }}>
          {reorderError}
        </div>
      )}

      <button
        onClick={handleReorder}
        disabled={reorderLoading}
        className="w-full py-4 rounded-xl font-display font-bold text-ironworks flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-70 disabled:cursor-wait"
        style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)", boxShadow: "0 0 24px rgba(255,181,71,0.28)" }}>
        {reorderLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {reorderStep || "LOADING…"}
          </>
        ) : (
          <>
            <RotateCcw size={16} /> RE-ORDER THESE PARTS
          </>
        )}
      </button>
      <div className="mt-2 font-mono text-xs text-steel/50 text-center">
        Your files will be retrieved automatically — no re-upload needed
      </div>
    </div>
  );
}
