export async function GET(request: Request) {
  const workerUrl = process.env.SLICER_WORKER_URL;
  if (!workerUrl) return Response.json({ error: "Worker not configured" }, { status: 503 });
  try {
    const resp = await fetch(`${workerUrl}/shelly/session/status`, {
      headers: { "x-worker-secret": process.env.WORKER_SECRET || "" },
    });
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch {
    return Response.json({ error: "Worker unreachable" }, { status: 503 });
  }
}
