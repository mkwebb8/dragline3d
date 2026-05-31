/**
 * functions/api/slice.js
 * Cloudflare Pages Function — receives STL from browser, forwards to home slicer worker.
 *
 * Required env vars (set in Cloudflare dashboard → Variables and Secrets):
 *   SLICER_WORKER_URL   e.g. https://slicer.dragline3d.com  (your Tunnel endpoint)
 *   WORKER_SECRET       same value as in your Docker container's WORKER_SECRET env
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const workerUrl = env.SLICER_WORKER_URL;
  if (!workerUrl) {
    return json({ error: "Slicer worker not configured" }, 503);
  }

  // Hard limit: 100MB STL
  const contentLength = parseInt(request.headers.get("content-length") || "0");
  if (contentLength > 100 * 1024 * 1024) {
    return json({ error: "File too large (100MB max)" }, 413);
  }

  // Forward the entire multipart body directly to the worker
  const headers = new Headers(request.headers);
  headers.set("x-worker-secret", env.WORKER_SECRET || "");

  try {
    const resp = await fetch(`${workerUrl}/slice`, {
      method: "POST",
      headers,
      body: request.body,
      // @ts-ignore — Cloudflare Workers supports duplex
      duplex: "half",
    });

    const data = await resp.json();
    return json(data, resp.status);
  } catch (err) {
    console.error("Slicer worker unreachable:", err);
    return json({
      error: "Slicer unavailable — using estimated quote",
      fallback: true,
    }, 503);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
