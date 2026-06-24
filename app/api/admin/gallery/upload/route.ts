// Upload image or video to Supabase Storage gallery bucket
import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function POST(req: Request) {
  if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const r = await fetch(`${SB_URL}/storage/v1/object/gallery/${filename}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: await file.arrayBuffer(),
  });

  if (!r.ok) return Response.json({ error: await r.text() }, { status: 500 });

  const publicUrl = `${SB_URL}/storage/v1/object/public/gallery/${filename}`;
  const isVideo = file.type.startsWith("video/");
  return Response.json({ url: publicUrl, isVideo });
}
