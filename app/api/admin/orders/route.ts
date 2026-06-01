export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";
import{getOrders}from "@/lib/db";
export async function GET(request:Request){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const url=new URL(request.url);
  const status=url.searchParams.get("status");
  try{const orders=await getOrders(status as any||undefined);return Response.json(orders);}
  catch(e:any){return Response.json({error:e.message},{status:500});}
}
