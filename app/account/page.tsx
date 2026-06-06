"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { DraglineMark } from "@/components/DraglineMark";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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

  async function handleLogin(e: React.FormEvent) {
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
            <div className="font-mono text-xs text-steel">DRAGLINE 3D</div>
          </div>
        </div>

        {sent ? (
          <div className="bg-ironworks2 border border-green-500/30 rounded-sm p-8 text-center">
            <CheckCircle2 size={40} className="text-green-400 mx-auto mb-4" />
            <div className="font-display font-bold text-xl mb-2">Check your email</div>
            <div className="font-mono text-xs text-steel">We sent a magic link to <span className="text-amber">{email}</span></div>
            <div className="font-mono text-xs text-steel mt-1">Click the link to sign in — no password needed.</div>
          </div>
        ) : (
          <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-8">
            <div className="font-display font-bold text-lg mb-2">Sign in to view your orders</div>
            <div className="font-mono text-xs text-steel mb-6">Enter your email and we'll send you a magic link.</div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-steel mb-1.5 tracking-wider">EMAIL ADDRESS</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  className="w-full px-4 py-3 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm"
                />
              </div>
              {error && <div className="text-red-400 text-xs font-mono">{error}</div>}
              <button type="submit" disabled={sending}
                className="w-full py-3 rounded-sm font-display font-bold flex items-center justify-center gap-2 bg-amber text-ironworks hover:opacity-90 transition-colors disabled:opacity-50">
                {sending ? (
                  <><span className="inline-block w-4 h-4 border-2 border-ironworks/30 border-t-ironworks rounded-full animate-spin"/> SENDING...</>
                ) : (
                  <><Mail size={16}/> SEND MAGIC LINK <ArrowRight size={16}/></>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
