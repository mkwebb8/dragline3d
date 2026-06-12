export const runtime = "edge";
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

// Extract order ID from gcode filename (e.g. "DL-20260610-ABZY_part.gcode" → "DL-20260610-ABZY")
function extractOrderId(filename: string): string | null {
  const m = filename.match(/DL-\d{8}-[A-Z0-9]{4}/i);
  return m ? m[0].toUpperCase() : null;
}

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { filename?: string; state?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }

  const { filename = "", state } = body;
  if (!filename || state !== "printing") return Response.json({ matched: false, reason: "not printing" });

  const orderId = extractOrderId(filename);
  if (!orderId) return Response.json({ matched: false, reason: "no order ID in filename", filename });

  try {
    // Fetch the order
    const r = await supabase(`orders?id=eq.${orderId}&select=id,status&limit=1`);
    if (!r.ok) throw new Error(await r.text());
    const rows = await r.json();
    if (!rows.length) return Response.json({ matched: false, reason: "order not found", orderId });

    const order = rows[0];
    const actions: string[] = [];

    // Flip status to printing if it's still queued
    if (order.status === "queued") {
      const upd = await supabase(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "printing" }),
      });
      if (!upd.ok) throw new Error(await upd.text());
      actions.push("status→printing");
    }

    // Auto-start a print session if none is active
    const sessR = await supabase(
      `print_sessions?order_id=eq.${orderId}&status=eq.active&limit=1`,
    );
    if (sessR.ok) {
      const sessions = await sessR.json();
      if (!sessions.length) {
        // No active session — create one and tell the slicer worker to start tracking
        const newSess = await supabase("print_sessions", {
          method: "POST",
          body: JSON.stringify({ order_id: orderId, status: "active" }),
        });
        if (newSess.ok) {
          const [session] = await newSess.json();
          actions.push("session_created");
          // Fire-and-forget to slicer worker to start Shelly tracking
          const workerUrl = process.env.SLICER_WORKER_URL;
          if (workerUrl) {
            fetch(`${workerUrl}/shelly/session/start`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-worker-secret": process.env.WORKER_SECRET || "",
              },
              body: JSON.stringify({ sessionId: session.id, orderId }),
            }).catch(() => {});
          }
          actions.push("shelly_session_started");
        }
      }
    }

    return Response.json({ matched: true, orderId, previousStatus: order.status, actions });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
