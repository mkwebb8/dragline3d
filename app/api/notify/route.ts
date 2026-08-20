export const runtime="edge";
import { getOrder } from "@/lib/db";
import { verifyState } from "@/lib/signedState";
import { rateLimit } from "@/lib/rateLimit";

const MAX_TOTAL_BYTES=100*1024*1024;
const ALLOWED_FILE=/\.(stl|3mf|step|stp)$/i;
function escapeHtml(value:unknown){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));}

export async function POST(request:Request){
  const limited=rateLimit(request,"notify",10,10*60_000);
  if(limited)return limited;
  try{
    const declaredLength=Number(request.headers.get("content-length")||0);
    if(declaredLength>MAX_TOTAL_BYTES+1024*1024)return Response.json({error:"Upload too large"},{status:413});
    const form=await request.formData();
    const orderId=form.get("orderId") as string;
    const notification=await verifyState(form.get("notificationToken"),"order-notification");
    if(!notification||notification.orderId!==orderId)return Response.json({error:"Invalid or expired notification request"},{status:401});
    const expectedFiles=Array.isArray(notification.files)?notification.files:[];
    const order=await getOrder(orderId);
    if(!order)return Response.json({error:"Order not found"},{status:404});
    const customerName=escapeHtml(order.customer_name);
    const customerEmail=escapeHtml(order.customer_email);
    const address=escapeHtml(order.address);
    const city=escapeHtml(order.city);
    const state=escapeHtml(order.state);
    const zip=escapeHtml(order.zip);
    const shippingLabel=escapeHtml(order.shipping_service);
    const shippingCost=String(Number(order.shipping_cost||0));
    const total=String(Number(order.total||0));
    const items=(order.order_items||[]).map((item:any)=>({...item,fileName:item.file_name}));
    const resendKey=process.env.RESEND_API_KEY;
    const notifyEmail=process.env.NOTIFY_EMAIL||"orders@dragline3d.com";
    const slicerUrl=process.env.SLICER_URL||"https://slicer.dragline3d.com";
    if(!resendKey)return Response.json({error:"Resend not configured"},{status:503});

    // Build attachments from uploaded files
    const attachments:any[]=[];
    const fileEntries:{name:string;file:File}[]=[];
    const receivedFiles:{fileName:string;fileHash:string}[]=[];
    let totalFileBytes=0;
    for(const[key,value] of form.entries()){
      if(key.startsWith("file_")&&value instanceof File){
        if(!ALLOWED_FILE.test(value.name)||value.size<=0)return Response.json({error:"Invalid order file"},{status:400});
        totalFileBytes+=value.size;
        if(fileEntries.length>=25||totalFileBytes>MAX_TOTAL_BYTES)return Response.json({error:"Upload limits exceeded"},{status:413});
        const buf=await value.arrayBuffer();
        const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",buf));
        const hash=Array.from(digest,byte=>byte.toString(16).padStart(2,"0")).join("");
        receivedFiles.push({fileName:value.name,fileHash:hash});
        const uint8=new Uint8Array(buf);
        let b64="";
        const chunkSize=8192;
        for(let i=0;i<uint8.length;i+=chunkSize){
          b64+=String.fromCharCode(...uint8.subarray(i,i+chunkSize));
        }
        b64=btoa(b64);
        attachments.push({filename:value.name,content:b64});
        fileEntries.push({name:value.name,file:new File([buf],value.name,{type:value.type})});
      }
    }
    const normalize=(values:any[])=>values.map(value=>`${value.fileName}:${value.fileHash}`).sort();
    if(JSON.stringify(normalize(receivedFiles))!==JSON.stringify(normalize(expectedFiles))){
      return Response.json({error:"Uploaded files do not match the priced models"},{status:400});
    }

    console.log("[notify] orderId:",orderId,"fileEntries:",fileEntries.length);

    const totalQty=items.reduce((s:number,i:any)=>s+(i.qty||1),0);

    // ── NAS save (before email so result goes in the email body) ──────────
    let nasSaved=false;
    let nasError="";
    if(orderId&&customerName&&fileEntries.length>0){
      const saveForm=new FormData();
      saveForm.append("orderId",orderId);
      saveForm.append("customerName",customerName);
      for(const{name,file} of fileEntries) saveForm.append("file",file,name);
      saveForm.append("items",JSON.stringify(items.map((i:any)=>({id:i.id,thumbnail:i.thumbnail||null}))));
      const workerSecret=process.env.WORKER_SECRET||"";
      try{
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),8000);
        const sfRes=await fetch(`${slicerUrl}/save-files`,{method:"POST",headers:{"x-worker-secret":workerSecret},body:saveForm,signal:controller.signal});
        clearTimeout(timer);
        nasSaved=sfRes.ok;
        if(!sfRes.ok) nasError=`HTTP ${sfRes.status}`;
        console.log("[save-files] status:",sfRes.status);
      }catch(e:any){
        nasError=e.name==="AbortError"?"Timed out after 8s":e.message;
        console.error("[save-files] failed:",nasError);
      }
    } else if(fileEntries.length===0){
      nasError="No files in request";
    }

    const itemRows=items.map((i:any)=>{
      const qty=i.qty||1;
      return`
      <tr style="border-bottom:1px solid #333">
        <td style="padding:8px;color:#fff">${escapeHtml(i.fileName)}</td>
        <td style="padding:8px;color:#aaa">${escapeHtml(i.material)}</td>
        <td style="padding:8px;color:#aaa">${escapeHtml(i.color||"Midnight Black")}</td>
        <td style="padding:8px;color:#aaa">${escapeHtml(i.quality)} · ${Number(i.infill)}%</td>
        <td style="padding:8px;color:#aaa">${i.grams}g</td>
        <td style="padding:8px;color:#aaa;text-align:center">${qty}</td>
        <td style="padding:8px;color:#f59e0b;text-align:right">$${(i.price*qty).toFixed(2)}</td>
      </tr>`;
    }).join("");

    const shippingDisplay=shippingLabel==="Local Pickup"?`Local Pickup · $0`:`${shippingLabel} · $${shippingCost}`;
    const addressDisplay=shippingLabel==="Local Pickup"?`Local Pickup — Louisville, KY`:`${address}, ${city}, ${state} ${zip}`;

    const html=`
    <div style="background:#111;color:#fff;font-family:monospace;padding:32px;max-width:600px">
      <div style="font-size:20px;font-weight:bold;color:#f59e0b;margin-bottom:4px">DRAGLINE 3D</div>
      <div style="color:#666;font-size:12px;margin-bottom:24px">New Order Received</div>
      ${orderId?`<div style="color:#666;font-size:11px;margin-bottom:16px;letter-spacing:.05em">ORDER: ${orderId}</div>`:""}
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:16px;margin-bottom:16px">
        <div style="color:#f59e0b;font-size:11px;letter-spacing:.1em;margin-bottom:12px">CUSTOMER</div>
        <div style="color:#fff;margin-bottom:4px">${customerName}</div>
        <div style="color:#aaa;font-size:12px">${customerEmail}</div>
        <div style="color:#aaa;font-size:12px;margin-top:8px">${addressDisplay}</div>
        <div style="color:#aaa;font-size:12px;margin-top:4px">Shipping: ${shippingDisplay}</div>
      </div>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:16px;margin-bottom:16px">
        <div style="color:#f59e0b;font-size:11px;letter-spacing:.1em;margin-bottom:12px">PARTS (${items.length} lines · ${totalQty} pcs)</div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid #444">
              <th style="padding:8px;color:#666;text-align:left;font-size:11px">FILE</th>
              <th style="padding:8px;color:#666;text-align:left;font-size:11px">MATERIAL</th>
              <th style="padding:8px;color:#666;text-align:left;font-size:11px">COLOR</th>
              <th style="padding:8px;color:#666;text-align:left;font-size:11px">QUALITY</th>
              <th style="padding:8px;color:#666;text-align:left;font-size:11px">WEIGHT</th>
              <th style="padding:8px;color:#666;text-align:center;font-size:11px">QTY</th>
              <th style="padding:8px;color:#666;text-align:right;font-size:11px">PRICE</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
      <div style="text-align:right;font-size:20px;font-weight:bold;color:#f59e0b">Total: $${Number(total).toFixed(2)}</div>
      ${fileEntries.length>0?`
      <div style="margin-top:16px;padding:10px 14px;border-radius:4px;border:1px solid ${nasSaved?"#166534":"#7f1d1d"};background:${nasSaved?"#052e16":"#1c0505"}">
        <span style="font-size:11px;font-weight:bold;letter-spacing:.08em;color:${nasSaved?"#4ade80":"#f87171"}">${nasSaved?"✓ FILES SAVED TO NAS":"⚠ NAS SAVE FAILED"}</span>
        ${!nasSaved?`<span style="font-size:11px;color:#f87171;margin-left:8px">— ${nasError} — files are attached to this email</span>`:""}
      </div>`:""}
    </div>`;

    const res=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        from:"orders@dragline3d.com",
        to:[notifyEmail],
        subject:`New Dragline 3D Order — ${customerName}`,
        html,
        attachments,
      }),
    });
    if(!res.ok){const e=await res.json();console.error("Resend error:",JSON.stringify(e));}
    return Response.json({ok:true,nasSaved,nasError:nasError||undefined});
  }catch(e:any){
    console.error("Notify error:",e.message);
    return Response.json({error:e.message},{status:500});
  }
}
