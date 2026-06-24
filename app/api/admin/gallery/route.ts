// Admin gallery CRUD
import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const sbh = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// GET all items (admin sees hidden too)
export async function GET(req: Request) {
  if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await fetch(`${SB_URL}/rest/v1/gallery_items?order=sort_order.asc,created_at.asc`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  return Response.json(await r.json());
}

// POST create new item
export async function POST(req: Request) {
  if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const r = await fetch(`${SB_URL}/rest/v1/gallery_items`, {
    method: "POST",
    headers: sbh,
    body: JSON.stringify(body),
  });
  if (!r.ok) return Response.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();
  return Response.json(Array.isArray(rows) ? rows[0] : rows);
}
