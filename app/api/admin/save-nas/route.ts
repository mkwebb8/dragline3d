// app/api/admin/save-nas/route.ts
export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";

const ORDERS_BASE = "/mnt/media3/dragline3d/orders";
const RECORDS_BASE = "/mnt/media3/dragline3d/records";

function sanitizeFolderName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, "_");
}

async function nasRequest(nasUrl: string, nasKey: string, endpoint: string, body: unknown) {
  const res = await fetch(`${nasUrl}/api/v2.0/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${nasKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res;
}

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nasUrl = process.env.TRUENAS_URL;
  const nasKey = process.env.TRUENAS_API_KEY;

  if (!nasUrl || !nasKey) {
    return Response.json({ error: "TRUENAS_URL or TRUENAS_API_KEY not set in .env.local" }, { status: 503 });
  }

  let body: { orderId: string; month: string; pdfBase64: string; customerName: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, month, pdfBase64, customerName } = body;
  if (!orderId || !month || !pdfBase64) {
    return Response.json({ error: "Missing orderId, month, or pdfBase64" }, { status: 400 });
  }

  const customerFolder = sanitizeFolderName(customerName || "Unknown");

  // Decode base64 → binary
  const binaryStr = atob(pdfBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const pdfBlob = new Blob([bytes], { type: "application/pdf" });

  // Path 1: /mnt/media3/orders/<Customer Name>/<order-id>/invoice.pdf
  // Path 2: /mnt/media3/dragline3d/records/<month>/<order-id>-invoice.pdf
  const filePaths = [
    `${ORDERS_BASE}/${customerFolder}/${orderId}/invoice.pdf`,
    `${RECORDS_BASE}/${month}/${orderId}-invoice.pdf`,
  ];

  // Ensure parent directories exist before writing
  const dirPaths = [
    `${ORDERS_BASE}/${customerFolder}/${orderId}`,
    `${RECORDS_BASE}/${month}`,
  ];

  for (const dirPath of dirPaths) {
    try {
      await nasRequest(nasUrl, nasKey, "filesystem/mkdir", { path: dirPath, options: {} });
      // mkdir returns error if dir exists — that's fine, ignore it
    } catch {
      // ignore — dir may already exist
    }
  }

  for (const path of filePaths) {
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

  return Response.json({ ok: true, paths: filePaths });
}
