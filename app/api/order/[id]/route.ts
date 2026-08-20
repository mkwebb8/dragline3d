export const runtime="edge";
import{getOrder}from "@/lib/db";
export async function GET(_:Request,{params}:{params:{id:string}}){
  try{
    const o=await getOrder(params.id);
    if(!o)return Response.json({error:"Order not found"},{status:404});
    return Response.json({id:o.id,status:o.status,tracking_number:o.tracking_number,shipping_service:o.shipping_service,customer_name:o.customer_name,total:o.total,created_at:o.created_at,updated_at:o.updated_at,item_count:o.order_items?.length||0});
  }catch(e:any){return Response.json({error:e.message},{status:500});}
}
