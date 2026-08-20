export const runtime = "edge";

import { signState, verifyState } from "@/lib/signedState";
import { rateLimit } from "@/lib/rateLimit";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

export async function GET() {
  if (!process.env.CHECKOUT_SIGNING_SECRET) return Response.json({ error: "Contact form is not configured" }, { status: 503 });
  return Response.json({ token: await signState("contact-form", { issuedAt: Date.now() }, 30 * 60) });
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "contact", 5, 60 * 60_000);
  if (limited) return limited;
  if (Number(request.headers.get("content-length") || 0) > 16 * 1024) return Response.json({ error: "Request too large" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  if (body.company) return Response.json({ ok: true });
  const state = await verifyState(body.token, "contact-form");
  if (!state || typeof state.issuedAt !== "number" || Date.now() - state.issuedAt < 1500) return Response.json({ error: "Please refresh the form and try again" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10 || message.length > 5000) {
    return Response.json({ error: "Please provide a valid name, email, and message" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const recipient = process.env.NOTIFY_EMAIL;
  if (!resendKey || !recipient) return Response.json({ error: "Contact email is not configured" }, { status: 503 });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Dragline 3D Contact <info@dragline3d.com>", to: [recipient], reply_to: email,
      subject: `Website inquiry from ${name.slice(0, 80)}`,
      html: `<div style="font-family:sans-serif"><h2>Website inquiry</h2><p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p></div>`,
    }),
  });
  if (!response.ok) return Response.json({ error: "Message could not be sent" }, { status: 502 });
  return Response.json({ ok: true });
}
