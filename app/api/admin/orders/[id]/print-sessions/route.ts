import { verifyAdminToken } from "@/lib/adminAuth";

function supabase(path: string, opts: RequestInit = {}) {
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

// GET — return the most recent print session for this order
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await verifyAdminToken(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const r = await supabase(
      `print_sessions?order_id=eq.${params.id}&order=created_at.desc&limit=1`,
    );
    if (!r.ok) throw new Error(await r.text());
    const rows = await r.json();
    if (!rows.length) return Response.json(null);
    return Response.json(rows[0]);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST — create a new print session
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await verifyAdminToken(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const r = await supabase("print_sessions", {
      method: "POST",
      body: JSON.stringify({ order_id: params.id, status: "active" }),
    });
    if (!r.ok) throw new Error(await r.text());
    const [session] = await r.json();
    return Response.json(session, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
