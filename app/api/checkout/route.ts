export const runtime = "edge";

import { verifyAdminToken } from "@/lib/adminAuth";
import { createOrder, updateOrder } from "@/lib/db";
import { signState, verifyState } from "@/lib/signedState";
import { rateLimit } from "@/lib/rateLimit";

const TAX_RATE = 0.06;
const MAX_ITEMS = 25;
const MAX_QUANTITY = 50;

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function finite(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "checkout", 10, 10 * 60_000);
  if (limited) return limited;
  if (!process.env.CHECKOUT_SIGNING_SECRET) {
    return Response.json({ error: "Checkout is not configured" }, { status: 503 });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 128 * 1024) return Response.json({ error: "Request too large" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid checkout request" }, { status: 400 });

  const manualPricing = body.manualPricing === true;
  if (manualPricing && !await verifyAdminToken(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.length > MAX_ITEMS) return Response.json({ error: "Invalid order items" }, { status: 400 });

  const customerName = cleanText(body.customerName, 120);
  const customerEmail = cleanText(body.customerEmail, 254).toLowerCase();
  const address = cleanText(body.address, 160);
  const city = cleanText(body.city, 80);
  const state = cleanText(body.state, 40);
  const zip = cleanText(body.zip, 20);
  if (!customerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return Response.json({ error: "Valid customer details required" }, { status: 400 });
  }

  let shipping = 0;
  let shippingLabel = "Local Pickup";
  let trustedShippingWeight: number | null = null;
  if (!body.localPickup) {
    const rate = await verifyState(body.shippingRateToken, "shipping-rate");
    if (!rate || !finite(rate.amount, 0, 10_000) || typeof rate.service !== "string") {
      return Response.json({ error: "Invalid or expired shipping rate" }, { status: 400 });
    }
    if (!address || !city || !state || !zip) return Response.json({ error: "Complete shipping address required" }, { status: 400 });
    shipping = rate.amount as number;
    shippingLabel = cleanText(`${rate.provider || ""} ${rate.service}`, 120);
    trustedShippingWeight = typeof rate.weightGrams === "number" ? rate.weightGrams : null;
  }

  const lineItems: any[] = [];
  const dbItems: any[] = [];
  const notificationFiles: Array<{ fileName: string; fileHash: string }> = [];
  let catalogSetupApplied = false;

  for (const submitted of items) {
    const qty = submitted.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      return Response.json({ error: "Invalid item quantity" }, { status: 400 });
    }

    let trusted: any;
    let setupFee = 12;
    if (manualPricing) {
      if (!finite(submitted.price, 0.5, 100_000) || !finite(submitted.grams, 0, 1_000_000) || !finite(submitted.hours, 0, 100_000)) {
        return Response.json({ error: "Invalid manual pricing values" }, { status: 400 });
      }
      trusted = {
        fileName: cleanText(submitted.fileName, 255), material: cleanText(submitted.material, 40),
        quality: cleanText(submitted.quality, 40), infill: submitted.infill,
        grams: submitted.grams, hours: submitted.hours, price: submitted.price,
      };
      setupFee = 0;
    } else {
      trusted = await verifyState(submitted.quoteToken, "quote");
      if (!trusted || !finite(trusted.price, 0.5, 100_000) || !finite(trusted.grams, 0, 1_000_000) || !finite(trusted.hours, 0, 100_000)) {
        return Response.json({ error: "Invalid or expired quote. Please re-slice the part." }, { status: 400 });
      }
      for (const field of ["fileName", "material", "quality", "infill"]) {
        if (submitted[field] !== trusted[field]) return Response.json({ error: "Quote details do not match" }, { status: 400 });
      }
      setupFee = finite(trusted.setupFee, 0, 1_000) ? trusted.setupFee as number : 12;
      if (typeof trusted.fileHash !== "string" || !/^[a-f0-9]{64}$/.test(trusted.fileHash)) {
        return Response.json({ error: "Quote is missing file verification. Please re-slice the part." }, { status: 400 });
      }
      if (submitted.origin === "catalog") {
        const catalog = await verifyState(submitted.catalogToken, "catalog-item");
        if (!catalog || catalog.fileName !== trusted.fileName) return Response.json({ error: "Invalid catalog item" }, { status: 400 });
        setupFee = catalogSetupApplied ? 0 : setupFee;
        catalogSetupApplied = true;
      }
    }

    const fileName = cleanText(trusted.fileName, 255);
    if (!fileName || /[\\/\0]/.test(fileName)) return Response.json({ error: "Invalid file name" }, { status: 400 });
    const price = trusted.price as number;
    lineItems.push({
      name: `${fileName.replace(/\.(stl|3mf|step|stp)$/i, "")} - ${trusted.material} ${trusted.quality} ${trusted.infill}%`.slice(0, 255),
      quantity: String(qty),
      base_price_money: { amount: Math.round(price * 100), currency: "USD" },
    });
    if (setupFee > 0) lineItems.push({
      name: `${fileName.replace(/\.(stl|3mf|step|stp)$/i, "")} - Setup Fee`.slice(0, 255),
      quantity: "1",
      base_price_money: { amount: Math.round(setupFee * 100), currency: "USD" },
    });
    dbItems.push({
      file_name: fileName, material: trusted.material, quality: trusted.quality, infill: trusted.infill,
      grams: trusted.grams, hours: trusted.hours, price, qty, color: cleanText(submitted.color, 80), setup_fee: setupFee,
    });
    if (!manualPricing) notificationFiles.push({ fileName, fileHash: trusted.fileHash });
  }

  const subtotal = Math.round(dbItems.reduce((sum, item) => sum + item.price * item.qty + item.setup_fee, 0) * 100) / 100;
  const orderWeight = dbItems.reduce((sum, item) => sum + item.grams * item.qty, 0);
  if (!body.localPickup && (trustedShippingWeight === null || Math.abs(trustedShippingWeight - orderWeight) > 0.1)) {
    return Response.json({ error: "Shipping rate does not match order weight" }, { status: 400 });
  }
  const taxAmount = Math.round((subtotal + shipping) * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + taxAmount + shipping) * 100) / 100;
  lineItems.push({ name: "KY Sales Tax (6%)", quantity: "1", base_price_money: { amount: Math.round(taxAmount * 100), currency: "USD" } });
  if (shipping > 0) lineItems.push({ name: `Shipping - ${shippingLabel}`, quantity: "1", base_price_money: { amount: Math.round(shipping * 100), currency: "USD" } });

  const locationId = process.env.SQUARE_LOCATION_ID;
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!locationId || !accessToken) return Response.json({ error: "Square not configured" }, { status: 503 });
  const orderId = `DL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

  try {
    await createOrder({
      id: orderId, customer_name: customerName, customer_email: customerEmail,
      address: body.localPickup ? "Local Pickup" : address,
      city: body.localPickup ? "Louisville" : city,
      state: body.localPickup ? "KY" : state, zip: body.localPickup ? "" : zip,
      shipping_service: shippingLabel, shipping_cost: shipping, subtotal, total, status: "pending",
      items: dbItems.map(({ setup_fee, ...item }) => item),
    });
  } catch {
    return Response.json({ error: "Could not create order. No payment link was created." }, { status: 502 });
  }

  const squareBody = {
    idempotency_key: orderId,
    order: { location_id: locationId, reference_id: orderId, line_items: lineItems },
    checkout_options: {
      redirect_url: `https://dragline3d.com/order-confirmed?id=${encodeURIComponent(orderId)}`,
      ask_for_shipping_address: false,
      merchant_support_email: "info@dragline3d.com",
    },
    pre_populated_data: { buyer_email: customerEmail },
    payment_note: `Dragline 3D order ${orderId}`,
  };

  const squareResponse = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
    method: "POST",
    headers: { "Square-Version": "2026-01-22", Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(squareBody),
  });
  const squareData = await squareResponse.json().catch(() => ({}));
  if (!squareResponse.ok || !squareData.payment_link?.id || !squareData.payment_link?.url) {
    await updateOrder(orderId, { status: "cancelled", notes: "Payment link creation failed" }).catch(() => null);
    return Response.json({ error: "Payment provider error" }, { status: 502 });
  }

  try {
    await updateOrder(orderId, { square_payment_link_id: squareData.payment_link.id });
  } catch {
    await fetch(`https://connect.squareup.com/v2/online-checkout/payment-links/${encodeURIComponent(squareData.payment_link.id)}`, {
      method: "DELETE",
      headers: { "Square-Version": "2026-01-22", Authorization: `Bearer ${accessToken}` },
    }).catch(() => null);
    return Response.json({ error: "Order persistence failed. The payment link was disabled." }, { status: 502 });
  }

  return Response.json({
    url: squareData.payment_link.url,
    orderId,
    notificationToken: await signState("order-notification", { orderId, files: notificationFiles }, 10 * 60),
  });
}
