export const runtime = "edge";

export async function POST(request: Request) {
  const workerUrl = process.env.SLICER_WORKER_URL;
  if (!workerUrl) return Response.json({ error: "Slicer worker not configured" }, { status: 503 });

  try {
    const body = await request.arrayBuffer();
    const resp = await fetch(`${workerUrl}/slice`, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") || "",
        "x-worker-secret": process.env.WORKER_SECRET || "",
      },
      body,
    });
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch {
    return Response.json({ error: "Slicer unavailable", fallback: true }, { status: 503 });
  }
}
