"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Package, Truck, RotateCcw, ExternalLink } from "lucide-react";
import { QUALITIES } from "@/lib/stl";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

const STATUS_LABELS: Record<string, string> = { pending: "Payment Pending", received: "Order Received", queued: "In Queue", printing: "Printing", quality_check: "Quality Check", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const STATUS_COLORS: Record<string, string> = { pending: "#6b7280", received: "#3b82f6", queued: "#f59e0b", printing: "#f97316", quality_check: "#a855f7", shipped: "#22c55e", delivered: "#16a34a", cancelled: "#ef4444" };

export default function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  function handleReorder() {
    if (!order?.order_items?.length) return;
    // Build cart items from order and store in localStorage
    const cartItems = order.order_items.map((item: any) => ({
      id: Math.random().toString(36).slice(2, 10),
      fileName: item.file_name,
      material: item.material,
      quality: item.quality,
      infill: item.infill,
      qty: item.qty || 1,
      color: item.color || "Midnight Black",
      stats: { dims: { x: 0, y: 0, z: 0 }, volumeMm3: 0 },
      quote: { grams: item.grams || 0, hours: item.hours || 0, price: item.price, fromSlicer: false, breakdown: { material: 0, machine: 0, setup: 0 } },
      geometry: null,
      file: null,
    }));
    localStorage.setItem("dragline_cart", JSON.stringify(cartItems));
    router.push("/quote");
  }

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-16 text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin"/></div>;
  if (!order) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-bone/50">Order not found</div>;

  const statusColor = STATUS_COLORS[order.status] || "#6b7280";
  const isShipped = order.status === "shipped" || order.status === "delivered";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account/orders" className="text-bone/50 hover:text-bone transition-colors"><ArrowLeft size={20}/></Link>
        <div>
          <div className="font-mono text-xs text-amber font-bold">{order.id}</div>
          <div className="font-display font-extrabold text-2xl">Order Details</div>
        </div>
      </div>

      {/* Status banner */}
      <div className="rounded-sm p-4 mb-6 flex items-center justify-between" style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}44` }}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ background: statusColor }}/>
          <div className="font-display font-bold" style={{ color: statusColor }}>{STATUS_LABELS[order.status]}</div>
        </div>
        <div className="font-mono text-xs text-steel">{new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
      </div>

      {/* Tracking */}
      {isShipped && order.tracking_number && (
        <div className="bg-ironworks2 border border-green-500/30 rounded-sm p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck size={16} className="text-green-400"/>
            <div>
              <div className="font-mono text-xs text-green-400 font-bold">TRACKING NUMBER</div>
              <div className="font-mono text-sm text-bone mt-0.5">{order.tracking_number}</div>
            </div>
          </div>
          <a href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`} target="_blank"
            className="flex items-center gap-1 font-mono text-xs text-amber hover:underline">
            Track <ExternalLink size={12}/>
          </a>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
          <div className="font-mono text-xs text-amber tracking-widest mb-3">ORDER SUMMARY</div>
          <div className="space-y-1.5 text-sm font-mono">
            <div className="flex justify-between"><span className="text-steel">Subtotal</span><span>${order.subtotal?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-steel">Shipping</span><span>{order.shipping_service==="Local Pickup"?"Local Pickup":`$${Number(order.shipping_cost||0).toFixed(2)}`}</span></div>
            <div className="flex justify-between font-bold text-amber pt-1 border-t border-ironworks3"><span>Total</span><span>${order.total?.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
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
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm mb-6">
          <div className="px-5 py-4 border-b border-ironworks3">
            <div className="font-mono text-xs text-amber tracking-widest">PARTS ({order.order_items.reduce((s: number, i: any) => s + (i.qty || 1), 0)} pcs)</div>
          </div>
          <div className="divide-y divide-ironworks3">
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

      {/* Re-order button */}
      <button onClick={handleReorder}
        className="w-full py-4 rounded-sm font-display font-bold flex items-center justify-center gap-2 bg-amber text-ironworks hover:opacity-90 transition-colors">
        <RotateCcw size={16}/> RE-ORDER THESE PARTS
      </button>
      <div className="mt-2 font-mono text-xs text-steel/50 text-center">
        Parts will be added to your cart — you'll need to re-upload your files to get a fresh quote
      </div>
    </div>
  );
}
