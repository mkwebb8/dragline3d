export const runtime = "edge";

export async function POST(request: Request) {
  const workerUrl = process.env.SLICER_WORKER_URL;
  if (!workerUrl) return Response.json({ error: "Slicer worker not configured" }, { status: 503 });

  try {
    const contentType = request.headers.get("content-type") || "";
    const body = await request.arrayBuffer();

    const resp = await fetch(`${workerUrl}/convert-step`, {
      method: "POST",
      headers: {
        "content-type": contentType,
        "x-worker-secret": process.env.WORKER_SECRET || "",
        "content-length": body.byteLength.toString(),
      },
      body: new Uint8Array(body),
    });
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch {
    return Response.json({ error: "Conversion unavailable", fallback: true }, { status: 503 });
  }
}
