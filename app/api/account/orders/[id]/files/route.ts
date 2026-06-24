import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const url = new URL(req.url);
  const email = url.searchParams.get('email');

  if (!email) return Response.json({ error: 'email required' }, { status: 400 });

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

  return Response.json({ orderItems: order.order_items });
}
