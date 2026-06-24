// Admin gallery item PATCH / DELETE
import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const sbh = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await verifyAdminToken(req))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const r = await fetch(`${SB_URL}/rest/v1/gallery_items?id=eq.${params.id}`, {
    method: "PATCH",
    headers: sbh,
    body: JSON.stringify(body),
  });
  if (!r.ok) return Response.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();
  return Response.json(Array.isArray(rows) ? rows[0] : rows);
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await verifyAdminToken(req))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Also delete the storage object if there's an image
  const getR = await fetch(`${SB_URL}/rest/v1/gallery_items?id=eq.${params.id}&select=image_url`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (getR.ok) {
    const [item] = await getR.json();
    if (item?.image_url) {
      const path = item.image_url.split("/gallery/")[1];
      if (path) {
        await fetch(`${SB_URL}/storage/v1/object/gallery/${path}`, {
          method: "DELETE",
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
        });
      }
    }
  }

  const r = await fetch(`${SB_URL}/rest/v1/gallery_items?id=eq.${params.id}`, {
    method: "DELETE",
    headers: sbh,
  });
  if (!r.ok) return Response.json({ error: await r.text() }, { status: 500 });
  return Response.json({ ok: true });
}
