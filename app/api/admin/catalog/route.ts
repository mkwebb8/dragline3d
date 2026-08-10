export const runtime = "edge";

import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function GET(req: Request) {
    if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const r = await fetch(`${SB_URL}/rest/v1/catalog_items?order=sort_order.asc,created_at.desc`, {
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    if (!r.ok) return Response.json({ error: await r.text() }, { status: 500 });
    return Response.json(await r.json());
}

export async function POST(req: Request) {
    if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const r = await fetch(`${SB_URL}/rest/v1/catalog_items`, {
          method: "POST",
          headers: {
                  apikey: SB_KEY,
                  Authorization: `Bearer ${SB_KEY}`,
                  "Content-Type": "application/json",
                  Prefer: "return=representation",
          },
          body: JSON.stringify(body),
    });
    if (!r.ok) return Response.json({ error: await r.text() }, { status: 500 });
    const rows = await r.json();
    return Response.json(Array.isArray(rows) ? rows[0] : rows);
}
