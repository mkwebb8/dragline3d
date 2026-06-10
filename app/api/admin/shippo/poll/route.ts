// app/api/admin/shippo/poll/route.ts
// Checks tracking status for all "shipped" orders via Shippo API.
// Called by cron every 4 hours as a fallback in case webhook is missed.
// Also callable manually from admin.
export const runtime = "edge";

import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SHIPPO_KEY = process.env.SHIPPO_API_KEY!;

const sbh = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const shippoH = { Authorization: `ShippoToken ${SHIPPO_KEY}` };

export async function POST(request: Request) {
  const isCron = request.headers.get("x-cron-secret") === process.env.CRON_SECRET;
  if (!isCron && !await verifyAdminToken(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all shipped orders that have a tracking number
  const r = await fetch(
    `${SB_URL}/rest/v1/orders?status=eq.shipped&tracking_number=not.is.null&select=id,tracking_number,shipping_service`,
    { headers: sbh }
  );
  const orders: Array<{ id: string; tracking_number: string; shipping_service?: string }> = await r.json();

  if (!orders.length) return Response.json({ ok: true, checked: 0, delivered: 0 });

  let delivered = 0;
  const results: any[] = [];

  for (const order of orders) {
    try {
      // Look up tracking via Shippo transaction search
      const tr = await fetch(
        `https://api.goshippo.com/transactions/?tracking_number=${encodeURIComponent(order.tracking_number)}&results=1`,
        { headers: shippoH }
      );
      const txData = await tr.json();
      const txn = txData?.results?.[0];

      let trackStatus: string | null = null;

      if (txn?.tracking_status?.status) {
        trackStatus = txn.tracking_status.status;
      } else if (txn?.tracking_number && txn?.carrier) {
        // Fall back to direct track lookup
        const trackR = await fetch(
          `https://api.goshippo.com/tracks/${txn.carrier}/${order.tracking_number}`,
          { headers: shippoH }
        );
        const trackData = await trackR.json();
        trackStatus = trackData?.tracking_status?.status ?? null;
      }

      results.push({ id: order.id, tracking: order.tracking_number, status: trackStatus });

      if (trackStatus === "DELIVERED") {
        await fetch(`${SB_URL}/rest/v1/orders?id=eq.${order.id}`, {
          method: "PATCH",
          headers: sbh,
          body: JSON.stringify({ status: "delivered", updated_at: new Date().toISOString() }),
        });
        delivered++;
      }
    } catch {
      results.push({ id: order.id, tracking: order.tracking_number, status: "error" });
    }

    // Small delay to avoid Shippo rate limits
    await new Promise(res => setTimeout(res, 100));
  }

  return Response.json({ ok: true, checked: orders.length, delivered, results });
}
