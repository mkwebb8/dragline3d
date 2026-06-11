"use client";
import { useEffect, useState, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Calculator, Truck, Copy, Send, Check } from "lucide-react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const inputSt: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  outline: "none",
  color: "inherit",
};
function focus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)";
}
function blur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
  e.currentTarget.style.boxShadow = "none";
}

const MATERIALS: Record<string, number> = {
  PLA: 16, PETG: 18, TPU: 24, ABS: 20, ASA: 22,
  "PET-GF15": 30, "PETG-ESD": 66, PA: 35, "ASA-CF": 40, "PETG-CF": 40, "PA-CF": 80, PCTG: 29.95,
};

const COLORS = ["Black", "White", "Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Natural", "Custom"];

function calcItemPrice(grams: number, hours: number, material: string): number {
  const cpk = MATERIALS[material] ?? 16;
  return Math.max(8, Math.round(((grams / 1000) * cpk * 2.5 + hours * 0.50 + 12) * 100) / 100);
}

type Part = { id: string; fileName: string; material: string; infill: number; grams: number; hours: number; qty: number; color: string };

function newPart(): Part {
  return { id: crypto.randomUUID(), fileName: "", material: "PLA", infill: 15, grams: 0, hours: 0, qty: 1, color: "Black" };
}

export default function ManualQuotePage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  // Customer
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");

  // Parts
  const [parts, setParts] = useState<Part[]>([newPart()]);

  // Shipping
  const [toStreet, setToStreet] = useState("");
  const [toCity, setToCity] = useState("");
  const [toState, setToState] = useState("KY");
  const [toZip, setToZip] = useState("");
  const [rates, setRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  // Result
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t);
  }, []);

  function updatePart(id: string, key: keyof Part, val: any) {
    setParts(ps => ps.map(p => p.id === id ? { ...p, [key]: val } : p));
  }
  function removePart(id: string) {
    setParts(ps => ps.filter(p => p.id !== id));
  }

  const totalGrams = parts.reduce((s, p) => s + (p.grams || 0) * (p.qty || 1), 0);
  const subtotal = parts.reduce((s, p) => {
    const price = calcItemPrice(p.grams || 0, p.hours || 0, p.material);
    return s + price * (p.qty || 1);
  }, 0);
  const tax = Math.round(subtotal * 0.06 * 100) / 100;
  const shipping = selectedRate?.amount ?? 0;
  const total = subtotal + tax + shipping;

  async function getShippingRates() {
    if (!toZip) { setErr("Enter destination ZIP first"); return; }
    setLoadingRates(true); setErr(null); setRates([]); setSelectedRate(null);
    try {
      const r = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightGrams: Math.max(50, totalGrams), toName: custName || "Customer", toStreet: toStreet || "123 Main St", toCity: toCity || "Louisville", toState, toZip }),
      });
      const d = await r.json();
      if (d.rates) { setRates(d.rates); if (d.rates.length > 0) setSelectedRate(d.rates[0]); }
      else setErr("Could not get rates");
    } catch { setErr("Shipping API error"); }
    finally { setLoadingRates(false); }
  }

  async function createOrder() {
    if (!custEmail) { setErr("Customer email required"); return; }
    if (parts.some(p => !p.fileName)) { setErr("All parts need a file name"); return; }
    setCreating(true); setErr(null);
    try {
      const items = parts.map(p => ({
        fileName: p.fileName,
        material: p.material,
        quality: "standard",
        infill: p.infill,
        grams: p.grams,
        hours: p.hours,
        qty: p.qty,
        price: calcItemPrice(p.grams, p.hours, p.material),
      }));
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingCost: selectedRate?.amount ?? 0,
          shippingLabel: selectedRate ? `${selectedRate.provider} ${selectedRate.service}` : "",
          customerEmail: custEmail,
          customerName: custName,
          address: toStreet,
          city: toCity,
          state: toState,
          zip: toZip,
        }),
      });
      const d = await r.json();
      if (d.url) { setPayUrl(d.url); setOrderId(d.orderId); }
      else setErr(d.error || "Failed to create order");
    } catch (e: any) { setErr(e.message); }
    finally { setCreating(false); }
  }

  async function copyLink() {
    if (!payUrl) return;
    await navigator.clipboard.writeText(payUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function emailInvoice() {
    if (!payUrl || !custEmail || !orderId) return;
    setSending(true);
    try {
      const itemLines = parts.map(p => {
        const price = calcItemPrice(p.grams, p.hours, p.material);
        return `<tr><td style="padding:6px 0;border-bottom:1px solid #222">${p.fileName.replace(/\.(stl|3mf|step|stp)$/i, "")} — ${p.material} ${p.infill}%${p.qty > 1 ? ` × ${p.qty}` : ""}</td><td style="text-align:right;padding:6px 0;border-bottom:1px solid #222">$${(price * p.qty).toFixed(2)}</td></tr>`;
      }).join("");
      const html = `<div style="background:#111;color:#fff;font-family:monospace;padding:32px;max-width:600px">
        <div style="font-size:20px;font-weight:bold;color:#f59e0b;margin-bottom:4px">DRAGLINE 3D</div>
        <div style="color:#666;font-size:12px;margin-bottom:24px">Layer by layer · dragline3d.com</div>
        <p style="margin-bottom:16px">Hi ${custName || "there"},</p>
        <p style="margin-bottom:24px">Your custom quote is ready. Review the details below and click the button to complete your order.</p>
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:16px;margin-bottom:16px">
          <div style="color:#f59e0b;font-size:11px;letter-spacing:.1em;margin-bottom:12px">ORDER SUMMARY — ${orderId}</div>
          <table style="width:100%;font-size:13px">${itemLines}
            <tr><td style="padding:6px 0">KY Sales Tax (6%)</td><td style="text-align:right">$${tax.toFixed(2)}</td></tr>
            ${shipping > 0 ? `<tr><td style="padding:6px 0">Shipping</td><td style="text-align:right">$${shipping.toFixed(2)}</td></tr>` : ""}
            <tr><td style="padding:10px 0 0;font-weight:bold;font-size:15px;color:#f59e0b">TOTAL</td><td style="text-align:right;font-weight:bold;font-size:15px;color:#f59e0b;padding-top:10px">$${total.toFixed(2)}</td></tr>
          </table>
        </div>
        <div style="margin-top:24px">
          <a href="${payUrl}" style="background:#f59e0b;color:#111;padding:14px 28px;text-decoration:none;font-weight:bold;border-radius:4px;display:inline-block;font-size:14px">PAY NOW — $${total.toFixed(2)}</a>
        </div>
        <div style="margin-top:16px;color:#555;font-size:11px">Questions? <a href="mailto:info@dragline3d.com" style="color:#f59e0b">info@dragline3d.com</a></div>
      </div>`;
      const t = localStorage.getItem("dragline_admin_token") || "";
      const res = await fetch("/api/admin/send-invoice", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: custEmail, subject: `Your Dragline 3D Quote — ${orderId}`, html }),
      });
      if (res.ok) setEmailSent(true);
      else setErr("Email failed — copy link manually");
    } catch { setErr("Email failed — copy link manually"); }
    finally { setSending(false); }
  }

  const labelBase = "font-mono text-xs text-steel tracking-wider uppercase mb-1.5 block";
  const inputBase = "w-full px-3 py-2 rounded-xl text-sm transition-all";

  return (
    <div className="min-h-screen text-bone p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/orders" className="text-steel hover:text-amber transition-colors"><ArrowLeft size={18} /></Link>
        <div>
          <div className="font-display text-2xl text-amber font-bold">Manual Quote</div>
          <div className="font-mono text-xs text-steel mt-0.5">Build a custom quote and generate a payment link</div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="rounded-xl overflow-hidden mb-4" style={glass}>
        <div className="px-5 py-3 border-b font-mono text-xs text-amber tracking-widest" style={{ borderColor: "rgba(255,255,255,0.07)" }}>CUSTOMER</div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelBase}>Name</label>
            <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Jane Smith"
              className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label className={labelBase}>Email *</label>
            <input value={custEmail} onChange={e => setCustEmail(e.target.value)} placeholder="jane@example.com" type="email"
              className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
          </div>
        </div>
      </div>

      {/* Parts */}
      <div className="rounded-xl overflow-hidden mb-4" style={glass}>
        <div className="px-5 py-3 border-b flex items-center justify-between font-mono text-xs text-amber tracking-widest" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <span>PARTS</span>
          <button onClick={() => setParts(ps => [...ps, newPart()])}
            className="flex items-center gap-1.5 text-steel hover:text-amber transition-colors">
            <Plus size={13} /> ADD PART
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {parts.map((p, i) => {
            const price = calcItemPrice(p.grams || 0, p.hours || 0, p.material);
            return (
              <div key={p.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-steel">PART {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-amber">${(price * (p.qty || 1)).toFixed(2)}</span>
                    {parts.length > 1 && (
                      <button onClick={() => removePart(p.id)} className="text-steel hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className={labelBase}>File name *</label>
                    <input value={p.fileName} onChange={e => updatePart(p.id, "fileName", e.target.value)} placeholder="part.stl"
                      className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label className={labelBase}>Material</label>
                    <select value={p.material} onChange={e => updatePart(p.id, "material", e.target.value)}
                      className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur}>
                      {Object.keys(MATERIALS).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Color</label>
                    <select value={p.color} onChange={e => updatePart(p.id, "color", e.target.value)}
                      className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur}>
                      {COLORS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className={labelBase}>Grams</label>
                    <input type="number" min="0" step="1" value={p.grams || ""} onChange={e => updatePart(p.id, "grams", parseFloat(e.target.value) || 0)}
                      placeholder="0" className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label className={labelBase}>Hours</label>
                    <input type="number" min="0" step="0.1" value={p.hours || ""} onChange={e => updatePart(p.id, "hours", parseFloat(e.target.value) || 0)}
                      placeholder="0.0" className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label className={labelBase}>Infill %</label>
                    <input type="number" min="0" max="100" step="5" value={p.infill}
                      onChange={e => updatePart(p.id, "infill", parseInt(e.target.value) || 15)}
                      className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
                  </div>
                  <div>
                    <label className={labelBase}>Qty</label>
                    <input type="number" min="1" step="1" value={p.qty}
                      onChange={e => updatePart(p.id, "qty", parseInt(e.target.value) || 1)}
                      className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
                  </div>
                </div>
                <div className="mt-2 font-mono text-xs text-steel">
                  ${MATERIALS[p.material] ?? 16}/kg · ${price.toFixed(2)} ea · ${(price * p.qty).toFixed(2)} total
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shipping */}
      <div className="rounded-xl overflow-hidden mb-4" style={glass}>
        <div className="px-5 py-3 border-b font-mono text-xs text-amber tracking-widest" style={{ borderColor: "rgba(255,255,255,0.07)" }}>SHIPPING</div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelBase}>Street address</label>
              <input value={toStreet} onChange={e => setToStreet(e.target.value)} placeholder="123 Main St"
                className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className={labelBase}>City</label>
              <input value={toCity} onChange={e => setToCity(e.target.value)} placeholder="Louisville"
                className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>State</label>
                <input value={toState} onChange={e => setToState(e.target.value)} placeholder="KY"
                  className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className={labelBase}>ZIP *</label>
                <input value={toZip} onChange={e => setToZip(e.target.value)} placeholder="40201"
                  className={`${inputBase}`} style={inputSt} onFocus={focus} onBlur={blur} />
              </div>
            </div>
          </div>
          <button onClick={getShippingRates} disabled={loadingRates}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs text-steel hover:text-amber transition-colors cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
            <Truck size={13} /> {loadingRates ? "GETTING RATES..." : "GET SHIPPING RATES"}
          </button>
          {rates.length > 0 && (
            <div className="space-y-2">
              {rates.map(r => (
                <label key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                  style={{ border: `1px solid ${selectedRate?.id === r.id ? "rgba(255,181,71,0.4)" : "rgba(255,255,255,0.07)"}`, background: selectedRate?.id === r.id ? "rgba(255,181,71,0.05)" : "transparent" }}>
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={selectedRate?.id === r.id} onChange={() => setSelectedRate(r)} className="accent-amber" />
                    <div>
                      <div className="font-mono text-xs text-bone">{r.provider} — {r.service}</div>
                      {r.days && <div className="font-mono text-xs text-steel mt-0.5">{r.days} business days</div>}
                    </div>
                  </div>
                  <div className="font-display font-bold text-amber">${r.amount.toFixed(2)}</div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Price Summary */}
      <div className="rounded-xl overflow-hidden mb-4" style={glass}>
        <div className="px-5 py-3 border-b font-mono text-xs text-amber tracking-widest" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <Calculator size={12} className="inline mr-2" />PRICE SUMMARY
        </div>
        <div className="p-5 space-y-2 font-mono text-sm">
          {parts.map((p, i) => {
            const price = calcItemPrice(p.grams || 0, p.hours || 0, p.material);
            return (
              <div key={p.id} className="flex justify-between text-xs text-steel">
                <span>{p.fileName || `Part ${i + 1}`}{p.qty > 1 ? ` × ${p.qty}` : ""}</span>
                <span>${(price * p.qty).toFixed(2)}</span>
              </div>
            );
          })}
          <div className="flex justify-between text-xs text-steel pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span>KY Sales Tax (6%)</span><span>${tax.toFixed(2)}</span>
          </div>
          {shipping > 0 && (
            <div className="flex justify-between text-xs text-steel">
              <span>Shipping</span><span>${shipping.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-amber pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span>TOTAL</span><span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {err && <div className="mb-4 px-4 py-3 rounded-xl font-mono text-xs text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>{err}</div>}

      {/* Actions */}
      {!payUrl ? (
        <button onClick={createOrder} disabled={creating || !custEmail}
          className="w-full py-3 rounded-xl font-mono text-sm font-bold tracking-wider cursor-pointer disabled:opacity-40 transition-all"
          style={{ background: creating ? "rgba(255,181,71,0.2)" : "rgba(255,181,71,0.15)", border: "1px solid rgba(255,181,71,0.4)", color: "#f5b547" }}>
          {creating ? "CREATING ORDER..." : `CREATE ORDER — $${total.toFixed(2)}`}
        </button>
      ) : (
        <div className="rounded-xl overflow-hidden" style={glass}>
          <div className="px-5 py-3 border-b font-mono text-xs text-green-400 tracking-widest" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            ✓ ORDER CREATED — {orderId}
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-mono text-xs break-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <span className="flex-1 text-steel truncate">{payUrl}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-xs cursor-pointer transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: copied ? "#22c55e" : "#9ca3af" }}>
                {copied ? <><Check size={13} /> COPIED</> : <><Copy size={13} /> COPY LINK</>}
              </button>
              <button onClick={emailInvoice} disabled={sending || emailSent || !custEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-xs cursor-pointer transition-all disabled:opacity-40"
                style={{ background: emailSent ? "rgba(34,197,94,0.12)" : "rgba(255,181,71,0.12)", border: `1px solid ${emailSent ? "rgba(34,197,94,0.4)" : "rgba(255,181,71,0.4)"}`, color: emailSent ? "#22c55e" : "#f5b547" }}>
                {emailSent ? <><Check size={13} /> EMAIL SENT</> : sending ? "SENDING..." : <><Send size={13} /> EMAIL INVOICE</>}
              </button>
            </div>
            <Link href={`/admin/orders/${orderId}`}
              className="flex items-center justify-center gap-2 py-2 font-mono text-xs text-steel hover:text-amber transition-colors">
              View Order →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
