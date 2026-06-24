// app/api/webhooks/shippo/route.ts
// Receives Shippo tracking webhooks and auto-updates order status to "delivered"
//
// Setup in Shippo dashboard:
//   Settings → Webhooks → Add Webhook
//   URL: https://dragline3d.com/api/webhooks/shippo
//   Events: track_updated
//
// Optional: set SHIPPO_WEBHOOK_TOKEN in Cloudflare env vars to verify requests
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SHIPPO_TOKEN = process.env.SHIPPO_WEBHOOK_TOKEN;

const sbh = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

export async function POST(request: Request) {
  // Verify Shippo signature if token is set
  if (SHIPPO_TOKEN) {
    const sig = request.headers.get("shippo-webhook-signature") ?? "";
    if (sig !== SHIPPO_TOKEN) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: any;
  try {
    event = await request.json();
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Shippo sends track_updated when tracking status changes
  if (event.event !== "track_updated") {
    return Response.json({ ok: true, skipped: true });
  }

  const tracking = event.data;
  const trackingNumber: string = tracking?.tracking_number;
  const carrier: string = tracking?.carrier;
  const status: string = tracking?.tracking_status?.status; // DELIVERED, TRANSIT, UNKNOWN, etc.

  if (!trackingNumber || status !== "DELIVERED") {
    return Response.json({ ok: true, skipped: true, status });
  }

  // Find the order by tracking number
  const r = await fetch(
    `${SB_URL}/rest/v1/orders?tracking_number=eq.${encodeURIComponent(trackingNumber)}&status=eq.shipped&select=id,status`,
    { headers: sbh }
  );

  const rows: Array<{ id: string; status: string }> = await r.json();
  const order = rows[0];

  if (!order) {
    // Already delivered or tracking number not found — not an error
    return Response.json({ ok: true, skipped: true, reason: "Order not found or not in shipped status" });
  }

  // Update to delivered
  await fetch(`${SB_URL}/rest/v1/orders?id=eq.${order.id}`, {
    method: "PATCH",
    headers: sbh,
    body: JSON.stringify({
      status: "delivered",
      updated_at: new Date().toISOString(),
    }),
  });

  return Response.json({ ok: true, orderId: order.id, trackingNumber });
}
