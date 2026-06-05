"use client";
export const runtime = "edge";
import{useEffect,useState}from "react";
import{useRouter}from "next/navigation";

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
        setStatus("Generating PDF...");
        // Dynamically import jsPDF
        const{jsPDF}=await import("jspdf");
        const doc=new jsPDF({unit:"mm",format:"letter"});
        const W=215.9;
        const margin=20;
        let y=20;

        // Header
        doc.setFont("helvetica","bold");
        doc.setFontSize(18);
        doc.setTextColor(20,20,20);
        doc.text("DRAGLINE 3D",margin,y);
        doc.setFont("helvetica","normal");
        doc.setFontSize(9);
        doc.setTextColor(120,120,120);
        doc.text("Layer by layer · dragline3d.com",margin,y+5);

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
        // Divider
        doc.setDrawColor(20,20,20);
        doc.setLineWidth(0.5);
        doc.line(margin,y,W-margin,y);
        y+=8;

        // Ship To + Shipping Method
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
        // Parts table header
        doc.setDrawColor(200,200,200);
        doc.setLineWidth(0.3);
        doc.line(margin,y,W-margin,y);
        y+=5;
        doc.setFont("helvetica","bold");
        doc.setFontSize(8);
        doc.setTextColor(100,100,100);
        doc.text("PART",margin,y);
        doc.text("MATERIAL",margin+75,y);
        doc.text("COLOR",margin+105,y);
        doc.text("QUALITY",margin+135,y);
        doc.text("INFILL",margin+158,y);
        doc.text("QTY",W-margin,y,{align:"right"});
        y+=3;
        doc.line(margin,y,W-margin,y);
        y+=5;

        // Parts rows
        const items=order.order_items||[];
        for(const item of items){
          doc.setFont("helvetica","bold");
          doc.setFontSize(9);
          doc.setTextColor(20,20,20);
          // Truncate long filenames
          const fname=item.file_name?.replace(/\.(stl|3mf)$/i,"")||"";
          const truncated=fname.length>30?fname.slice(0,28)+"…":fname;
          doc.text(truncated,margin,y);
          doc.setFont("helvetica","normal");
          doc.setTextColor(60,60,60);
          doc.text(item.material||"",margin+75,y);
          doc.text(item.color||"Midnight Black",margin+105,y);
          doc.text(item.quality||"",margin+135,y);
          doc.text(`${item.infill||0}%`,margin+158,y);
          doc.setFont("helvetica","bold");
          doc.setTextColor(20,20,20);
          doc.text("1",W-margin,y,{align:"right"});
          y+=5;
          doc.setDrawColor(240,240,240);
          doc.setLineWidth(0.2);
          doc.line(margin,y,W-margin,y);
          y+=3;
        }

        y+=6;
        // Footer
        doc.setDrawColor(200,200,200);
        doc.setLineWidth(0.3);
        doc.line(margin,y,W-margin,y);
        y+=6;
        doc.setFont("helvetica","normal");
        doc.setFontSize(8);
        doc.setTextColor(150,150,150);
        doc.text("Thank you for your order · questions? info@dragline3d.com",margin,y);
        doc.text("dragline3d.com",W-margin,y,{align:"right"});

        // Open PDF
        doc.output("dataurlnewwindow");
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
