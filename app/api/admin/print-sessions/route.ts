import { verifyAdminToken } from "@/lib/adminAuth";

function supabase(path: string, opts: RequestInit = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      "Content-Type": "application/json", Prefer: "return=representation",
      ...(opts.headers || {}),
    },
  });
}

export async function GET(req: Request) {
  if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let q = "print_sessions?status=eq.completed&select=id,order_id,started_at,ended_at,wh_accumulated,electricity_cost&order=started_at.desc";
    if (from) q += `&started_at=gte.${from}T00:00:00`;
    if (to)   q += `&started_at=lte.${to}T23:59:59`;
    const r = await supabase(q);
    if (!r.ok) return Response.json({ error: await r.text() }, { status: 500 });
    return Response.json(await r.json());
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
