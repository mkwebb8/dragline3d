import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  const fileName = url.searchParams.get('fileName');

  if (!email || !fileName) return Response.json({ error: 'email and fileName required' }, { status: 400 });

  // Verify order belongs to this customer
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { id } = params;
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, customer_email')
    .eq('id', id)
    .single();

  if (error || !order) return Response.json({ error: 'Order not found' }, { status: 404 });
  if (order.customer_email?.toLowerCase() !== email.toLowerCase()) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slicerBase = process.env.SLICER_WORKER_URL!;
  const secret = process.env.WORKER_SECRET!;

  const fileUrl = `${slicerBase}/get-file?orderId=${encodeURIComponent(id)}&fileName=${encodeURIComponent(fileName)}`;
  const fileRes = await fetch(fileUrl, {
    headers: { 'x-worker-secret': secret },
  });

  if (!fileRes.ok) return Response.json({ error: 'File not found' }, { status: 404 });

  // Stream the file straight back to the browser
  return new Response(fileRes.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
