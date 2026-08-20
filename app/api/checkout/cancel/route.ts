export const runtime = "edge";

import { getOrder, updateOrder } from "@/lib/db";
import { verifyState } from "@/lib/signedState";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const state = await verifyState(body?.token, "order-notification");
  if (!state || typeof state.orderId !== "string") return Response.json({ error: "Invalid cancellation request" }, { status: 401 });
  const order = await getOrder(state.orderId);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending") return Response.json({ error: "Order can no longer be cancelled here" }, { status: 409 });

  const squareToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!order.square_payment_link_id || !squareToken) return Response.json({ error: "Payment cancellation is not configured" }, { status: 503 });
  const squareResponse = await fetch(`https://connect.squareup.com/v2/online-checkout/payment-links/${encodeURIComponent(order.square_payment_link_id)}`, {
      method: "DELETE",
      headers: { "Square-Version": "2026-01-22", Authorization: `Bearer ${squareToken}` },
    }).catch(() => null);
  if (!squareResponse?.ok) {
    await updateOrder(order.id, { notes: "URGENT: order file upload failed and payment-link cancellation must be verified" }).catch(() => null);
    return Response.json({ error: "Payment-link cancellation requires review" }, { status: 502 });
  }
  await updateOrder(order.id, { status: "cancelled", notes: "Checkout cancelled because order files could not be secured" });
  return Response.json({ ok: true });
}
