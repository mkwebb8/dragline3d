export const runtime = "edge";

export async function GET() {
  const slicerUrl = process.env.SLICER_WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!slicerUrl) return Response.json({ error: "Not configured" }, { status: 503 });
  try {
    const res = await fetch(`${slicerUrl}/printer`, { headers: { "x-worker-secret": secret || "" } });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "Printer unreachable" }, { status: 503 });
  }
}
