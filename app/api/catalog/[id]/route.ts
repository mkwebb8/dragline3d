export const runtime = "edge";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SECRET_KEY!;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const r = await fetch(
    `${SB_URL}/rest/v1/catalog_items?id=eq.${params.id}&published=eq.true&select=*`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  if (!r.ok) return Response.json({ error: "Not found" }, { status: 404 });
  const rows = await r.json();
  if (!rows[0]) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(rows[0]);
}
