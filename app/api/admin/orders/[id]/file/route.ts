export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const fileName = url.searchParams.get("fileName");
  const itemId = url.searchParams.get("itemId");
  if (!fileName) return Response.json({ error: "fileName required" }, { status: 400 });

  // Check if the item has a file_url override in Supabase Storage
  if (itemId) {
    const itemRes = await fetch(
      `${SB_URL}/rest/v1/order_items?id=eq.${itemId}&select=file_url`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (itemRes.ok) {
      const [item] = await itemRes.json();
      if (item?.file_url) {
        // Stream from Supabase Storage
        const storageRes = await fetch(
          `${SB_URL}/storage/v1/object/${item.file_url}`,
          { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
        );
        if (storageRes.ok) {
          const buffer = await storageRes.arrayBuffer();
          return new Response(buffer, {
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `attachment; filename="${fileName}"`,
            },
          });
        }
      }
    }
  }

  // Fall back to NAS worker
  const slicerUrl = process.env.SLICER_WORKER_URL || "https://slicer.dragline3d.com";
  const workerSecret = process.env.WORKER_SECRET || "";
  try {
    const res = await fetch(
      `${slicerUrl}/get-file?orderId=${params.id}&fileName=${encodeURIComponent(fileName)}`,
      { headers: { "x-worker-secret": workerSecret } }
    );
    if (!res.ok) return Response.json({ error: "File not found" }, { status: 404 });
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
