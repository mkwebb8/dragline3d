export const runtime = "edge";
export async function GET(request: Request) {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const linkId = url.searchParams.get("linkId");
    if (key !== "dl3d-temp-9271") return Response.json({ error: "nope" }, { status: 403 });
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken || !linkId) return Response.json({ error: "missing config" }, { status: 400 });
    const plResp = await fetch(`https://connect.squareup.com/v2/online-checkout/payment-links/${linkId}`, {
          headers: { "Square-Version": "2026-01-22", "Authorization": `Bearer ${accessToken}` },
    });
    const plData = await plResp.json();
    const orderId = plData.payment_link?.order_id;
    if (!orderId) return Response.json({ plData }, { status: 200 });
    const orResp = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
          headers: { "Square-Version": "2026-01-22", "Authorization": `Bearer ${accessToken}` },
    });
    const orData = await orResp.json();
    return Response.json({ orderId, lineItems: orData.order?.line_items || [] });
}
