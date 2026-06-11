export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const fileName = url.searchParams.get("fileName");
  if (!fileName) return Response.json({ error: "fileName required" }, { status: 400 });
  const slicerUrl = process.env.SLICER_WORKER_URL || "https://slicer.dragline3d.com";
  const workerSecret = process.env.WORKER_SECRET || "";
  try {
    const res = await fetch(`${slicerUrl}/get-file?orderId=${params.id}&fileName=${encodeURIComponent(fileName)}`, {
      headers: { "x-worker-secret": workerSecret },
    });
    if (!res.ok) return Response.json({ error: "File not found on NAS" }, { status: 404 });
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
