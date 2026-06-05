export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";
import{getOrders,createOrder}from "@/lib/db";
export async function GET(request:Request){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const url=new URL(request.url);
  const status=url.searchParams.get("status")||undefined;
  try{
    const orders=await getOrders(status as any);
    const withHours=orders.map((o:any)=>({
      ...o,
      total_hours:o.order_items?.reduce((s:number,i:any)=>s+(!i.completed?(i.hours||0):0),0)||0,
    }));
    return Response.json(withHours);
  }catch(e:any){return Response.json({error:e.message},{status:500});}
}
export async function POST(request:Request){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  try{
    const body=await request.json();
    const order=await createOrder(body);
    return Response.json(order);
  }catch(e:any){return Response.json({error:e.message},{status:500});}
}
