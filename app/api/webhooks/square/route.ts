// app/api/webhooks/square/route.ts
// Receives Square webhook events and syncs payment data to Supabase orders.
//
// Matching priority:
//   1. payment.reference_id  → set this to the DL order ID in Square (payment links + invoices)
//   2. payment.payment_link_id → falls back to square_payment_link_id column (existing orders)
//
// Required env var: SQUARE_WEBHOOK_SIGNATURE_KEY (from Square Developer dashboard)
const SQ_SIG_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

const sbh = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function verifySig(body: string, sig: string, url: string): Promise<boolean> {
  if (!SQ_SIG_KEY) return true; // skip in dev if key not set
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SQ_SIG_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(url + body)
    );
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    return sig === expected;
  } catch {
    return false;
  }
}

async function findOrderByLinkId(linkId: string): Promise<string | null> {
  const r = await fetch(
    `${SB_URL}/rest/v1/orders?square_payment_link_id=eq.${encodeURIComponent(linkId)}&select=id`,
    { headers: sbh }
  );
  const rows: Array<{ id: string }> = await r.json();
  return rows[0]?.id ?? null;
}

async function patchOrder(orderId: string, data: Record<string, unknown>) {
  await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: sbh,
    body: JSON.stringify(data),
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("x-square-hmacsha256-signature") ?? "";

  if (!(await verifySig(body, sig, request.url))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }

  // payment.updated fires when a payment reaches COMPLETED status
  if (event.type === "payment.updated" && event.data?.object?.payment?.status === "COMPLETED") {
    const payment = event.data?.object?.payment;
    if (!payment) return Response.json({ ok: true });

    const squarePaymentId: string = payment.id;
    const totalCents: number = payment.total_money?.amount ?? 0;
    const feeCents: number = (payment.processing_fee ?? []).reduce(
      (s: number, f: any) => s + (f.amount_money?.amount ?? 0),
      0
    );
    const total = totalCents / 100;
    const squareFee = Math.round(feeCents) / 100;

    // 1. Match by reference_id (DL order ID set in Square)
    let orderId: string | null = payment.reference_id ?? null;

    // 2. Fall back to payment link ID match
    if (!orderId && payment.payment_link_id) {
      orderId = await findOrderByLinkId(payment.payment_link_id);
    }

    if (orderId) {
      await patchOrder(orderId, {
        total,
        square_fee: squareFee,
        square_payment_id: squarePaymentId,
      });
    }
  }

  // refund.updated fires when a refund reaches COMPLETED status
  if (event.type === "refund.updated" && event.data?.object?.refund?.status === "COMPLETED") {
    const refund = event.data.object.refund;
    const refundCents: number = refund.amount_money?.amount ?? 0;
    const refundedAmount = refundCents / 100;
    const paymentId: string = refund.payment_id;

    if (paymentId) {
      // Find order by square_payment_id
      const r = await fetch(
        `${SB_URL}/rest/v1/orders?square_payment_id=eq.${encodeURIComponent(paymentId)}&select=id,refunded_amount`,
        { headers: sbh }
      );
      const rows: Array<{ id: string; refunded_amount: number }> = await r.json();
      const order = rows[0];
      if (order) {
        const newTotal = Math.round(((Number(order.refunded_amount) || 0) + refundedAmount) * 100) / 100;
        await patchOrder(order.id, { refunded_amount: newTotal });
      }
    }
  }

  // Always return 200 so Square doesn't retry
  return Response.json({ ok: true });
}
