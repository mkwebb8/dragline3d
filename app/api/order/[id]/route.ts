export const runtime="edge";
import{getOrder,updateOrder}from "@/lib/db";
export async function GET(_:Request,{params}:{params:{id:string}}){
  try{
    const o=await getOrder(params.id);
    if(!o)return Response.json({error:"Order not found"},{status:404});
    return Response.json({id:o.id,status:o.status,tracking_number:o.tracking_number,shipping_service:o.shipping_service,customer_name:o.customer_name,total:o.total,created_at:o.created_at,updated_at:o.updated_at,item_count:o.order_items?.length||0});
  }catch(e:any){return Response.json({error:e.message},{status:500});}
}
export async function POST(_:Request,{params}:{params:{id:string}}){
  try{
    const o=await getOrder(params.id);
    if(!o)return Response.json({error:"Not found"},{status:404});
    if(o.status==="pending"){
      await updateOrder(params.id,{status:"received"});
      // Send customer confirmation email
      const resendKey=process.env.RESEND_API_KEY;
      if(resendKey&&o.customer_email){
        const html=`
        <div style="background:#111;color:#fff;font-family:monospace;padding:32px;max-width:600px">
          <div style="font-size:20px;font-weight:bold;color:#f59e0b;margin-bottom:4px">DRAGLINE 3D</div>
          <div style="color:#666;font-size:12px;margin-bottom:24px">Layer by layer · dragline3d.com</div>
          <div style="font-size:18px;font-weight:bold;margin-bottom:16px">Order Confirmed!</div>
          <p style="color:#aaa;margin-bottom:16px">Hi ${o.customer_name}, thank you for your order. We've received your payment and will begin processing your parts shortly.</p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:16px;margin-bottom:16px">
            <div style="color:#f59e0b;font-size:11px;letter-spacing:.1em;margin-bottom:8px">ORDER ID</div>
            <div style="font-size:20px;font-weight:bold;color:#f59e0b">${o.id}</div>
          </div>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:16px;margin-bottom:16px">
            <div style="color:#f59e0b;font-size:11px;letter-spacing:.1em;margin-bottom:8px">ORDER SUMMARY</div>
            <div style="color:#aaa;font-size:12px">Parts: ${o.order_items?.length||0} item${(o.order_items?.length||0)!==1?"s":""}</div>
            <div style="color:#aaa;font-size:12px">Shipping: ${o.shipping_service||"Standard"}</div>
            <div style="color:#fff;font-size:16px;font-weight:bold;margin-top:8px">Total: $${o.total?.toFixed(2)}</div>
          </div>
          <div style="margin-bottom:24px">
            <a href="https://dragline3d.com/order/${o.id}" style="background:#f59e0b;color:#111;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:4px;display:inline-block">TRACK YOUR ORDER</a>
          </div>
          <div style="color:#666;font-size:11px">
            <div style="margin-bottom:4px">What happens next:</div>
            <div>1. We review your file and confirm it is print-ready</div>
            <div>2. You get an email with your timeline and any questions</div>
            <div>3. We print, inspect, and pack your part</div>
            <div>4. You get a tracking number when it ships</div>
          </div>
          <div style="margin-top:24px;color:#555;font-size:11px">Questions? Email <a href="mailto:info@dragline3d.com" style="color:#f59e0b">info@dragline3d.com</a></div>
        </div>`;
        await fetch("https://api.resend.com/emails",{
          method:"POST",
          headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json"},
          body:JSON.stringify({
            from:"orders@dragline3d.com",
            to:[o.customer_email],
            subject:`Order ${o.id} confirmed — Dragline 3D`,
            html,
          }),
        }).catch((e:Error)=>console.error("Customer email error:",e.message));
      }
    }
    return Response.json({ok:true});
  }catch(e:any){return Response.json({error:e.message},{status:500});}
}
