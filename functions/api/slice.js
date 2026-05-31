export async function onRequestPost(context) {
  const { request, env } = context;
  const workerUrl = env.SLICER_WORKER_URL;
  if (!workerUrl) return json({ error: "Slicer worker not configured" }, 503);
  const contentLength = parseInt(request.headers.get("content-length") || "0");
  if (contentLength > 100 * 1024 * 1024) return json({ error: "File too large" }, 413);
  const headers = new Headers(request.headers);
  headers.set("x-worker-secret", env.WORKER_SECRET || "");
  try {
    const resp = await fetch(`${workerUrl}/slice`, { method: "POST", headers, body: request.body, duplex: "half" });
    const data = await resp.json();
    return json(data, resp.status);
  } catch (err) {
    return json({ error: "Slicer unavailable", fallback: true }, 503);
  }
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
