import { verifyAdminToken } from "@/lib/adminAuth";

function sb(path: string, opts: RequestInit = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts.headers || {}),
    },
  });
}

export async function GET(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  let path = "print_failures?order=created_at.desc&limit=200";
  if (from) path += `&created_at=gte.${from}`;
  if (to) path += `&created_at=lte.${to}T23:59:59Z`;
  const res = await sb(path);
  if (!res.ok) return Response.json({ error: "Failed" }, { status: 500 });
  return Response.json(await res.json());
}

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const allowed = ["order_item_id", "material", "grams_lost", "hours_lost", "reason", "notes"];
  const row: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined && body[k] !== "") row[k] = body[k];
  if (!row.material) return Response.json({ error: "material required" }, { status: 400 });
  const res = await sb("print_failures", { method: "POST", body: JSON.stringify(row) });
  if (!res.ok) return Response.json({ error: "Failed to save" }, { status: 500 });
  const [item] = await res.json();
  return Response.json(item, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const res = await sb(`print_failures?id=eq.${id}`, { method: "DELETE" });
  if (!res.ok) return Response.json({ error: "Failed" }, { status: 500 });
  return Response.json({ ok: true });
}
