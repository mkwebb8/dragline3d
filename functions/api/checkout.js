// functions/api/checkout.js
// Cloudflare Pages Function — runs server-side, secrets never reach the browser.
//
// Flow:
//   1. Browser POSTs { volumeMm3, material, quality, infill, fileName }
//   2. We RECOMPUTE the price here (never trust the browser's number)
//   3. We call Square's CreatePaymentLink (quick pay) with that price
//   4. We return the Square checkout URL; browser redirects to it
//
// Required Cloudflare environment variables (encrypted, set in dashboard):
//   SQUARE_ACCESS_TOKEN  — production access token from Square Developer dashboard
//   SQUARE_LOCATION_ID   — your seller location ID
//
// Pricing logic below MUST stay in sync with /lib/stl.ts

const MATERIALS = {
  PLA:       { costPerKg: 22, density: 1.24 },
  PETG:      { costPerKg: 28, density: 1.27 },
  TPU:       { costPerKg: 38, density: 1.21 },
  ABS:       { costPerKg: 25, density: 1.04 },
  ASA:       { costPerKg: 32, density: 1.07 },
  PC:        { costPerKg: 48, density: 1.20 },
  PA:        { costPerKg: 55, density: 1.14 },
  "PLA-CF":  { costPerKg: 65, density: 1.30 },
  "PETG-CF": { costPerKg: 70, density: 1.31 },
  "PA-CF":   { costPerKg: 95, density: 1.18 },
};

const QUALITIES = {
  draft:    { mult: 0.7 },
  standard: { mult: 1.0 },
  fine:     { mult: 1.6 },
};

function computePrice(volumeMm3, material, quality, infill) {
  const mat = MATERIALS[material];
  const q = QUALITIES[quality];
  if (!mat || !q) return null;

  const shellFraction = 0.12;
  const effectiveFill = shellFraction + (1 - shellFraction) * (infill / 100);
  const volumeCm3 = volumeMm3 / 1000;
  const grams = volumeCm3 * mat.density * effectiveFill;
  const hours = (grams / 10) * q.mult;
  const materialCost = (grams / 1000) * mat.costPerKg * 2.5;
  const machineCost = hours * 3;
  const setup = 4;
  const subtotal = (materialCost + machineCost + setup) * 1.08;
  const price = Math.max(8, Math.round(subtotal * 100) / 100);
  return price;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Basic CORS / JSON guard
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { volumeMm3, material, quality, infill, fileName } = body;

  // Validate inputs
  if (
    typeof volumeMm3 !== "number" || volumeMm3 <= 0 ||
    !MATERIALS[material] ||
    !QUALITIES[quality] ||
    typeof infill !== "number" || infill < 5 || infill > 100
  ) {
    return json({ error: "Invalid order parameters" }, 400);
  }

  // Recompute price server-side — this is the number we charge
  const price = computePrice(volumeMm3, material, quality, infill);
  if (!price) return json({ error: "Could not compute price" }, 400);

  // Square wants the amount in cents (integer)
  const amountCents = Math.round(price * 100);

  // Build a readable line-item name
  const safeName = (fileName || "Custom part").replace(/[^\w.\- ]/g, "").slice(0, 60);
  const itemName = `${safeName} · ${material} · ${quality}`;

  // Idempotency key prevents duplicate links if the request retries
  const idempotencyKey = crypto.randomUUID();

  const squareBody = {
    idempotency_key: idempotencyKey,
    quick_pay: {
      name: itemName,
      price_money: { amount: amountCents, currency: "USD" },
      location_id: env.SQUARE_LOCATION_ID,
    },
    checkout_options: {
      redirect_url: "https://dragline3d.com/order-confirmed",
      ask_for_shipping_address: true,
    },
    payment_note: `Dragline 3D order: ${itemName}`,
  };

  const resp = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
    method: "POST",
    headers: {
      "Square-Version": "2026-01-22",
      "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(squareBody),
  });

  const data = await resp.json();

  if (!resp.ok) {
    // Surface a generic error to the browser; log detail server-side
    console.error("Square error:", JSON.stringify(data));
    return json({ error: "Payment provider error. Please try again or contact us." }, 502);
  }

  return json({ url: data.payment_link?.url, price });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
