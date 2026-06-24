// app/api/admin/inventory/boxes/route.ts
import { verifyAdminToken } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await db()
    .from("boxes")
    .select("*")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  if (!body.name) return Response.json({ error: "name is required" }, { status: 400 });

  const insert: Record<string, any> = {
    name: body.name,
    length_in: body.length_in !== "" && body.length_in != null ? Number(body.length_in) : null,
    width_in:  body.width_in  !== "" && body.width_in  != null ? Number(body.width_in)  : null,
    height_in: body.height_in !== "" && body.height_in != null ? Number(body.height_in) : null,
    quantity:  body.quantity  !== "" && body.quantity  != null ? Number(body.quantity)   : 0,
    cost_each: body.cost_each !== "" && body.cost_each != null ? Number(body.cost_each)  : null,
    notes:     body.notes || null,
  };

  const { data, error } = await db()
    .from("boxes")
    .insert(insert)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
