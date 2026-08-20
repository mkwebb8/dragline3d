export const runtime = "edge";
import { signState } from "@/lib/signedState";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SECRET_KEY!;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const r = await fetch(
    `${SB_URL}/rest/v1/catalog_items?id=eq.${params.id}&published=eq.true&select=*`,
    { headers: { apikey: SB_KEY } }
  );
  if (!r.ok) return Response.json({ error: "Not found" }, { status: 404 });
  const rows = await r.json();
  if (!rows[0]) return Response.json({ error: "Not found" }, { status: 404 });
  if (!process.env.CHECKOUT_SIGNING_SECRET) return Response.json({ error: "Catalog ordering is not configured" }, { status: 503 });
  return Response.json({
    ...rows[0],
    catalogToken: await signState("catalog-item", { id: rows[0].id, fileName: rows[0].file_name }, 60 * 60),
  });
}
