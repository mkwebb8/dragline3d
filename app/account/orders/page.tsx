"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { DraglineMark } from "@/components/DraglineMark";
import { LogOut, ExternalLink, Package } from "lucide-react";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

const STATUS_LABELS: Record<string, string> = { pending: "Payment Pending", received: "Order Received", queued: "In Queue", printing: "Printing", quality_check: "Quality Check", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const STATUS_COLORS: Record<string, string> = { pending: "#6b7280", received: "#3b82f6", queued: "#f59e0b", printing: "#f97316", quality_check: "#a855f7", shipped: "#22c55e", delivered: "#16a34a", cancelled: "#ef4444" };

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push("/account"); return; }
      const userEmail = data.session.user.email || "";
      setEmail(userEmail);
      const res = await fetch(`/api/account/orders?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) setOrders(await res.json());
      setLoading(false);
    });
  }, [router]);

  async function logout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/account");
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <DraglineMark size={36} />
          <div>
            <div className="font-display font-extrabold text-xl">My Orders</div>
            <div className="font-mono text-xs text-steel">{email}</div>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone text-sm transition-colors font-mono text-xs">
          <LogOut size={14}/> Sign Out
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin"/></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-bone/40">
          <Package size={40} className="mx-auto mb-4 opacity-30"/>
          <div className="font-display text-2xl mb-2">No orders yet</div>
          <div className="font-mono text-xs mb-6">Your orders will appear here after checkout</div>
          <Link href="/quote" className="px-6 py-3 bg-amber text-ironworks font-display font-bold rounded-sm hover:opacity-90 transition-colors">
            START AN ORDER
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <Link key={order.id} href={`/account/orders/${order.id}`}
              className="block bg-ironworks2 border border-ironworks3 rounded-sm p-4 hover:border-amber/40 transition-colors group">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-xs text-amber font-bold">{order.id}</div>
                  <div className="font-mono text-xs text-steel mt-0.5">{new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                  <div className="font-mono text-xs text-steel mt-0.5">{order.order_items?.length || 0} part{(order.order_items?.length || 0) !== 1 ? "s" : ""}</div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-display font-bold text-lg text-amber">${order.total?.toFixed(2)}</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-sm text-xs font-mono font-bold"
                    style={{ background: `${STATUS_COLORS[order.status]}22`, color: STATUS_COLORS[order.status] }}>
                    {STATUS_LABELS[order.status]}
                  </div>
                  <ExternalLink size={14} className="text-bone/30 group-hover:text-bone/60 transition-colors"/>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
