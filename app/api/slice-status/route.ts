export const runtime = "edge";
import { signState, verifyState } from "@/lib/signedState";

export async function GET(request: Request) {
  const workerUrl = process.env.SLICER_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret || !process.env.CHECKOUT_SIGNING_SECRET) return Response.json({ error: "Slicer worker not configured" }, { status: 503 });

  const url = new URL(request.url);
  const job = await verifyState(url.searchParams.get("jobToken"), "slice-job");
  if (!job || typeof job.jobId !== "string") return Response.json({ error: "Invalid or expired slice job" }, { status: 401 });

  try {
    const resp = await fetch(`${workerUrl}/slice-status?jobId=${encodeURIComponent(job.jobId)}`, {
      headers: { "x-worker-secret": workerSecret },
    });
    const data = await resp.json();
    if (resp.ok && data.status === "done") {
      data.quoteToken = await signState("quote", {
        fileName: job.fileName,
        fileHash: job.fileHash,
        material: job.material,
        quality: job.quality,
        infill: job.infill,
        grams: data.grams,
        hours: data.hours,
        price: data.price,
        setupFee: data.setupFee ?? 12,
      });
    }
    return Response.json(data, { status: resp.status });
  } catch {
    return Response.json({ error: "Slicer unavailable", fallback: true }, { status: 503 });
  }
}
