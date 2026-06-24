// Public gallery endpoint — no auth required, returns only visible items
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function GET() {
  const r = await fetch(
    `${SB_URL}/rest/v1/gallery_items?visible=eq.true&order=sort_order.asc,created_at.asc`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  if (!r.ok) return Response.json([], { status: 200 });
  return Response.json(await r.json());
}
