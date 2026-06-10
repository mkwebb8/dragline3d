// app/api/admin/novo/import/route.ts
// POST multipart/form-data with a "file" field containing Novo CSV export
// Parses and upserts transactions into novo_transactions table
export const runtime = "edge";

import { verifyAdminToken } from "@/lib/adminAuth";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

const sbh = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=representation",
};

function parseCSV(text: string): string[][] {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    });
}

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let text: string;
  const ct = request.headers.get("content-type") || "";

  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
    text = await file.text();
  } else {
    // raw CSV body
    text = await request.text();
  }

  const rows = parseCSV(text);
  if (rows.length < 2) return Response.json({ error: "CSV appears empty" }, { status: 400 });

  // Normalize header names
  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, "_"));
  const dateIdx  = headers.findIndex(h => h.includes("date") || h.includes("created"));
  const amtIdx   = headers.findIndex(h => h.includes("amount"));
  const descIdx  = headers.findIndex(h => h.includes("description") || h.includes("desc") || h.includes("memo"));
  const catIdx   = headers.findIndex(h => h.includes("category") || h.includes("type"));
  const idIdx    = headers.findIndex(h => h === "id" || h.includes("transaction_id"));

  if (dateIdx === -1 || amtIdx === -1) {
    return Response.json({ error: "Could not find required date/amount columns", headers }, { status: 400 });
  }

  const records = rows.slice(1).map((row, i) => {
    const rawDate = row[dateIdx] || "";
    const rawAmt  = row[amtIdx] || "0";
    const amount  = parseFloat(rawAmt.replace(/[^0-9.\-]/g, ""));
    // Build a stable ID from date+amount+description if no explicit ID column
    const txnId = idIdx !== -1
      ? row[idIdx]
      : `novo-${rawDate}-${rawAmt}-${i}`.replace(/\s+/g, "").slice(0, 64);

    return {
      id:          txnId,
      date:        rawDate,
      amount:      isNaN(amount) ? 0 : amount,
      description: descIdx !== -1 ? row[descIdx] : null,
      category:    catIdx  !== -1 ? row[catIdx]  : null,
    };
  }).filter(r => r.date);

  if (records.length === 0) return Response.json({ error: "No valid rows parsed" }, { status: 400 });

  const r = await fetch(`${SB_URL}/rest/v1/novo_transactions`, {
    method: "POST",
    headers: sbh,
    body: JSON.stringify(records),
  });

  if (!r.ok) return Response.json({ error: await r.text() }, { status: 500 });

  return Response.json({ imported: records.length });
}
