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
  const { data } = await supabase().from("boxes").select("*").order("name");
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabase().from("boxes").insert({
    name: body.name,
    length_in: body.length_in,
    width_in: body.width_in,
    height_in: body.height_in,
    quantity: body.quantity || 0,
    cost_each: body.cost_each || null,
    notes: body.notes || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
