export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";
export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const workerUrl = process.env.SLICER_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret) return Response.json({ error: "Worker not configured" }, { status: 503 });
  try {
    const resp = await fetch(`${workerUrl}/shelly/session/stop`, {
      method: "POST",
      headers: {
        "x-worker-secret": workerSecret,
        "content-type": "application/json",
      },
      body: "{}",
    });
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch {
    return Response.json({ error: "Worker unreachable" }, { status: 503 });
  }
}
