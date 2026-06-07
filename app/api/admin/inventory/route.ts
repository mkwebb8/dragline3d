// app/api/admin/inventory/route.ts
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function auth(req: NextRequest) {
  return req.headers.get("Authorization")?.replace("Bearer ", "") === process.env.ADMIN_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase()
    .from("filament_inventory")
    .select("*")
    .order("material")
    .order("brand");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const insert: Record<string, any> = {
    brand:                 body.brand                 || "Unknown",
    material:              body.material              || "PLA",
    color:                 body.color                 || "Unknown",
    color_hex:             body.color_hex             || "#ffffff",
    weight_full_g:         Number(body.weight_full_g) || 1000,
    weight_remaining_g:    Number(body.weight_remaining_g) || 1000,
    cost_per_kg:           Number(body.cost_per_kg)   || 16,
    // Optional numeric — only include when provided (not null/undefined)
    ...(body.empty_spool_weight_g  != null && { empty_spool_weight_g:  Number(body.empty_spool_weight_g) }),
    ...(body.total_measured_weight_g != null && { total_measured_weight_g: Number(body.total_measured_weight_g) }),
    ...(body.purchase_price         != null && { purchase_price:        Number(body.purchase_price) }),
    // Optional text
    barcode:      body.barcode      || null,
    notes:        body.notes        || null,
    // New fields
    sheen:        body.sheen        || "Standard",
    glow_in_dark: body.glow_in_dark === true,
  };

  const { data, error } = await supabase()
    .from("filament_inventory")
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
