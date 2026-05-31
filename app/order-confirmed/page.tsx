import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Order Confirmed · Dragline 3D",
};

export default function OrderConfirmed() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-amber grid place-items-center mx-auto mb-8">
        <CheckCircle2 size={40} strokeWidth={2} color="#0f0f10" />
      </div>

      <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">
        Payment received
      </div>
      <h1 className="font-display font-black text-5xl md:text-6xl leading-[0.95] mb-6">
        Order confirmed<span className="text-amber">.</span>
      </h1>
      <p className="text-bone/70 text-lg leading-relaxed mb-10">
        Thanks for your order. You&apos;ll get a Square receipt by email, and I&apos;ll
        follow up shortly to confirm your print timeline. Most jobs ship in 2–5 business days.
      </p>

      <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-6 text-left mb-10">
        <div className="font-mono text-xs tracking-widest text-amber mb-3">WHAT HAPPENS NEXT</div>
        <ol className="space-y-3 text-bone/80 text-sm">
          <li className="flex gap-3">
            <span className="font-mono text-amber">01</span>
            I review your file and confirm it&apos;s print-ready.
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-amber">02</span>
            You get an email with your timeline and any questions.
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-amber">03</span>
            I print, inspect, and pack your part.
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-amber">04</span>
            Local pickup or USPS shipping — your choice.
          </li>
        </ol>
      </div>

      <p className="text-bone/50 text-sm mb-8">
        Questions about your order? Email{" "}
        <a href="mailto:info@dragline3d.com" className="text-amber hover:underline">
          info@dragline3d.com
        </a>
      </p>

      <Link
        href="/quote"
        className="font-display font-bold inline-flex items-center gap-2 bg-amber text-ironworks px-6 py-4 rounded-sm hover:bg-amber-dark transition-colors"
      >
        PLACE ANOTHER ORDER <ArrowRight size={18} />
      </Link>
    </div>
  );
}
