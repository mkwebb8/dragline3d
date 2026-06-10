// app/api/admin/square/payouts/route.ts
// GET  → returns payouts from Supabase (fast, cached)
// POST → syncs latest payouts from Square API into Supabase, then returns them
export const runtime = "edge";

import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SQ_TOKEN = process.env.SQUARE_ACCESS_TOKEN!;
const SQ_BASE = "https://connect.squareup.com/v2";

const sbh = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const sqh = {
  Authorization: `Bearer ${SQ_TOKEN}`,
  "Content-Type": "application/json",
  "Square-Version": "2024-01-18",
};

// Fetch all payouts from Supabase
export async function GET(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await fetch(`${SB_URL}/rest/v1/square_payouts?order=arrival_date.desc&limit=50`, { headers: sbh });
  return Response.json(await r.json());
}

// Sync from Square → Supabase, return results
export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Pull last 90 days of payouts from Square
  const begin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let allPayouts: any[] = [];
  let cursor: string | null = null;

  do {
    const params = new URLSearchParams({
      sort_order: "DESC",
      begin_time: `${begin}T00:00:00Z`,
      limit: "100",
    });
    if (cursor) params.set("cursor", cursor);

    const r = await fetch(`${SQ_BASE}/payouts?${params}`, {
      method: "GET",
      headers: sqh,
    });

    if (!r.ok) {
      const err = await r.text();
      return Response.json({ error: `Square API error: ${err}` }, { status: 502 });
    }

    const data = await r.json();
    allPayouts = allPayouts.concat(data.payouts || []);
    cursor = data.cursor ?? null;
  } while (cursor);

  if (allPayouts.length === 0) {
    return Response.json({ synced: 0, payouts: [] });
  }

  // Upsert into Supabase
  const rows = allPayouts.map((p: any) => ({
    id: p.id,
    status: p.status,
    amount: (p.amount_money?.amount ?? 0) / 100,
    arrival_date: p.arrival_date ?? p.created_at?.slice(0, 10),
  }));

  const upsertR = await fetch(`${SB_URL}/rest/v1/square_payouts`, {
    method: "POST",
    headers: { ...sbh, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });

  if (!upsertR.ok) {
    return Response.json({ error: await upsertR.text() }, { status: 500 });
  }

  return Response.json({ synced: rows.length, payouts: rows });
}
