// Upload a replacement file for an order item (e.g. STEP received via email)
// Stores in Supabase Storage and saves the URL to order_items.file_url
import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function POST(req: Request, props: { params: Promise<{ id: string; itemId: string }> }) {
  const params = await props.params;
  if (!(await verifyAdminToken(req))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${params.id}/${params.itemId}-${Date.now()}.${ext}`;

  // Upload to Supabase Storage (private bucket)
  const uploadRes = await fetch(`${SB_URL}/storage/v1/object/order-files/${path}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/octet-stream",
      "x-upsert": "true",
    },
    body: await file.arrayBuffer(),
  });

  if (!uploadRes.ok) {
    return Response.json({ error: await uploadRes.text() }, { status: 500 });
  }

  // Store the storage path (not a public URL — we'll stream it via the download route)
  const fileUrl = `order-files/${path}`;

  const patchRes = await fetch(
    `${SB_URL}/rest/v1/order_items?id=eq.${params.itemId}`,
    {
      method: "PATCH",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ file_url: fileUrl, file_name: file.name }),
    }
  );

  if (!patchRes.ok) return Response.json({ error: await patchRes.text() }, { status: 500 });
  const rows = await patchRes.json();
  return Response.json(Array.isArray(rows) ? rows[0] : rows);
}
