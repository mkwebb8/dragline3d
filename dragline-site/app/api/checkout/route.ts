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
  const { items, shippingCost, shippingLabel, customerEmail, customerName } = body;

  const locationId = process.env.SQUARE_LOCATION_ID;
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!locationId || !accessToken) {
    return Response.json({ error: "Square not configured" }, { status: 503 });
  }

  // Single item (legacy) or multi-item cart
  const lineItems: any[] = [];

  if (items && Array.isArray(items)) {
    for (const item of items) {
      const price = item.price || computePrice(item.volumeMm3, item.material, item.quality, item.infill) || 8;
      lineItems.push({
        name: `${item.fileName.replace(/\.(stl|3mf)$/i, "")} - ${item.material} ${item.quality} ${item.infill}%`,
        quantity: "1",
        base_price_money: { amount: Math.round(price * 100), currency: "USD" },
      });
    }
  } else {
    // Legacy single-item
    const { volumeMm3, material, quality, infill, fileName } = body;
    const price = computePrice(volumeMm3, material, quality, infill) || 8;
    lineItems.push({
      name: `${(fileName || "Custom part").replace(/\.(stl|3mf)$/i, "")} - ${material} ${quality} ${infill}%`,
      quantity: "1",
      base_price_money: { amount: Math.round(price * 100), currency: "USD" },
    });
    return Response.json({
      url: (await createLink(lineItems, 0, "", customerEmail, customerName, accessToken, locationId))
    });
  }

  if (shippingCost && shippingCost > 0) {
    lineItems.push({
      name: `Shipping - ${shippingLabel || "USPS"}`,
      quantity: "1",
      base_price_money: { amount: Math.round(shippingCost * 100), currency: "USD" },
    });
  }

  const url = await createLink(lineItems, shippingCost || 0, shippingLabel || "", customerEmail, customerName, accessToken, locationId);
  return Response.json({ url });
}

async function createLink(lineItems: any[], shippingCost: number, shippingLabel: string, customerEmail: string, customerName: string, accessToken: string, locationId: string) {
  const squareBody = {
    idempotency_key: crypto.randomUUID(),
    order: { location_id: locationId, line_items: lineItems },
    checkout_options: {
      redirect_url: "https://dragline3d.com/order-confirmed",
      ask_for_shipping_address: false,
      merchant_support_email: "info@dragline3d.com",
    },
    pre_populated_data: { buyer_email: customerEmail || "" },
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
  if (!resp.ok) throw new Error("Square error: " + JSON.stringify(data));
  return data.payment_link?.url;
}
