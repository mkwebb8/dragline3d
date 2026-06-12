// scripts/backfill-square-fees.mjs
// Pulls real fee data from Square API for existing orders and writes it to Supabase.
//
// Usage (from project root):
//   node scripts/backfill-square-fees.mjs
//
// Requires these env vars (reads from .env.local automatically):
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY
//   SQUARE_ACCESS_TOKEN   ← from Square Developer dashboard → your app → OAuth → Production Access Token
//
// What it does:
//   1. Fetches all orders from Supabase where square_fee IS NULL
//   2. For each order that has a square_payment_id, calls GET /v2/payments/{id} on Square
//   3. Extracts total_money and processing_fee, patches Supabase
//   4. For orders with only square_payment_link_id (no payment ID yet), attempts to find
//      the payment by listing Square payments and matching the link ID
//
// Run once — already-patched orders (square_fee NOT NULL) are skipped automatically.

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
  console.log("✓ Loaded .env.local");
} else {
  console.warn("⚠ No .env.local found — relying on shell environment variables");
}

// ── Config ───────────────────────────────────────────────────────────────────
const SB_URL   = process.env.SUPABASE_URL;
const SB_KEY   = process.env.SUPABASE_SERVICE_KEY;
const SQ_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQ_BASE  = "https://connect.squareup.com/v2";

if (!SB_URL || !SB_KEY) {
  console.error("✗ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}
if (!SQ_TOKEN) {
  console.error("✗ Missing SQUARE_ACCESS_TOKEN");
  console.error("  Find it: Square Developer dashboard → your app → Credentials → Production Access Token");
  process.exit(1);
}

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const sqHeaders = {
  Authorization: `Bearer ${SQ_TOKEN}`,
  "Content-Type": "application/json",
  "Square-Version": "2024-01-18",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function sbFetch(path, opts = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...opts, headers: { ...sbHeaders, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`Supabase ${opts.method || "GET"} ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sqGetPayment(paymentId) {
  const r = await fetch(`${SQ_BASE}/payments/${paymentId}`, { headers: sqHeaders });
  if (!r.ok) {
    const body = await r.text();
    if (r.status === 404) return null;
    throw new Error(`Square GET /payments/${paymentId} → ${r.status}: ${body}`);
  }
  const { payment } = await r.json();
  return payment;
}

// Search Square payments by payment_link_id (used for older orders without square_payment_id)
async function sqFindPaymentByLinkId(linkId) {
  // Square doesn't have a direct filter by link ID, so we list recent payments and scan
  // Limit to last 200 to keep it fast; adjust if you have more
  let cursor = null;
  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    const body = { limit: 100, sort_order: "DESC" };
    if (cursor) body.cursor = cursor;
    const r = await fetch(`${SQ_BASE}/payments`, {
      method: "POST",
      headers: sqHeaders,
      body: JSON.stringify(body),
    });
    if (!r.ok) break;
    const data = await r.json();
    const payments = data.payments || [];
    const match = payments.find(p => p.payment_link_id === linkId);
    if (match) return match;
    if (!data.cursor || payments.length === 0) break;
    cursor = data.cursor;
  }
  return null;
}

function extractFee(payment) {
  const feeCents = (payment.processing_fee || []).reduce(
    (s, f) => s + (f.amount_money?.amount ?? 0),
    0
  );
  return Math.round(feeCents) / 100;
}

function extractTotal(payment) {
  return (payment.total_money?.amount ?? 0) / 100;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n── Fetching orders from Supabase ─────────────────────────────");

  // Get all orders where square_fee is null (not yet backfilled)
  const orders = await sbFetch(
    "orders?square_fee=is.null&status=neq.cancelled&select=id,square_payment_id,square_payment_link_id,total,status&order=created_at.desc"
  );

  console.log(`Found ${orders.length} orders missing square_fee\n`);

  if (orders.length === 0) {
    console.log("✓ Nothing to backfill — all orders already have fee data.");
    return;
  }

  let patched = 0;
  let skipped = 0;
  let failed  = 0;

  for (const order of orders) {
    const { id, square_payment_id, square_payment_link_id } = order;
    let payment = null;

    // Try by payment ID first (most reliable)
    if (square_payment_id) {
      try {
        payment = await sqGetPayment(square_payment_id);
      } catch (e) {
        console.error(`  ✗ ${id}: Square API error — ${e.message}`);
        failed++;
        continue;
      }
    }

    // Fall back to link ID search
    if (!payment && square_payment_link_id) {
      console.log(`  ~ ${id}: no payment ID, searching by link ID ${square_payment_link_id}…`);
      try {
        payment = await sqFindPaymentByLinkId(square_payment_link_id);
      } catch (e) {
        console.error(`  ✗ ${id}: Square search error — ${e.message}`);
        failed++;
        continue;
      }
    }

    if (!payment) {
      console.log(`  – ${id}: no matching Square payment found (pending/unpaid?), skipping`);
      skipped++;
      continue;
    }

    if (payment.status !== "COMPLETED") {
      console.log(`  – ${id}: Square payment status is ${payment.status}, skipping`);
      skipped++;
      continue;
    }

    const total      = extractTotal(payment);
    const square_fee = extractFee(payment);
    const patch      = {
      total,
      square_fee,
      square_payment_id: payment.id,
    };

    try {
      await sbFetch(`orders?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      console.log(`  ✓ ${id}: total=$${total.toFixed(2)}, fee=$${square_fee.toFixed(2)}`);
      patched++;
    } catch (e) {
      console.error(`  ✗ ${id}: Supabase patch failed — ${e.message}`);
      failed++;
    }

    // Small delay to avoid Square rate limits (150 req/s)
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n── Done ───────────────────────────────────────────────────────`);
  console.log(`  Patched : ${patched}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Failed  : ${failed}`);
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
