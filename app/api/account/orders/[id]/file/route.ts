export const runtime = 'edge';

import { authenticateCustomer, escapePostgrestLike } from '@/lib/customerAuth';
import { supabaseRest } from '@/lib/supabaseRest';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateCustomer(req);
  if ("response" in auth) return auth.response;
  const fileName = new URL(req.url).searchParams.get('fileName')?.trim();
  if (!fileName || fileName.length > 255 || /[\\/\0]/.test(fileName)) {
    return Response.json({ error: 'Invalid file request' }, { status: 400 });
  }

  const { id } = params;
  const orderResponse = await supabaseRest(
    `orders?id=eq.${encodeURIComponent(id)}&customer_email=ilike.${encodeURIComponent(escapePostgrestLike(auth.email))}&select=id,order_items(file_name)`
  );
  if (!orderResponse.ok) return Response.json({ error: 'Failed to verify file access' }, { status: 500 });
  const rows = await orderResponse.json();
  const allowed = rows[0]?.order_items?.some((item: { file_name?: string }) => item.file_name === fileName);
  if (!allowed) return Response.json({ error: 'File not found' }, { status: 404 });

  const slicerBase = process.env.SLICER_WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!slicerBase || !secret) return Response.json({ error: 'File service is not configured' }, { status: 503 });

  const fileUrl = `${slicerBase}/get-file?orderId=${encodeURIComponent(id)}&fileName=${encodeURIComponent(fileName)}`;
  const fileRes = await fetch(fileUrl, {
    headers: { 'x-worker-secret': secret },
  });

  if (!fileRes.ok) return Response.json({ error: 'File not found' }, { status: 404 });

  // Stream the file straight back to the browser
  return new Response(fileRes.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
