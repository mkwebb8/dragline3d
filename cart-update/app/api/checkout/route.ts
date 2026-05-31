export const runtime = "edge";

const MATERIALS: Record<string, { costPerKg: number; density: number }> = {
  PLA:{costPerKg:13,density:1.24},PETG:{costPerKg:13.5,density:1.27},TPU:{costPerKg:20,density:1.21},
  ABS:{costPerKg:16,density:1.04},ASA:{costPerKg:18,density:1.07},PC:{costPerKg:25,density:1.20},
  PA:{costPerKg:25,density:1.14},"PLA-CF":{costPerKg:35,density:1.30},"PETG-CF":{costPerKg:40,density:1.31},"PA-CF":{costPerKg:70,density:1.18},
};
const QUALITIES: Record<string, { mult: number }> = {draft:{mult:0.7},standard:{mult:1.0},fine:{mult:1.6}};

function computePrice(volumeMm3: number, material: string, quality: string, infill: number) {
  const mat = MATERIALS[material]; const q = QUALITIES[quality];
  if (!mat || !q) return null;
  const grams = (volumeMm3 / 1000) * mat.density * (0.12 + (1 - 0.12) * (infill / 100));
  const hours = (grams / 10) * q.mult;
  return Math.max(8, Math.round(((grams / 1000) * mat.costPerKg * 2.5 + hours * 0.20 + 12) * 1.08 * 100) / 100);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { items, shippingCost, shippingLabel, customerEmail, customerName, redirectUrl } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "No items" }, { status: 400 });
  }

  const locationId = process.env.SQUARE_LOCATION_ID;
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!locationId || !accessToken) {
    return Response.json({ error: "Square not configured" }, { status: 503 });
  }

  // Build line items - recompute prices server-side
  const lineItems: any[] = items.map((item: any) => {
    const price = item.price || computePrice(item.volumeMm3, item.material, item.quality, item.infill) || 8;
    return {
      name: `${item.fileName.replace(/\.stl$/i, "")} - ${item.material} ${item.quality} ${item.infill}%`,
      quantity: "1",
      base_price_money: { amount: Math.round(price * 100), currency: "USD" },
    };
  });

  // Add shipping as a line item
  if (shippingCost && shippingCost > 0) {
    lineItems.push({
      name: `Shipping - ${shippingLabel || "USPS"}`,
      quantity: "1",
      base_price_money: { amount: Math.round(shippingCost * 100), currency: "USD" },
    });
  }

  const squareBody = {
    idempotency_key: crypto.randomUUID(),
    order: {
      location_id: locationId,
      line_items: lineItems,
    },
    checkout_options: {
      redirect_url: redirectUrl || "https://dragline3d.com/order-confirmed",
      ask_for_shipping_address: false,
      merchant_support_email: "info@dragline3d.com",
    },
    pre_populated_data: {
      buyer_email: customerEmail || "",
    },
    payment_note: `Dragline 3D order for ${customerName || "customer"}`,
  };

  const resp = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
    method: "POST",
    headers: {
      "Square-Version": "2026-01-22",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(squareBody),
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("Square error:", JSON.stringify(data));
    return Response.json({ error: "Payment provider error" }, { status: 502 });
  }

  return Response.json({ url: data.payment_link?.url });
}
