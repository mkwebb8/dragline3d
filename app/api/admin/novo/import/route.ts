// app/api/admin/novo/import/route.ts
// POST multipart/form-data with a "file" field containing Novo CSV export
// Parses and upserts transactions into novo_transactions table
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
  const balIdx   = headers.findIndex(h => h.includes("balance"));

  if (dateIdx === -1 || amtIdx === -1) {
    return Response.json({ error: "Could not find required date/amount columns", headers }, { status: 400 });
  }

  // Track seen IDs within this upload to handle same-day/same-amount/same-desc collisions
  const seenIds = new Map<string, number>();

  const records = rows.slice(1).map((row) => {
    const rawDate = row[dateIdx] || "";
    const rawAmt  = row[amtIdx] || "0";
    const amount  = parseFloat(rawAmt.replace(/[^0-9.\-]/g, ""));
    const desc    = descIdx !== -1 ? (row[descIdx] || "") : "";
    const rawBal  = balIdx !== -1 ? row[balIdx] || "" : "";
    const balance = rawBal ? parseFloat(rawBal.replace(/[^0-9.\-]/g, "")) : null;

    let txnId: string;
    if (idIdx !== -1 && row[idIdx]) {
      txnId = row[idIdx];
    } else {
      // Stable ID: date + parsed amount + first 28 chars of cleaned description
      const cleanDesc = desc.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 28);
      const baseId = `novo-${rawDate.replace(/\//g, "-")}-${isNaN(amount) ? "0" : amount.toFixed(2)}-${cleanDesc}`;
      // Handle duplicate base IDs in the same file (e.g. two identical transactions same day)
      const count = (seenIds.get(baseId) || 0) + 1;
      seenIds.set(baseId, count);
      txnId = count === 1 ? baseId : `${baseId}-${count}`;
    }

    return {
      id:          txnId,
      date:        rawDate,
      amount:      isNaN(amount) ? 0 : amount,
      description: desc || null,
      category:    catIdx !== -1 ? row[catIdx] : null,
      ...(balance !== null && !isNaN(balance) ? { balance } : {}),
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
