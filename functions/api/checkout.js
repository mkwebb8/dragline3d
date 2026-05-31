const MATERIALS = {
  PLA: { costPerKg: 22, density: 1.24 }, PETG: { costPerKg: 28, density: 1.27 },
  TPU: { costPerKg: 38, density: 1.21 }, ABS: { costPerKg: 25, density: 1.04 },
  ASA: { costPerKg: 32, density: 1.07 }, PC: { costPerKg: 48, density: 1.20 },
  PA: { costPerKg: 55, density: 1.14 }, "PLA-CF": { costPerKg: 65, density: 1.30 },
  "PETG-CF": { costPerKg: 70, density: 1.31 }, "PA-CF": { costPerKg: 95, density: 1.18 },
};
const QUALITIES = { draft: { mult: 0.7 }, standard: { mult: 1.0 }, fine: { mult: 1.6 } };
function computePrice(volumeMm3, material, quality, infill) {
  const mat = MATERIALS[material]; const q = QUALITIES[quality];
  if (!mat || !q) return null;
  const shellFraction = 0.12;
  const effectiveFill = shellFraction + (1 - shellFraction) * (infill / 100);
  const grams = (volumeMm3 / 1000) * mat.density * effectiveFill;
  const hours = (grams / 10) * q.mult;
  const subtotal = ((grams / 1000) * mat.costPerKg * 2.5 + hours * 3 + 4) * 1.08;
  return Math.max(8, Math.round(subtotal * 100) / 100);
}
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const { volumeMm3, material, quality, infill, fileName } = body;
  if (!MATERIALS[material] || !QUALITIES[quality] || typeof volumeMm3 !== "number") return json({ error: "Invalid params" }, 400);
  const price = computePrice(volumeMm3, material, quality, infill);
  const amountCents = Math.round(price * 100);
  const itemName = `${(fileName || "Custom part").slice(0, 60)} · ${material} · ${quality}`;
  const squareBody = {
    idempotency_key: crypto.randomUUID(),
    quick_pay: { name: itemName, price_money: { amount: amountCents, currency: "USD" }, location_id: env.SQUARE_LOCATION_ID },
    checkout_options: { redirect_url: "https://dragline3d.com/order-confirmed", ask_for_shipping_address: true },
  };
  const resp = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
    method: "POST",
    headers: { "Square-Version": "2026-01-22", "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(squareBody),
  });
  const data = await resp.json();
  if (!resp.ok) return json({ error: "Payment provider error" }, 502);
  return json({ url: data.payment_link?.url, price });
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
