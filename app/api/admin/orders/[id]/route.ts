export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";
import{getOrder,updateOrder}from "@/lib/db";
export async function GET(request:Request,{params}:{params:{id:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  try{const o=await getOrder(params.id);if(!o)return Response.json({error:"Not found"},{status:404});return Response.json(o);}
  catch(e:any){return Response.json({error:e.message},{status:500});}
}
export async function PATCH(request:Request,{params}:{params:{id:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  try{
    const body=await request.json();
    const allowed=["status","tracking_number","notes"];
    const updates:Record<string,string>={};
    for(const k of allowed)if(body[k]!==undefined)updates[k]=body[k];
    const updated=await updateOrder(params.id,updates);
    if(updates.status==="shipped"&&updates.tracking_number){
      const order=await getOrder(params.id);
      if(order){
        const rk=process.env.RESEND_API_KEY;
        if(rk)await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${rk}`,"Content-Type":"application/json"},body:JSON.stringify({from:"orders@dragline3d.com",to:[order.customer_email],subject:`Order ${order.id} shipped!`,html:`<p>Hi ${order.customer_name}, your order ${order.id} shipped. Tracking: ${updates.tracking_number}. Track at https://dragline3d.com/order/${order.id}</p>`})}).catch(()=>{});
      }
    }
    return Response.json(updated);
  }catch(e:any){return Response.json({error:e.message},{status:500});}
}
