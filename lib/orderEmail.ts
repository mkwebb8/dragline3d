import type { Order } from "@/lib/db";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}
export async function sendOrderConfirmation(order: Order) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !order.customer_email) return false;
  const html = `<div style="background:#111;color:#fff;font-family:monospace;padding:32px;max-width:600px">
    <div style="font-size:20px;font-weight:bold;color:#f59e0b">DRAGLINE 3D</div>
    <h2>Order confirmed</h2>
    <p style="color:#aaa">Hi ${escapeHtml(order.customer_name)}, Square confirmed your payment and your order is now in our production queue.</p>
    <div style="background:#1a1a1a;border:1px solid #333;padding:16px;margin:16px 0">
      <div style="color:#f59e0b;font-size:11px">ORDER ID</div><div style="font-size:20px;font-weight:bold">${escapeHtml(order.id)}</div>
      <div style="margin-top:8px;color:#aaa">Total: $${Number(order.total || 0).toFixed(2)}</div>
    </div>
    <a href="https://dragline3d.com/order/${encodeURIComponent(order.id)}" style="background:#f59e0b;color:#111;padding:12px 24px;text-decoration:none;font-weight:bold;display:inline-block">TRACK YOUR ORDER</a>
  </div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "orders@dragline3d.com", to: [order.customer_email], subject: `Order ${order.id} confirmed — Dragline 3D`, html }),
  });
  return response.ok;
}
