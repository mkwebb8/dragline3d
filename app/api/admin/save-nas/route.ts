// app/api/admin/save-nas/route.ts
export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";

const NAS_BASE = "/mnt/media3/dragline3d";

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nasUrl = process.env.TRUENAS_URL;
  const nasKey = process.env.TRUENAS_API_KEY;

  if (!nasUrl || !nasKey) {
    return Response.json({ error: "TRUENAS_URL or TRUENAS_API_KEY not set in .env.local" }, { status: 503 });
  }

  let body: { orderId: string; month: string; pdfBase64: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, month, pdfBase64 } = body;
  if (!orderId || !month || !pdfBase64) {
    return Response.json({ error: "Missing orderId, month, or pdfBase64" }, { status: 400 });
  }

  // Decode base64 → binary
  const binaryStr = atob(pdfBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const pdfBlob = new Blob([bytes], { type: "application/pdf" });

  const paths = [
    `${NAS_BASE}/orders/${orderId}/invoice.pdf`,
    `${NAS_BASE}/records/${month}/${orderId}-invoice.pdf`,
  ];

  for (const path of paths) {
    const fd = new FormData();
    fd.append("data", JSON.stringify({ path }));
    fd.append("file", pdfBlob, "invoice.pdf");

    let res: Response;
    try {
      res = await fetch(`${nasUrl}/api/v2.0/filesystem/put`, {
        method: "POST",
        headers: { Authorization: `Bearer ${nasKey}` },
        body: fd,
      });
    } catch (err: any) {
      return Response.json(
        { error: `Cannot reach TrueNAS at ${nasUrl} — is npm run dev running on your LAN? (${err.message})` },
        { status: 502 }
      );
    }

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return Response.json(
        { error: `TrueNAS error for ${path}: ${detail.message || res.status}` },
        { status: 502 }
      );
    }
  }

  return Response.json({ ok: true, paths });
}
