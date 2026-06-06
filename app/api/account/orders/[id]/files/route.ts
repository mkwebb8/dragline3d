export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const url = new URL(req.url);
  const email = url.searchParams.get('email');

  if (!email) return Response.json({ error: 'email required' }, { status: 400 });

  // Verify the order belongs to this customer
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, customer_email, order_items(file_name, material, quality, infill, qty, color, grams, hours, price)')
    .eq('id', id)
    .single();

  if (error || !order) return Response.json({ error: 'Order not found' }, { status: 404 });
  if (order.customer_email?.toLowerCase() !== email.toLowerCase()) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slicerBase = process.env.SLICER_URL!;
  const secret     = process.env.WORKER_SECRET!;

  // Fetch each unique file from TrueNAS
  const uniqueFileNames = [...new Set((order.order_items as any[]).map((i: any) => i.file_name))];

  const fileResults = await Promise.allSettled(
    uniqueFileNames.map(async (fileName: string) => {
      const fileUrl = `${slicerBase}/get-file?orderId=${encodeURIComponent(id)}&fileName=${encodeURIComponent(fileName)}`;
      const res = await fetch(fileUrl, {
        headers: { 'x-worker-secret': secret },
      });
      if (!res.ok) throw new Error(`File not found: ${fileName}`);
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const ext = fileName.split('.').pop()?.toLowerCase() || 'stl';
      const mimeType = ext === '3mf' ? 'model/3mf' : 'application/octet-stream';
      return { fileName, base64, mimeType };
    })
  );

  const files = fileResults
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map(r => r.value);

  const missingFiles = fileResults
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r, i) => uniqueFileNames[i]);

  return Response.json({ files, missingFiles, orderItems: order.order_items });
}
