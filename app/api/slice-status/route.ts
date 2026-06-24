export async function GET(request: Request) {
  const workerUrl = process.env.SLICER_WORKER_URL;
  if (!workerUrl) return Response.json({ error: "Slicer worker not configured" }, { status: 503 });

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) return Response.json({ error: "jobId required" }, { status: 400 });

  try {
    const resp = await fetch(`${workerUrl}/slice-status?jobId=${encodeURIComponent(jobId)}`, {
      headers: { "x-worker-secret": process.env.WORKER_SECRET || "" },
    });
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch {
    return Response.json({ error: "Slicer unavailable", fallback: true }, { status: 503 });
  }
}
