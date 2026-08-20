export const runtime="edge";
import { authenticateCustomer, escapePostgrestLike } from "@/lib/customerAuth";
import { supabaseRest } from "@/lib/supabaseRest";

export async function GET(request:Request,{params}:{params:{id:string}}){
  const auth=await authenticateCustomer(request);
  if("response" in auth)return auth.response;
  const r=await supabaseRest(`orders?id=eq.${encodeURIComponent(params.id)}&customer_email=ilike.${encodeURIComponent(escapePostgrestLike(auth.email))}&select=*,order_items(*)`);
  if(!r.ok)return Response.json({error:"Failed to fetch order"},{status:500});
  const rows=await r.json();
  if(!rows.length)return Response.json({error:"Order not found"},{status:404});
  return Response.json(rows[0]);
}
