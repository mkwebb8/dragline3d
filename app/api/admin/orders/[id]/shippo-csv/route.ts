export const runtime = "edge";
import { verifyAdminToken } from "@/lib/adminAuth";
import { getOrder } from "@/lib/db";

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SECRET_KEY!;

function csvEscape(val: any): string {
    const s = val === null || val === undefined ? "" : String(val);
    if (s.indexOf(",") !== -1 || s.indexOf("\"") !== -1 || s.indexOf("\n") !== -1) {
          return "\"" + s.split("\"").join("\"\"") + "\"";
    }
    return s;
}

function formatDate(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    return (d.getMonth() + 1) + "/" + d.getDate() + "/" + String(d.getFullYear()).slice(2);
}

const HEADERS = [
    "Order Number", "Order Date", "Recipient Name", "Company", "Email", "Phone",
    "Street Line 1", "Street Number", "Street Line 2", "City", "State/Province", "Zip/Postal Code", "Country",
    "Item Title", "SKU", "Quantity", "Item Weight", "Item Weight Unit", "Item Price", "Item Currency",
    "Order Weight", "Order Weight Unit", "Package Width", "Package Height", "Package Length", "Package Dimension Unit",
    "Order Amount", "Order Currency",
  ];

export async function GET(req: Request, { params }: { params: { id: string } }) {
    if (!await verifyAdminToken(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const order = await getOrder(params.id);
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  let box: any = null;
    const orderAny = order as any;
    if (orderAny.box_id) {
          const r = await fetch(SB_URL + "/rest/v1/boxes?id=eq." + orderAny.box_id + "&select=*", {
                  headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
          });
          if (r.ok) {
                  const rows = await r.json();
                  box = rows[0] || null;
          }
    }

  const items = order.order_items?.length ? order.order_items : [{ file_name: "Item", qty: 1, price: order.total, grams: 0 }];

  const GRAMS_PER_LB = 453.592;
    let orderWeightLb = 0;
    for (const it of items as any[]) {
          const qty = it.qty || 1;
          orderWeightLb += ((it.grams || 0) * qty) / GRAMS_PER_LB;
    }

  const rows: string[][] = [];
    for (const it of items as any[]) {
          const qty = it.qty || 1;
          const itemWeightLb = (it.grams || 0) / GRAMS_PER_LB;
          rows.push([
                  order.id,
                  formatDate(order.created_at),
                  order.customer_name || "",
                  "",
                  order.customer_email || "",
                  "",
                  order.address || "",
                  "",
                  "",
                  order.city || "",
                  order.state || "",
                  order.zip || "",
                  "US",
                  it.file_name || "Item",
                  it.id || "",
                  String(qty),
                  itemWeightLb ? itemWeightLb.toFixed(3) : "",
                  "lb",
                  it.price != null ? Number(it.price).toFixed(2) : "",
                  "USD",
                  orderWeightLb ? orderWeightLb.toFixed(3) : "",
                  "lb",
                  box?.width_in != null ? String(box.width_in) : "",
                  box?.height_in != null ? String(box.height_in) : "",
                  box?.length_in != null ? String(box.length_in) : "",
                  "in",
                  order.total != null ? Number(order.total).toFixed(2) : "",
                  "USD",
                ].map(csvEscape));
    }

  const csv = [HEADERS.join(","), ...rows.map(r => r.join(","))].join("\r\n");

  return new Response(csv, {
        headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": "attachment; filename=\"shippo-" + order.id + ".csv\"",
        },
  });
}
