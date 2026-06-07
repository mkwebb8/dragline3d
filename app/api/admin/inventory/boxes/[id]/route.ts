export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function auth(req: NextRequest) {
  return req.headers.get("Authorization")?.replace("Bearer ", "") === process.env.ADMIN_TOKEN;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabase().from("boxes").update(body).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await supabase().from("boxes").delete().eq("id", params.id);
  return NextResponse.json({ ok: true });
}
