export const runtime = 'edge';

import { authenticateCustomer, escapePostgrestLike } from '@/lib/customerAuth';
import { supabaseRest } from '@/lib/supabaseRest';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateCustomer(req);
  if ("response" in auth) return auth.response;
  const response = await supabaseRest(
    `orders?id=eq.${encodeURIComponent(params.id)}&customer_email=ilike.${encodeURIComponent(escapePostgrestLike(auth.email))}&select=id,order_items(file_name,material,quality,infill,qty,color,grams,hours,price)`
  );
  if (!response.ok) return Response.json({ error: 'Failed to fetch order files' }, { status: 500 });
  const rows = await response.json();
  if (!rows.length) return Response.json({ error: 'Order not found' }, { status: 404 });
  return Response.json({ orderItems: rows[0].order_items || [] });
}
