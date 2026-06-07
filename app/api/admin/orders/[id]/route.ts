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
    const allowed=["status","tracking_number","notes","box_id"]; // ← added box_id
    const updates:Record<string,any>={};
    for(const k of allowed)if(body[k]!==undefined)updates[k]=body[k];
    const updated=await updateOrder(params.id,updates);
    const rk=process.env.RESEND_API_KEY;
    if(rk&&updates.status){
      const order=await getOrder(params.id);
      if(order){
        const trackUrl=`https://dragline3d.com/order/${order.id}`;
        const base=`<div style="background:#111;color:#fff;font-family:monospace;padding:32px;max-width:600px"><div style="font-size:20px;font-weight:bold;color:#f59e0b;margin-bottom:4px">DRAGLINE 3D</div><div style="color:#666;font-size:12px;margin-bottom:24px">Layer by layer · dragline3d.com</div>`;
        const footer=`<div style="margin-top:24px"><a href="${trackUrl}" style="background:#f59e0b;color:#111;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:4px;display:inline-block">TRACK YOUR ORDER</a></div><div style="margin-top:16px;color:#555;font-size:11px">Questions? <a href="mailto:info@dragline3d.com" style="color:#f59e0b">info@dragline3d.com</a></div></div>`;
        let subject="";let html="";
        if(updates.status==="queued"){
          subject=`Order ${order.id} — In Queue`;
          html=`${base}<p style="margin-bottom:16px">Hi ${order.customer_name}, your order is now in our print queue. We'll send you an update when we start printing.</p>${footer}`;
        } else if(updates.status==="printing"){
          subject=`Order ${order.id} — Now Printing`;
          html=`${base}<p style="margin-bottom:16px">Hi ${order.customer_name}, we've started printing your parts! We'll notify you when they're done and on the way.</p>${footer}`;
        } else if(updates.status==="shipped"&&updates.tracking_number){
          subject=`Order ${order.id} — Shipped!`;
          html=`${base}<p style="margin-bottom:16px">Hi ${order.customer_name}, your order has shipped!</p><div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:16px;margin-bottom:16px"><div style="color:#f59e0b;font-size:11px;letter-spacing:.1em;margin-bottom:8px">TRACKING</div><div style="font-size:16px;font-weight:bold">${updates.tracking_number}</div><div style="color:#aaa;font-size:12px;margin-top:4px">${order.shipping_service||"USPS"}</div></div>${footer}`;
        } else if(updates.status==="cancelled"){
          subject=`Order ${order.id} — Cancelled`;
          html=`${base}<p style="margin-bottom:16px">Hi ${order.customer_name}, your order ${order.id} has been cancelled. If you have questions or this was unexpected, please reach out.</p><div style="margin-top:24px;color:#555;font-size:11px">Questions? <a href="mailto:info@dragline3d.com" style="color:#f59e0b">info@dragline3d.com</a></div></div>`;
        }
        if(subject&&html){
          await fetch("https://api.resend.com/emails",{
            method:"POST",
            headers:{Authorization:`Bearer ${rk}`,"Content-Type":"application/json"},
            body:JSON.stringify({from:"orders@dragline3d.com",to:[order.customer_email],subject,html}),
          }).catch(()=>{});
        }
      }
    }
    return Response.json(updated);
  }catch(e:any){return Response.json({error:e.message},{status:500});}
}
