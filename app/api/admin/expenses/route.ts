export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminToken } from "@/lib/adminAuth";

function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

export async function GET(req: NextRequest) {
  if (!await verifyAdminToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase().from("expenses").select("*").order("date", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!await verifyAdminToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabase().from("expenses").insert({
    date: body.date,
    amount: body.amount,
    category: body.category,
    vendor: body.vendor || null,
    description: body.description || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
