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

// Normalize a filename for fuzzy comparison:
// strip extension, lowercase, collapse non-alphanumeric runs to a single space
function normalize(s: string) {
  return s
    .replace(/\.[^.]+$/, "")        // strip extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")    // non-alphanumeric → space
    .trim();
}

export async function POST(request: Request) {
  if (!await verifyAdminToken(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { filename?: string; state?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }

  const { filename = "", state } = body;
  if (!filename || state !== "printing") return Response.json({ matched: false, reason: "not printing" });

  const normalizedGcode = normalize(filename);

  try {
    // Fetch all order_items for active orders (queued or printing) with their order status
    const r = await supabase(
      "order_items?select=id,order_id,file_name,orders!inner(id,status)&orders.status=in.(queued,printing,received)",
    );
    if (!r.ok) throw new Error(await r.text());
    const items: any[] = await r.json();

    // Find the item whose normalized file_name best matches the gcode filename
    const matched = items.find((item) => {
      const normalizedItem = normalize(item.file_name || "");
      // Exact match after normalization, or one contains the other
      return (
        normalizedItem === normalizedGcode ||
        normalizedItem.includes(normalizedGcode) ||
        normalizedGcode.includes(normalizedItem)
      );
    });

    if (!matched) {
      return Response.json({ matched: false, reason: "no matching file_name", filename, normalized: normalizedGcode });
    }

    const orderId = matched.order_id;
    const orderStatus = matched.orders?.status ?? matched.orders?.[0]?.status;
    const actions: string[] = [];

    // Flip order status to printing if still queued/received
    if (orderStatus === "queued" || orderStatus === "received") {
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
        const newSess = await supabase("print_sessions", {
          method: "POST",
          body: JSON.stringify({ order_id: orderId, status: "active" }),
        });
        if (newSess.ok) {
          const [session] = await newSess.json();
          actions.push("session_created");
          const workerUrl = process.env.SLICER_WORKER_URL;
          if (workerUrl && session?.id) {
            fetch(`${workerUrl}/shelly/session/start`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-worker-secret": process.env.WORKER_SECRET || "",
              },
              body: JSON.stringify({ sessionId: session.id, orderId }),
            }).catch(() => {});
            actions.push("shelly_session_started");
          }
        }
      } else {
        actions.push("session_already_active");
      }
    }

    return Response.json({ matched: true, orderId, matchedFile: matched.file_name, previousStatus: orderStatus, actions });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
