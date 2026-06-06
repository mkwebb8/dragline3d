"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Package } from "lucide-react";
import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};

export default function OrderConfirmedContent() {
  const params = useSearchParams();
  const orderId = params.get("id");

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/order/${orderId}`, { method: "POST" }).catch(() => {});
  }, [orderId]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-amber grid place-items-center mx-auto mb-8">
        <CheckCircle2 size={40} strokeWidth={2} color="#0f0f10" />
      </div>

      <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">Payment received</div>
      <h1 className="font-display font-black text-5xl md:text-6xl leading-[0.95] mb-6">
        Order confirmed<span className="text-amber">.</span>
      </h1>

      {orderId && (
        <div className="rounded-xl px-6 py-4 mb-8 inline-block" style={glass}>
          <div className="font-mono text-xs text-steel mb-1">ORDER ID</div>
          <div className="font-display font-bold text-2xl text-amber tracking-wider">{orderId}</div>
        </div>
      )}

      <p className="text-bone/70 text-lg leading-relaxed mb-10">
        You will get a Square receipt by email. We will follow up shortly to confirm your print timeline. Most jobs ship in 2–5 business days.
      </p>

      <div className="rounded-xl p-6 text-left mb-10" style={glass}>
        <div className="font-mono text-xs tracking-widest text-amber mb-3">WHAT HAPPENS NEXT</div>
        <ol className="space-y-3 text-bone/80 text-sm">
          <li className="flex gap-3"><span className="font-mono text-amber">01</span> We review your file and confirm it is print-ready.</li>
          <li className="flex gap-3"><span className="font-mono text-amber">02</span> You get an email with your timeline and any questions.</li>
          <li className="flex gap-3"><span className="font-mono text-amber">03</span> We print, inspect, and pack your part.</li>
          <li className="flex gap-3"><span className="font-mono text-amber">04</span> You get a tracking number when it ships.</li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderId && (
          <Link href={`/order/${orderId}`}
            className="font-display font-bold inline-flex items-center gap-2 text-amber px-6 py-4 rounded-xl hover:bg-amber hover:text-ironworks transition-colors cursor-pointer"
            style={{ border: "1px solid rgba(255,181,71,0.50)" }}>
            <Package size={18} /> TRACK YOUR ORDER
          </Link>
        )}
        <Link href="/quote"
          className="font-display font-bold inline-flex items-center gap-2 text-ironworks px-6 py-4 rounded-xl cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
          PLACE ANOTHER ORDER <ArrowRight size={18} />
        </Link>
      </div>

      <p className="text-bone/50 text-sm mt-8">
        Questions? Email <a href="mailto:info@dragline3d.com" className="text-amber hover:underline">info@dragline3d.com</a>
      </p>
    </div>
  );
}
