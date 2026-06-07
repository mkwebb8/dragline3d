// app/api/admin/inventory/route.ts
export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await db()
    .from("filament_inventory")
    .select("*")
    .order("material")
    .order("brand");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  const insert: Record<string, any> = {
    brand:              body.brand              || "Unknown",
    material:           body.material           || "PLA",
    color:              body.color              || "Unknown",
    color_hex:          body.color_hex          || "#ffffff",
    weight_full_g:      Number(body.weight_full_g)      || 1000,
    weight_remaining_g: Number(body.weight_remaining_g) || 1000,
    cost_per_kg:        Number(body.cost_per_kg)        || 16,
    barcode:            body.barcode  || null,
    notes:              body.notes    || null,
    sheen:              body.sheen    || "Standard",
    glow_in_dark:       body.glow_in_dark === true,
    // Only include numeric optionals when actually provided
    ...(body.empty_spool_weight_g   != null && { empty_spool_weight_g:   Number(body.empty_spool_weight_g) }),
    ...(body.total_measured_weight_g != null && { total_measured_weight_g: Number(body.total_measured_weight_g) }),
    ...(body.purchase_price          != null && { purchase_price:          Number(body.purchase_price) }),
  };

  const { data, error } = await db()
    .from("filament_inventory")
    .insert(insert)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
