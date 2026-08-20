export const runtime = "edge";
import { signState } from "@/lib/signedState";
import { supabaseRest } from "@/lib/supabaseRest";
import { rateLimit } from "@/lib/rateLimit";

const MAX_FILE_BYTES = 100 * 1024 * 1024;
async function fileHash(file: File) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "convert-step", 5, 10 * 60_000);
  if (limited) return limited;
  const workerUrl = process.env.SLICER_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret || !process.env.CHECKOUT_SIGNING_SECRET) return Response.json({ error: "Slicer worker not configured" }, { status: 503 });

  try {
    const form = await request.clone().formData();
    const file = form.get("step");
    const material = String(form.get("material") || "");
    const quality = String(form.get("quality") || "");
    const infill = Number(form.get("infill"));
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX_FILE_BYTES || !/\.(step|stp)$/i.test(file.name)) {
      return Response.json({ error: "Invalid STEP file" }, { status: 400 });
    }
    if (!material || !quality || !Number.isInteger(infill) || infill < 5 || infill > 100) {
      return Response.json({ error: "Invalid conversion options" }, { status: 400 });
    }
    form.delete("costPerKg");
    const pricingResponse = await supabaseRest(`material_pricing?material=eq.${encodeURIComponent(material)}&select=cost_per_kg`);
    if (pricingResponse.ok) {
      const pricingRows = await pricingResponse.json();
      const cost = Number(pricingRows[0]?.cost_per_kg);
      if (Number.isFinite(cost) && cost > 0 && cost <= 10_000) form.set("costPerKg", String(cost));
    }

    const resp = await fetch(`${workerUrl}/convert-step`, {
      method: "POST",
      headers: {
        "x-worker-secret": workerSecret,
      },
      body: form,
    });
    const data = await resp.json();
    if (resp.ok && Number.isFinite(data.price)) {
      data.quoteToken = await signState("quote", {
        fileName: file.name, fileHash: await fileHash(file), material, quality, infill,
        grams: data.grams, hours: data.hours, price: data.price, setupFee: data.setupFee ?? 12,
      });
    }
    return Response.json(data, { status: resp.status });
  } catch {
    return Response.json({ error: "Conversion unavailable", fallback: true }, { status: 503 });
  }
}
