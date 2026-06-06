"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { DraglineMark } from "@/components/DraglineMark";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";

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
const inputSt: CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" };

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/account/orders");
    });
  }, [router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true); setError(null);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: "https://dragline3d.com/account/orders" }
    });
    if (error) { setError(error.message); setSending(false); return; }
    setSent(true); setSending(false);
  }

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <DraglineMark size={36} />
          <div>
            <div className="font-display font-extrabold text-xl">My Account</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">DRAGLINE 3D</div>
          </div>
        </div>

        {sent ? (
          <div className="rounded-2xl p-8 text-center" style={{ ...glass, border: "1px solid rgba(34,197,94,0.30)" }}>
            <CheckCircle2 size={40} className="text-green-400 mx-auto mb-4" />
            <div className="font-display font-bold text-xl mb-2">Check your email</div>
            <div className="font-mono text-xs text-steel">We sent a magic link to <span className="text-amber">{email}</span></div>
            <div className="font-mono text-xs text-steel mt-1">Click the link to sign in — no password needed.</div>
          </div>
        ) : (
          <div className="rounded-2xl p-8" style={glass}>
            <div className="font-display font-bold text-lg mb-2">Sign in to view your orders</div>
            <div className="font-mono text-xs text-steel mb-6">Enter your email and we'll send you a magic link.</div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-2">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  className="w-full px-4 py-3 rounded-xl text-bone text-sm transition-colors"
                  style={inputSt}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              {error && <div className="text-red-400 text-xs font-mono">{error}</div>}
              <button type="submit" disabled={sending}
                className="w-full py-4 rounded-xl font-display font-bold text-ironworks flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)", boxShadow: "0 0 24px rgba(255,181,71,0.28)" }}>
                {sending ? (
                  <><span className="inline-block w-4 h-4 border-2 border-ironworks/30 border-t-ironworks rounded-full animate-spin" /> SENDING…</>
                ) : (
                  <><Mail size={16} /> SEND MAGIC LINK <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
