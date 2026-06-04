"use client";
export const runtime = "edge";
import{useEffect,useState}from "react";
import{useRouter}from "next/navigation";

const COLOR_SWATCHES:Record<string,string>={
  "Midnight Black":"#111111","Snow White":"#f5f5f5","Charcoal Gray":"#4b5563",
  "Natural":"#d4c4a0","Red":"#dc2626","Blue":"#2563eb","Yellow":"#eab308",
  "Orange":"#ea580c","Green":"#16a34a",
};

export default function PackingSlip({params}:{params:{id:string}}){
  const{id}=params;
  const[order,setOrder]=useState<any>(null);
  const[loading,setLoading]=useState(true);
  const router=useRouter();
  useEffect(()=>{
    const token=localStorage.getItem("dragline_admin_token");
    if(!token){router.push("/admin/login");return;}
    fetch(`/api/admin/orders/${id}`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(data=>setOrder(data))
      .finally(()=>{setLoading(false);setTimeout(()=>window.print(),400);});
  },[id,router]);
  if(loading||!order)return<div style={{fontFamily:"monospace",padding:40}}>Loading…</div>;
  const subtotal=order.order_items?.reduce((s:number,i:any)=>s+i.price,0)??order.subtotal;
  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'IBM Plex Sans',sans-serif;background:#fff;color:#111;padding:32px 40px;max-width:720px;margin:0 auto;}
        @media print{body{padding:16px 24px;}button{display:none!important;}}
        .mono{font-family:'IBM Plex Mono',monospace;}
        .label{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;font-family:'IBM Plex Mono',monospace;}
        table{width:100%;border-collapse:collapse;}
        th{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;font-family:'IBM Plex Mono',monospace;text-align:left;padding:6px 0;border-bottom:1px solid #e5e7eb;}
        td{padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;font-size:12px;}
        .swatch{display:inline-block;width:12px;height:12px;border-radius:2px;border:1px solid #d1d5db;vertical-align:middle;margin-right:5px;}
      `}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
        <div>
          <div style={{fontWeight:800,fontSize:22,letterSpacing:"-0.02em"}}>DRAGLINE 3D</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Layer by layer · dragline3d.com</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontWeight:800,fontSize:15}} className="mono">{order.id}</div>
          <div style={{fontSize:11,color:"#6b7280"}} className="mono">{new Date(order.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
          <div style={{marginTop:6,display:"inline-block",padding:"2px 8px",background:"#111",color:"#fff",fontSize:10,fontWeight:600,letterSpacing:".08em",borderRadius:2}} className="mono">PACKING SLIP</div>
        </div>
      </div>
      <hr style={{borderColor:"#111",borderWidth:2,marginBottom:20}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
        <div>
          <div className="label" style={{marginBottom:6}}>Ship To</div>
          <div style={{fontWeight:600,fontSize:13}}>{order.customer_name}</div>
          <div style={{fontSize:12,color:"#374151",lineHeight:1.6}}>{order.address}<br/>{order.city}, {order.state} {order.zip}</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:4}}>{order.customer_email}</div>
        </div>
        <div>
          <div className="label" style={{marginBottom:6}}>Shipping Method</div>
          <div style={{fontWeight:600,fontSize:13}}>{order.shipping_service||"—"}</div>
          {order.tracking_number&&<><div className="label" style={{marginTop:12,marginBottom:4}}>Tracking</div><div style={{fontWeight:600,fontSize:12}} className="mono">{order.tracking_number}</div></>}
        </div>
      </div>
      <table style={{marginBottom:16}}>
        <thead>
          <tr><th style={{width:"40%"}}>File</th><th>Material</th><th>Color</th><th>Quality</th><th>Infill</th><th style={{textAlign:"right"}}>Price</th></tr>
        </thead>
        <tbody>
          {order.order_items?.map((item:any)=>{
            const color=item.color||"Midnight Black";
            const swatchColor=COLOR_SWATCHES[color]||"#111";
            return(
              <tr key={item.id}>
                <td style={{fontWeight:600,paddingRight:8}}>{item.file_name}</td>
                <td style={{color:"#374151"}}>{item.material}</td>
                <td><span className="swatch" style={{background:swatchColor,borderColor:color==="Snow White"?"#d1d5db":swatchColor}}/><span style={{color:"#374151"}}>{color}</span></td>
                <td style={{color:"#374151"}} className="mono">{item.quality}</td>
                <td style={{color:"#374151"}} className="mono">{item.infill}%</td>
                <td style={{textAlign:"right",fontWeight:600}} className="mono">${item.price?.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:28}}>
        <div style={{minWidth:220}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",color:"#6b7280"}}><span>Parts subtotal</span><span className="mono">${subtotal?.toFixed(2)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",color:"#6b7280"}}><span>Shipping ({order.shipping_service})</span><span className="mono">${order.shipping_cost?.toFixed(2)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:800,padding:"8px 0",borderTop:"2px solid #111",marginTop:4}}><span>Total</span><span className="mono">${order.total?.toFixed(2)}</span></div>
        </div>
      </div>
      <hr style={{borderColor:"#e5e7eb",marginBottom:16}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:10,color:"#9ca3af"}}>Thank you for your order · questions? info@dragline3d.com</div>
        <button onClick={()=>window.print()} style={{fontSize:11,padding:"6px 14px",background:"#111",color:"#fff",border:"none",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",borderRadius:2}}>PRINT</button>
      </div>
    </>
  );
}
