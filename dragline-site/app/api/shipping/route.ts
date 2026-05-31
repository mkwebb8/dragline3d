export const runtime = "edge";

export async function POST(request: Request) {
  const body = await request.json();
  const { toName, toStreet, toCity, toState, toZip, weightGrams } = body;
  const shippoKey = process.env.SHIPPO_API_KEY;

  // Flat rate fallback if Shippo not configured yet
  if (!shippoKey || shippoKey === "pending") {
    const oz = weightGrams / 28.35;
    const flat = oz <= 16 ? 8.50 : oz <= 48 ? 12.50 : oz <= 96 ? 16.50 : 22.00;
    return Response.json({ rates: [
      { id: "flat_priority", provider: "USPS", service: "Priority Mail (est.)", amount: flat, days: 3 },
    ]});
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
    const rates = (data.rates || [])
      .filter((r: any) => r.provider === "USPS")
      .map((r: any) => ({
        id: r.object_id, provider: r.provider,
        service: r.servicelevel?.name || r.service,
        amount: parseFloat(r.amount), currency: r.currency, days: r.estimated_days,
      }))
      .sort((a: any, b: any) => a.amount - b.amount);
    return Response.json({ rates });
  } catch {
    return Response.json({ error: "Shipping calculation failed" }, { status: 500 });
  }
}
