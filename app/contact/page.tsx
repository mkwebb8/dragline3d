"use client";

import { useState } from "react";
import { Mail, MapPin, Clock, Send } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Dragline 3D inquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
    window.location.href = `mailto:kyle@dragline3d.com?subject=${subject}&body=${body}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12 max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">
          Contact
        </div>
        <h1 className="font-display font-black text-5xl md:text-7xl leading-[0.92] mb-5">
          Got questions?<br />
          <span className="text-amber">Get answers.</span>
        </h1>
        <p className="text-bone/70 text-lg leading-relaxed max-w-xl">
          For most jobs, the quote tool will get you what you need faster.
          For everything else — questions, unusual jobs, bulk orders — say hello.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="md:col-span-3 space-y-5">
          <div>
            <label className="block font-display font-semibold text-sm tracking-wide mb-2">
              NAME
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-sm bg-ironworks2 border border-ironworks3 focus:border-amber focus:outline-none text-bone"
            />
          </div>
          <div>
            <label className="block font-display font-semibold text-sm tracking-wide mb-2">
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-sm bg-ironworks2 border border-ironworks3 focus:border-amber focus:outline-none text-bone"
            />
          </div>
          <div>
            <label className="block font-display font-semibold text-sm tracking-wide mb-2">
              MESSAGE
            </label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you need printed? Any deadlines? Special requirements?"
              className="w-full px-4 py-3 rounded-sm bg-ironworks2 border border-ironworks3 focus:border-amber focus:outline-none text-bone resize-none"
            />
          </div>
          <button
            type="submit"
            className="font-display font-bold inline-flex items-center gap-2 bg-amber text-ironworks px-6 py-4 rounded-sm hover:bg-amber-dark transition-colors"
          >
            SEND MESSAGE <Send size={16} />
          </button>
        </form>

        {/* Info column */}
        <div className="md:col-span-2 space-y-6">
          <InfoBlock
            icon={<Mail size={20} />}
            label="EMAIL"
            value="kyle@dragline3d.com"
            href="mailto:kyle@dragline3d.com"
          />
          <InfoBlock
            icon={<MapPin size={20} />}
            label="LOCATION"
            value="Louisville, KY"
            detail="Local pickup available · USPS nationwide"
          />
          <InfoBlock
            icon={<Clock size={20} />}
            label="HOURS"
            value="Mon–Fri · 9a–6p ET"
            detail="Most quotes answered within a few hours."
          />

          <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5 mt-8">
            <div className="font-mono text-xs tracking-widest text-amber mb-2">PRO TIP</div>
            <p className="text-bone/70 text-sm leading-relaxed">
              For faster turnaround, use the{" "}
              <a href="/quote" className="text-amber hover:underline">
                quote tool
              </a>{" "}
              instead. Upload your STL and you'll have a real price in under a minute — no
              waiting for email replies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  icon, label, value, href, detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  detail?: string;
}) {
  const content = (
    <>
      <div className="text-amber">{icon}</div>
      <div className="flex-1">
        <div className="font-mono text-xs tracking-widest text-steel mb-1">{label}</div>
        <div className="font-display font-bold text-lg">{value}</div>
        {detail && <div className="text-bone/50 text-sm mt-1">{detail}</div>}
      </div>
    </>
  );
  return href ? (
    <a href={href} className="flex items-start gap-4 hover:bg-ironworks2 -mx-3 px-3 py-2 rounded-sm transition-colors">
      {content}
    </a>
  ) : (
    <div className="flex items-start gap-4 py-2">{content}</div>
  );
}
