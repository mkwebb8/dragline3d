export const runtime = "edge";

export async function POST(request: Request) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return Response.json({ error: "Resend not configured" }, { status: 503 });

  const notifyEmail = process.env.NOTIFY_EMAIL || "info@dragline3d.com";

  let formData: FormData;
  try { formData = await request.formData(); } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const zip = formData.get("zip") as string;
  const shippingLabel = formData.get("shippingLabel") as string;
  const shippingCost = formData.get("shippingCost") as string;
  const total = formData.get("total") as string;
  const itemsJson = formData.get("items") as string;
  const items = JSON.parse(itemsJson || "[]");

  // Build email body
  const itemRows = items.map((item: any, i: number) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:8px">${item.fileName}</td>
      <td style="padding:8px">${item.material}</td>
      <td style="padding:8px">${item.quality} / ${item.infill}%</td>
      <td style="padding:8px">${item.grams}g</td>
      <td style="padding:8px">${item.hours}h</td>
      <td style="padding:8px"><strong>$${item.price.toFixed(2)}</strong></td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
      <div style="background:#0f0f10;padding:24px;border-radius:4px 4px 0 0">
        <h1 style="color:#ffb547;margin:0;font-size:28px">New Order — Dragline 3D</h1>
      </div>
      <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 4px 4px">
        <h2 style="color:#333;border-bottom:2px solid #ffb547;padding-bottom:8px">Customer</h2>
        <p><strong>Name:</strong> ${customerName}<br>
        <strong>Email:</strong> ${customerEmail}<br>
        <strong>Ship to:</strong> ${address}, ${city}, ${state} ${zip}</p>

        <h2 style="color:#333;border-bottom:2px solid #ffb547;padding-bottom:8px;margin-top:24px">Parts</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px;text-align:left">File</th>
              <th style="padding:8px;text-align:left">Material</th>
              <th style="padding:8px;text-align:left">Quality/Infill</th>
              <th style="padding:8px;text-align:left">Weight</th>
              <th style="padding:8px;text-align:left">Time</th>
              <th style="padding:8px;text-align:left">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <h2 style="color:#333;border-bottom:2px solid #ffb547;padding-bottom:8px;margin-top:24px">Order Total</h2>
        <table style="font-size:15px">
          <tr><td style="padding:4px 16px 4px 0">Parts subtotal:</td><td><strong>$${(parseFloat(total) - parseFloat(shippingCost)).toFixed(2)}</strong></td></tr>
          <tr><td style="padding:4px 16px 4px 0">Shipping (${shippingLabel}):</td><td><strong>$${parseFloat(shippingCost).toFixed(2)}</strong></td></tr>
          <tr style="font-size:18px;color:#0f0f10"><td style="padding:8px 16px 4px 0"><strong>Total charged:</strong></td><td><strong>$${parseFloat(total).toFixed(2)}</strong></td></tr>
        </table>

        <p style="margin-top:24px;color:#666;font-size:13px">STL files are attached to this email. Reply to ${customerEmail} with any questions.</p>
      </div>
    </div>
  `;

  // Build attachments from uploaded STL files
  const attachments: any[] = [];
  for (const item of items) {
    const fileKey = `file_${item.id}`;
    const file = formData.get(fileKey) as File | null;
    if (file) {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      attachments.push({
        filename: item.fileName,
        content: base64,
      });
    }
  }

  const emailPayload: any = {
    from: "orders@dragline3d.com",
    to: [notifyEmail],
    reply_to: customerEmail,
    subject: `New Order — ${customerName} — $${parseFloat(total).toFixed(2)}`,
    html,
  };
  if (attachments.length > 0) emailPayload.attachments = attachments;

  const resendResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!resendResp.ok) {
    const err = await resendResp.json();
    console.error("Resend error:", err);
    return Response.json({ error: "Email failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
