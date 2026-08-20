export const runtime = "edge";
import { signState } from "@/lib/signedState";
import { rateLimit } from "@/lib/rateLimit";

const MAX_WEIGHT_GRAMS = 100_000;

export async function POST(request: Request) {
  const limited = rateLimit(request, "shipping", 30, 10 * 60_000);
  if (limited) return limited;
  if (!process.env.CHECKOUT_SIGNING_SECRET) return Response.json({ error: "Shipping is not configured" }, { status: 503 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16 * 1024) return Response.json({ error: "Request too large" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  const { weightGrams } = body;
  if (!Number.isFinite(weightGrams) || weightGrams <= 0 || weightGrams > MAX_WEIGHT_GRAMS) {
    return Response.json({ error: "Invalid shipment weight" }, { status: 400 });
  }
  const shippoKey = process.env.SHIPPO_API_KEY;
  if (!shippoKey || shippoKey === "pending") {
    const oz = weightGrams / 28.35;
    const flat = oz <= 16 ? 8.50 : oz <= 48 ? 12.50 : oz <= 96 ? 16.50 : 22.00;
    const rate = { id: "flat_ground", provider: "USPS", service: "Priority Mail (est.)", amount: flat, days: 3 };
    return Response.json({ rates: [{ ...rate, rateToken: await signState("shipping-rate", { ...rate, weightGrams }, 20 * 60) }] });
  }
  const { toName, toStreet, toCity, toState, toZip } = body;
  if (![toName, toStreet, toCity, toState, toZip].every(value => typeof value === "string" && value.trim().length > 0 && value.length <= 160)) {
    return Response.json({ error: "Complete shipping address required" }, { status: 400 });
  }
  const weightOz = Math.max(1, Math.round((weightGrams / 28.35) * 10) / 10);
  const shipment = {
    address_from: {
      name: process.env.SHIP_FROM_NAME || "Dragline 3D",
      street1: process.env.SHIP_FROM_STREET || "",
      city: process.env.SHIP_FROM_CITY || "Louisville",
      state: process.env.SHIP_FROM_STATE || "KY",
      zip: process.env.SHIP_FROM_ZIP || "40201",
      country: "US",
    },
    address_to: { name: toName, street1: toStreet, city: toCity, state: toState, zip: toZip, country: "US" },
    parcels: [{ length: "12", width: "10", height: "8", distance_unit: "in", weight: weightOz.toString(), mass_unit: "oz" }],
    async: false,
  };
  try {
    const resp = await fetch("https://api.goshippo.com/shipments/", {
      method: "POST",
      headers: { Authorization: `ShippoToken ${shippoKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(shipment),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error("Shippo error");
    const rawRates = (data.rates || [])
      .map((r: any) => ({ id: r.object_id, provider: r.provider, service: r.servicelevel?.name || r.service, amount: parseFloat(r.amount), currency: r.currency, days: r.estimated_days }))
      .filter((rate: any) => typeof rate.id === "string" && Number.isFinite(rate.amount) && rate.amount >= 0)
      .sort((a: any, b: any) => a.amount - b.amount);
    const rates = await Promise.all(rawRates.map(async (rate: any) => ({
      ...rate,
      rateToken: await signState("shipping-rate", { ...rate, weightGrams }, 20 * 60),
    })));
    return Response.json({ rates });
  } catch {
    return Response.json({ error: "Shipping calculation failed" }, { status: 500 });
  }
}
