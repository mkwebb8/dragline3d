// app/api/admin/inventory/boxes/[id]/route.ts
export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  const allowed = ["name", "length_in", "width_in", "height_in", "quantity", "cost_each", "notes"];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) {
      // Coerce numeric fields
      if (["length_in", "width_in", "height_in", "cost_each"].includes(k)) {
        updates[k] = body[k] !== "" && body[k] != null ? Number(body[k]) : null;
      } else if (k === "quantity") {
        updates[k] = Number(body[k]) || 0;
      } else {
        updates[k] = body[k];
      }
    }
  }

  const { data, error } = await db()
    .from("boxes")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Clear box_id from any orders referencing this box before deleting
  await db().from("orders").update({ box_id: null }).eq("box_id", params.id);

  const { error } = await db().from("boxes").delete().eq("id", params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
