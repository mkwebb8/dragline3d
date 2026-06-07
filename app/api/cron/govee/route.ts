export const runtime = "edge";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOVEE_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!apiKey) return Response.json({ error: "Govee not configured" }, { status: 503 });
  if (!supabaseUrl || !supabaseKey) return Response.json({ error: "Supabase not configured" }, { status: 503 });

  try {
    // Get devices
    const devRes = await fetch("https://developer-api.govee.com/v1/devices", {
      headers: { "Govee-API-Key": apiKey },
    });
    if (!devRes.ok) return Response.json({ error: "Govee API error" }, { status: 502 });
    const devData = await devRes.json();
    const devices = devData.data?.devices || [];
    const plug = devices.find((d: any) => d.model === "H5086") || devices[0];
    if (!plug) return Response.json({ error: "No device found" }, { status: 404 });

    // Get device state
    const stateRes = await fetch(
      `https://developer-api.govee.com/v1/devices/state?device=${encodeURIComponent(plug.device)}&model=${plug.model}`,
      { headers: { "Govee-API-Key": apiKey } }
    );
    if (!stateRes.ok) return Response.json({ error: "State fetch failed" }, { status: 502 });
    const stateData = await stateRes.json();
    const props = stateData.data?.properties || [];
    const onProp = props.find((p: any) => p.powerState !== undefined);
    const wattsProp = props.find((p: any) => p.watt !== undefined);

    const watts = wattsProp?.watt || 0;
    const isOn = onProp?.powerState === "on";

    // Log to Supabase
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/govee_power_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        watts,
        is_on: isOn,
        device: plug.device,
      }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      return Response.json({ error: "Supabase insert failed", detail: err }, { status: 502 });
    }

    return Response.json({ ok: true, watts, is_on: isOn, device: plug.device });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
