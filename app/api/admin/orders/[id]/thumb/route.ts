import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await verifyAdminToken(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) return new Response("itemId required", { status: 400 });

  const slicerUrl = process.env.SLICER_URL || "https://slicer.dragline3d.com";
  const workerSecret = process.env.WORKER_SECRET || "";

  try {
    const res = await fetch(
      `${slicerUrl}/get-thumb?orderId=${encodeURIComponent(params.id)}&itemId=${encodeURIComponent(itemId)}`,
      { headers: { "x-worker-secret": workerSecret } }
    );
    if (!res.ok) return new Response("Thumbnail not found", { status: 404 });
    return new Response(res.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Error fetching thumbnail", { status: 500 });
  }
}
