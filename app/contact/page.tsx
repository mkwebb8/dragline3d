"use client";

import { useState } from "react";
import { Mail, MapPin, Send, ArrowRight } from "lucide-react";
import type { ReactNode, CSSProperties, FormEvent } from "react";

const glass = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
} as CSSProperties;

const softBorder = { borderColor: "rgba(255,255,255,0.07)" } as CSSProperties;

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  outline: "none",
} as CSSProperties;

export default function ContactPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Dragline 3D inquiry from ${name}`);
    const body    = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
    window.location.href = `mailto:info@dragline3d.com?subject=${subject}&body=${body}`;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Ambient orb */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,181,71,0.055) 0%, transparent 65%)", filter: "blur(80px)" }} />

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
        {/* Cinematic top bar */}
        <div className="flex items-center justify-between border-b pb-6 mb-20" style={softBorder}>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">Contact</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel">Dragline 3D</span>
        </div>

        {/* Headline */}
        <div className="mb-20">
          <h1 className="font-display font-black leading-[0.82] tracking-tight"
            style={{ fontSize: "clamp(3rem, 10vw, 8.5rem)" }}>
            <span className="block text-bone">Got questions?</span>
            <span className="block"
              style={{ WebkitTextStroke: "2px #ffb547", color: "transparent",
                textShadow: "0 0 60px rgba(255,181,71,0.12)" }}>
              Get answers.
            </span>
          </h1>
        </div>

        {/* Intro */}
        <div className="border-t pt-10 mb-16" style={softBorder}>
          <p className="text-bone/60 text-lg leading-relaxed max-w-xl">
            For most jobs, the quote tool will get you what you need faster.
            For everything else — questions, unusual jobs, bulk orders — say hello.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-5">
            <FormField label="Name">
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-bone text-sm focus:ring-0 transition-colors duration-150"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </FormField>
            <FormField label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-bone text-sm transition-colors duration-150"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </FormField>
            <FormField label="Message">
              <textarea required rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="What do you need printed? Any deadlines? Special requirements?"
                className="w-full px-4 py-3.5 rounded-xl text-bone text-sm resize-none transition-colors duration-150 placeholder:text-bone/25"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </FormField>
            <button type="submit"
              className="inline-flex items-center gap-2 font-display font-bold text-ironworks text-sm px-6 py-4 rounded-xl cursor-pointer transition-opacity duration-150 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
                boxShadow: "0 0 24px rgba(255,181,71,0.28)" }}>
              SEND MESSAGE <Send size={15} />
            </button>
          </form>

          {/* Info column */}
          <div className="md:col-span-2 space-y-4">
            <InfoCard icon={<Mail size={18} />} label="Email"
              value="info@dragline3d.com" href="mailto:info@dragline3d.com" />
            <InfoCard icon={<MapPin size={18} />} label="Location"
              value="Louisville, KY" detail="Local pickup · USPS nationwide" />

            {/* Pro tip */}
            <div className="rounded-xl p-6 mt-6" style={glass}>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber mb-3">Pro tip</div>
              <p className="text-bone/55 text-sm leading-relaxed">
                For faster turnaround, use the{" "}
                <a href="/quote" className="text-amber hover:underline">quote tool</a>{" "}
                instead. Upload your STL and you'll have a real price in under a
                minute — no waiting for email replies.
              </p>
              <a href="/quote"
                className="mt-4 inline-flex items-center gap-1.5 font-display font-bold text-xs text-amber cursor-pointer hover:opacity-80 transition-opacity duration-150">
                Go to quote tool <ArrowRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-2">{label}</label>
      {children}
    </div>
  );
}

function InfoCard({ icon, label, value, href, detail }: {
  icon: ReactNode; label: string; value: string; href?: string; detail?: string;
}) {
  const inner = (
    <div className="rounded-xl p-5 flex items-start gap-4" style={glass}>
      <div className="text-amber/70 mt-0.5">{icon}</div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-steel mb-1">{label}</div>
        <div className="font-display font-bold text-base text-bone">{value}</div>
        {detail && <div className="text-bone/40 text-xs mt-1">{detail}</div>}
      </div>
    </div>
  );
  return href
    ? <a href={href} className="block hover:opacity-80 transition-opacity duration-150 cursor-pointer">{inner}</a>
    : <div>{inner}</div>;
}
