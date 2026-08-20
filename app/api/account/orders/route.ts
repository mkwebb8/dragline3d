export const runtime="edge";
import { authenticateCustomer, escapePostgrestLike } from "@/lib/customerAuth";
import { supabaseRest } from "@/lib/supabaseRest";

export async function GET(request:Request){
  const auth=await authenticateCustomer(request);
  if("response" in auth)return auth.response;
  const r=await supabaseRest(`orders?customer_email=ilike.${encodeURIComponent(escapePostgrestLike(auth.email))}&select=*,order_items(*)&order=created_at.desc`);
  if(!r.ok)return Response.json({error:"Failed to fetch orders"},{status:500});
  return Response.json(await r.json());
}
