// Proxies a file save request to the slicer worker's /save-files endpoint
// Called after admin manually creates an order so files land on the NAS
import { verifyAdminToken } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const slicerUrl = process.env.SLICER_URL || "https://slicer.dragline3d.com";
  const workerSecret = process.env.WORKER_SECRET || "";

  const form = await req.formData();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${slicerUrl}/save-files`, {
      method: "POST",
      headers: { "x-worker-secret": workerSecret },
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
