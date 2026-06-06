export const runtime="edge";
export async function POST(request:Request){
  try{
    const form=await request.formData();
    const orderId=form.get("orderId") as string;
    const customerName=form.get("customerName") as string;
    const customerEmail=form.get("customerEmail") as string;
    const address=form.get("address") as string;
    const city=form.get("city") as string;
    const state=form.get("state") as string;
    const zip=form.get("zip") as string;
    const shippingLabel=form.get("shippingLabel") as string;
    const shippingCost=form.get("shippingCost") as string;
    const total=form.get("total") as string;
    const itemsJson=form.get("items") as string;
    const items=JSON.parse(itemsJson||"[]");
    const resendKey=process.env.RESEND_API_KEY;
    const notifyEmail=process.env.NOTIFY_EMAIL||"orders@dragline3d.com";
    const slicerUrl=process.env.SLICER_URL||"https://slicer.dragline3d.com";
    if(!resendKey)return Response.json({error:"Resend not configured"},{status:503});

    // Build attachments from uploaded files
    const attachments:any[]=[];
    const fileEntries:{name:string;file:File}[]=[];
    for(const[key,value] of form.entries()){
      if(key.startsWith("file_")&&value instanceof File){
        const buf=await value.arrayBuffer();
        const uint8 = new Uint8Array(buf);
let b64 = "";
const chunkSize = 8192;
for (let i = 0; i < uint8.length; i += chunkSize) {
  b64 += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
}
b64 = btoa(b64);
        attachments.push({filename:value.name,content:b64});
fileEntries.push({name:value.name,file:new File([buf],value.name,{type:value.type})});
      }
    }
console.log("[notify] orderId:", orderId, "fileEntries:", fileEntries.length);
    // Save files to TrueNAS (fire and forget)
    if(orderId&&customerName&&fileEntries.length>0){
      try{
        const saveForm=new FormData();
        saveForm.append("orderId",orderId);
        saveForm.append("customerName",customerName);
        for(const{name,file} of fileEntries){
          saveForm.append("file",file,name);
        }
        const workerSecret=process.env.WORKER_SECRET||"";
fetch(`${slicerUrl}/save-files`,{method:"POST",headers:{"x-worker-secret":workerSecret},body:saveForm}).then(r=>console.log("[save-files] status:",r.status)).catch(e=>console.error("[save-files] failed:",e.message));
      }catch(e:any){console.error("[save-files] error:",e.message);}
    }

    const totalQty=items.reduce((s:number,i:any)=>s+(i.qty||1),0);

    const itemRows=items.map((i:any)=>{
      const qty=i.qty||1;
      return`
      <tr style="border-bottom:1px solid #333">
        <td style="padding:8px;color:#fff">${i.fileName}</td>
        <td style="padding:8px;color:#aaa">${i.material}</td>
        <td style="padding:8px;color:#aaa">${i.color||"Midnight Black"}</td>
        <td style="padding:8px;color:#aaa">${i.quality} · ${i.infill}%</td>
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
    return Response.json({ok:true});
  }catch(e:any){
    console.error("Notify error:",e.message);
    return Response.json({error:e.message},{status:500});
  }
}
