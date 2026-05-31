export const runtime = "edge";

export async function POST(request) {
  const workerUrl = process.env.SLICER_WORKER_URL;
  if (!workerUrl) return Response.json({ error: "Slicer worker not configured" }, { status: 503 });
  const headers = new Headers(request.headers);
  headers.set("x-worker-secret", proce
@'
export const runtime = "edge";

export async function POST(request) {
  const workerUrl = process.env.SLICER_WORKER_URL;
  if (!workerUrl) return Response.json({ error: "Slicer worker not configured" }, { status: 503 });
  const headers = new Headers(request.headers);
  headers.set("x-worker-secret", process.env.WORKER_SECRET || "");
  try {
    const resp = await fetch(`${workerUrl}/slice`, { method: "POST", headers, body: request.body, duplex: "half" });
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch {
    return Response.json({ error: "Slicer unavailable", fallback: true }, { status: 503 });
  }
}
