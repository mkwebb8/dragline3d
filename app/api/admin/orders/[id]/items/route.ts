// POST /api/admin/orders/[id]/items
// Manually add a part to an existing order (with optional file upload)
export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

function sb(path: string, opts: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts.headers || {}),
    },
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const material = (form.get("material") as string) || "PLA";
  const color = (form.get("color") as string) || "";
  const quality = (form.get("quality") as string) || "Standard";
  const infill = parseInt(form.get("infill") as string) || 15;
  const qty = parseInt(form.get("qty") as string) || 1;
  const grams = parseFloat(form.get("grams") as string) || 0;
  const hours = parseFloat(form.get("hours") as string) || 0;
  const price = parseFloat(form.get("price") as string) || 0;
  const file_name = (form.get("file_name") as string) || file?.name || "manual-part.stl";

  // Insert the order_item record first to get its ID
  const itemRes = await sb("order_items", {
    method: "POST",
    body: JSON.stringify({
      order_id: params.id,
      file_name,
      material,
      color,
      quality,
      infill,
      qty,
      grams: grams || null,
      hours: hours || null,
      price,
      part_status: "pending",
      printed_qty: 0,
    }),
  });

  if (!itemRes.ok) return Response.json({ error: await itemRes.text() }, { status: 500 });
  const [item] = await itemRes.json();

  // If a file was provided, upload it to Supabase Storage
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "stl";
    const storagePath = `${params.id}/${item.id}-${Date.now()}.${ext}`;

    const uploadRes = await fetch(`${SB_URL}/storage/v1/object/order-files/${storagePath}`, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/octet-stream",
        "x-upsert": "true",
      },
      body: await file.arrayBuffer(),
    });

    if (uploadRes.ok) {
      const fileUrl = `order-files/${storagePath}`;
      await sb(`order_items?id=eq.${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ file_url: fileUrl, file_name: file.name }),
      });
      item.file_url = fileUrl;
      item.file_name = file.name;
    }
  }

  return Response.json(item);
}
