export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { to, subject, html } = await request.json();
  const rk = process.env.RESEND_API_KEY;
  if (!rk) return Response.json({ error: "Email not configured" }, { status: 503 });
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${rk}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "orders@dragline3d.com", to: [to], subject, html }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    return Response.json({ error: "Resend error", detail: e }, { status: 502 });
  }
  return Response.json({ ok: true });
}
