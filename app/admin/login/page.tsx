"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DraglineMark } from "@/components/DraglineMark";
import type { CSSProperties, FormEvent } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const inputSt: CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" };

function focusOn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
  e.currentTarget.style.boxShadow = "none";
}

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) { setError("Invalid credentials."); setLoading(false); return; }
    localStorage.setItem("dragline_admin_token", data.token);
    router.push("/admin/orders");
  }

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><DraglineMark size={56} /></div>
        <div className="font-display font-black text-3xl text-center mb-2">Admin Login</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel text-center mb-8">DRAGLINE 3D</div>
        <div className="rounded-2xl p-8" style={glass}>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-2">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-bone text-sm transition-colors"
                style={inputSt} required autoComplete="username" onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-bone text-sm transition-colors"
                style={inputSt} required autoComplete="current-password" onFocus={focusOn} onBlur={focusOff} />
            </div>
            {error && <div className="text-red-400 text-sm text-center font-mono">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-4 font-display font-bold text-ironworks text-sm rounded-xl cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)", boxShadow: "0 0 24px rgba(255,181,71,0.28)" }}>
              {loading ? "Logging in…" : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
