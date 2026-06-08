"use client";
export const runtime = "edge";
import{useEffect,useState}from "react";
import{useRouter}from "next/navigation";
const LOGO_B64="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";
export default function PackingSlip({params}:{params:{id:string}}){
  const{id}=params;
  const[status,setStatus]=useState("Loading order...");
  const router=useRouter();
  useEffect(()=>{
    const token=localStorage.getItem("dragline_admin_token");
    if(!token){router.push("/admin/login");return;}
    fetch(`/api/admin/orders/${id}`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json())
      .then(async order=>{
        setStatus("Fetching thumbnails...");
        // Fetch thumbnails for all items
        const thumbMap:Record<string,string>={};
        const items=order.order_items||[];
        await Promise.allSettled(
          items.map(async(item:any)=>{
            try{
              const res=await fetch(`/api/admin/orders/${id}/thumb?itemId=${item.id}`,{
                headers:{Authorization:`Bearer ${token}`},
              });
              if(res.ok){
                const blob=await res.blob();
                const dataUrl=await new Promise<string>((resolve)=>{
                  const reader=new FileReader();
                  reader.onload=()=>resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
                thumbMap[item.id]=dataUrl;
              }
            }catch{}
          })
        );
        setStatus("Generating PDF...");
        const{jsPDF}=await import("jspdf");
        const doc=new jsPDF({unit:"mm",format:"letter"});
        const W=215.9;
        const margin=20;
        let y=20;
        // Logo
        doc.addImage(LOGO_B64,"JPEG",margin,y-8,18,18);
        // Header text next to logo
        doc.setFont("helvetica","bold");
        doc.setFontSize(18);
        doc.setTextColor(20,20,20);
        doc.text("DRAGLINE 3D",margin+22,y);
        doc.setFont("helvetica","normal");
        doc.setFontSize(9);
        doc.setTextColor(120,120,120);
        doc.text("Layer by layer · dragline3d.com",margin+22,y+5);
        // Order ID + date top right
        doc.setFont("helvetica","bold");
        doc.setFontSize(10);
        doc.setTextColor(20,20,20);
        doc.text(order.id,W-margin,y,{align:"right"});
        doc.setFont("helvetica","normal");
        doc.setFontSize(9);
        doc.setTextColor(120,120,120);
        doc.text(new Date(order.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),W-margin,y+5,{align:"right"});
        // PACKING SLIP badge
        doc.setFillColor(20,20,20);
        doc.roundedRect(W-margin-24,y+8,24,6,1,1,"F");
        doc.setFont("helvetica","bold");
        doc.setFontSize(7);
        doc.setTextColor(255,255,255);
        doc.text("PACKING SLIP",W-margin-12,y+12.5,{align:"center"});
        y+=22;
        doc.setDrawColor(20,20,20);
        doc.setLineWidth(0.5);
        doc.line(margin,y,W-margin,y);
        y+=8;
        // Ship To + Shipping
        doc.setFont("helvetica","bold");
        doc.setFontSize(8);
        doc.setTextColor(100,100,100);
        doc.text("SHIP TO",margin,y);
        doc.text("SHIPPING METHOD",margin+80,y);
        y+=5;
        doc.setFont("helvetica","bold");
        doc.setFontSize(10);
        doc.setTextColor(20,20,20);
        doc.text(order.customer_name||"",margin,y);
        doc.text(order.shipping_service||"—",margin+80,y);
        y+=5;
        doc.setFont("helvetica","normal");
        doc.setFontSize(9);
        doc.setTextColor(60,60,60);
        doc.text(order.address||"",margin,y);
        y+=4;
        doc.text(`${order.city||""}, ${order.state||""} ${order.zip||""}`,margin,y);
        y+=4;
        doc.setTextColor(120,120,120);
        doc.text(order.customer_email||"",margin,y);
        if(order.tracking_number){
          doc.setFont("helvetica","bold");
          doc.setFontSize(8);
          doc.setTextColor(100,100,100);
          doc.text("TRACKING",margin+80,y-8);
          doc.setFont("helvetica","bold");
          doc.setFontSize(9);
          doc.setTextColor(20,20,20);
          doc.text(order.tracking_number,margin+80,y-3);
        }
        y+=10;
        // Table header
        doc.setDrawColor(200,200,200);
        doc.setLineWidth(0.3);
        doc.line(margin,y,W-margin,y);
        y+=5;
        doc.setFont("helvetica","bold");
        doc.setFontSize(8);
        doc.setTextColor(100,100,100);
        doc.text("PART",margin+14,y);
        doc.text("MATERIAL",margin+80,y);
        doc.text("COLOR",margin+110,y);
        doc.text("QUALITY",margin+138,y);
        doc.text("INFILL",margin+161,y);
        doc.text("QTY",W-margin,y,{align:"right"});
        y+=3;
        doc.line(margin,y,W-margin,y);
        y+=2;
        // Parts rows
        const rowH=14;
        for(const item of items){
          const thumb=thumbMap[item.id];
          if(thumb){
            try{doc.addImage(thumb,"JPEG",margin,y,12,12);}catch{}
          }
          const tx=margin+14;
          doc.setFont("helvetica","bold");
          doc.setFontSize(9);
          doc.setTextColor(20,20,20);
          const fname=(item.file_name||"").replace(/\.(stl|3mf|step|stp)$/i,"");
          const truncated=fname.length>28?fname.slice(0,26)+"…":fname;
          doc.text(truncated,tx,y+5);
          doc.setFont("helvetica","normal");
          doc.setFontSize(8);
          doc.setTextColor(60,60,60);
          doc.text(item.material||"",margin+80,y+5);
          doc.text(item.color||"Midnight Black",margin+110,y+5);
          doc.text(item.quality||"",margin+138,y+5);
          doc.text(`${item.infill||0}%`,margin+161,y+5);
          doc.setFont("helvetica","bold");
          doc.setTextColor(20,20,20);
          doc.text(String(item.qty||1),W-margin,y+5,{align:"right"});
          y+=rowH;
          doc.setDrawColor(240,240,240);
          doc.setLineWidth(0.2);
          doc.line(margin,y,W-margin,y);
          y+=2;
        }
        y+=6;
        doc.setDrawColor(200,200,200);
        doc.setLineWidth(0.3);
        doc.line(margin,y,W-margin,y);
        y+=6;
        doc.setFont("helvetica","normal");
        doc.setFontSize(8);
        doc.setTextColor(150,150,150);
        doc.text("Thank you for your order · questions? info@dragline3d.com",margin,y);
        doc.text("dragline3d.com",W-margin,y,{align:"right"});

        // Open in new window
        doc.output("dataurlnewwindow");

        // Save to NAS
        try {
          setStatus("Saving to NAS...");
          const pdfBase64 = doc.output("datauristring").split(",")[1];
          const orderId = (order.id || "UNKNOWN").toUpperCase();
          const month = order.created_at?.slice(0, 7) || new Date().toISOString().slice(0, 7);
          const customerName = order.customer_name || "Unknown";
          await fetch("/api/admin/save-nas", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderId, month, pdfBase64, customerName, filename: "packing-slip.pdf" }),
          });
        } catch {
          // NAS save failure is non-fatal — PDF already opened
        }

        setStatus("Done");
        window.close();
      })
      .catch(()=>setStatus("Error loading order"));
  },[id,router]);
  return(
    <div style={{fontFamily:"monospace",padding:40,background:"#111",color:"#fff",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:14,color:"#f59e0b",marginBottom:8}}>DRAGLINE 3D</div>
        <div style={{fontSize:12,color:"#aaa"}}>{status}</div>
      </div>
    </div>
  );
}
