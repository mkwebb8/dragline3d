export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const slicerUrl = process.env.SLICER_WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!slicerUrl || !secret) return Response.json({ error: "Not configured" }, { status: 503 });
  try {
    const res = await fetch(`${slicerUrl}/printer`, { headers: { "x-worker-secret": secret } });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "Printer unreachable" }, { status: 503 });
  }
}
