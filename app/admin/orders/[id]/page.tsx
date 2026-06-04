"use client";
export const runtime = "edge";
import{useEffect,useState}from "react";
import{useRouter}from "next/navigation";
import Link from "next/link";
import{ArrowLeft,Save,ExternalLink,FileText,Receipt,Package}from "lucide-react";
const STATUS_OPTIONS=[{value:"pending",label:"Payment Pending"},{value:"received",label:"Order Received"},{value:"queued",label:"In Queue"},{value:"printing",label:"Printing"},{value:"quality_check",label:"Quality Check"},{value:"shipped",label:"Shipped"},{value:"delivered",label:"Delivered"},{value:"cancelled",label:"Cancelled"}];
const STATUS_COLORS:Record<string,string>={pending:"#6b7280",received:"#3b82f6",queued:"#f59e0b",printing:"#f97316",quality_check:"#a855f7",shipped:"#22c55e",delivered:"#16a34a",cancelled:"#ef4444"};
const BOX_PRESETS=[
  {label:"Small (10×8×4)",l:10,w:8,h:4},
  {label:"Medium (14×12×6)",l:14,w:12,h:6},
  {label:"Large (18×14×8)",l:18,w:14,h:8},
  {label:"XL (24×18×10)",l:24,w:18,h:10},
  {label:"Custom",l:0,w:0,h:0},
];
export default function AdminOrderDetail({params}:{params:{id:string}}){
  const{id}=params;
  const[order,setOrder]=useState<any>(null);
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[status,setStatus]=useState("");
  const[tracking,setTracking]=useState("");
  const[notes,setNotes]=useState("");
  const[saved,setSaved]=useState(false);
  const[invoicing,setInvoicing]=useState(false);
  const[invoiceUrl,setInvoiceUrl]=useState<string|null>(null);
  const[invoiceError,setInvoiceError]=useState<string|null>(null);
  const[showLabelPicker,setShowLabelPicker]=useState(false);
  const[boxPreset,setBoxPreset]=useState(0);
  const[boxL,setBoxL]=useState("14");
  const[boxW,setBoxW]=useState("12");
  const[boxH,setBoxH]=useState("6");
  const[creatingLabel,setCreatingLabel]=useState(false);
  const[labelUrl,setLabelUrl]=useState<string|null>(null);
  const[labelError,setLabelError]=useState<string|null>(null);
  const router=useRouter();
  useEffect(()=>{
    const token=localStorage.getItem("dragline_admin_token");
    if(!token){router.push("/admin/login");return;}
    fetch(`/api/admin/orders/${id}`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(data=>{
        setOrder(data);setStatus(data.status||"received");setTracking(data.tracking_number||"");
        setNotes(data.notes||"");setInvoiceUrl(data.square_invoice_url||null);
        setLabelUrl(data.label_url||null);
      })
      .finally(()=>setLoading(false));
  },[id,router]);
  function selectPreset(i:number){
    setBoxPreset(i);
    const p=BOX_PRESETS[i];
    if(p.l){setBoxL(String(p.l));setBoxW(String(p.w));setBoxH(String(p.h));}
  }
  async function handleSave(){
    const token=localStorage.getItem("dragline_admin_token");if(!token)return;
    setSaving(true);
    const res=await fetch(`/api/admin/orders/${id}`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({status,tracking_number:tracking,notes})});
    if(res.ok){const u=await res.json();setOrder(u);setSaved(true);setTimeout(()=>setSaved(false),2000);}
    setSaving(false);
  }
  async function handleCreateInvoice(){
    const token=localStorage.getItem("dragline_admin_token");if(!token)return;
    setInvoicing(true);setInvoiceError(null);
    const res=await fetch(`/api/admin/orders/${id}/invoice`,{method:"POST",headers:{Authorization:`Bearer ${token}`}});
    if(res.ok){const data=await res.json();setInvoiceUrl(data.invoice_url);window.open(data.invoice_url,"_blank");}
    else{const err=await res.json();setInvoiceError(err.error||"Failed to create invoice");}
    setInvoicing(false);
  }
  async function handleCreateLabel(){
    const token=localStorage.getItem("dragline_admin_token");if(!token)return;
    setCreatingLabel(true);setLabelError(null);
    const res=await fetch(`/api/admin/orders/${id}/label`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({length:parseFloat(boxL),width:parseFloat(boxW),height:parseFloat(boxH)})});
    if(res.ok){
      const data=await res.json();
      setLabelUrl(data.label_url);
      setTracking(data.tracking_number);
      setShowLabelPicker(false);
      window.open(data.label_url,"_blank");
    }else{const err=await res.json();setLabelError(err.error||"Label creation failed");}
    setCreatingLabel(false);
  }
  if(loading)return<div className="max-w-4xl mx-auto px-6 py-16 text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin"/></div>;
  if(!order)return<div className="max-w-4xl mx-auto px-6 py-16 text-center text-bone/50">Order not found</div>;
  return(
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors"><ArrowLeft size={20}/></Link>
        <div>
          <div className="font-mono text-xs text-amber font-bold">{order.id}</div>
          <div className="font-display font-extrabold text-2xl">{order.customer_name}</div>
        </div>
        <div className="ml-auto">
          <Link href={`/order/${order.id}`} target="_blank" className="flex items-center gap-1 text-xs font-mono text-bone/50 hover:text-bone transition-colors">Customer view <ExternalLink size={12}/></Link>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {invoiceUrl?(
          <a href={invoiceUrl} target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-display font-bold text-sm rounded-sm transition-colors">
            <Receipt size={15}/>VIEW INVOICE
          </a>
        ):(
          <button onClick={handleCreateInvoice} disabled={invoicing} className="flex items-center gap-2 px-4 py-2.5 bg-amber text-ironworks font-display font-bold text-sm rounded-sm hover:bg-amber-dark transition-colors disabled:opacity-50">
            <Receipt size={15}/>{invoicing?"CREATING...":"CREATE SQUARE INVOICE"}
          </button>
        )}
        <button onClick={()=>window.open(`/admin/orders/${id}/packing-slip`,"_blank")} className="flex items-center gap-2 px-4 py-2.5 bg-ironworks2 border border-ironworks3 hover:border-amber text-bone font-display font-bold text-sm rounded-sm transition-colors">
          <FileText size={15}/>PACKING SLIP
        </button>
        {labelUrl?(
          <a href={labelUrl} target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-sm rounded-sm transition-colors">
            <Package size={15}/>PRINT LABEL
          </a>
        ):(
          <button onClick={()=>setShowLabelPicker(!showLabelPicker)} className="flex items-center gap-2 px-4 py-2.5 bg-ironworks2 border border-ironworks3 hover:border-amber text-bone font-display font-bold text-sm rounded-sm transition-colors">
            <Package size={15}/>CREATE LABEL
          </button>
        )}
        {invoiceError&&<div className="text-xs text-red-400 self-center font-mono">{invoiceError}</div>}
      </div>

      {/* Box Picker */}
      {showLabelPicker&&(
        <div className="bg-ironworks2 border border-amber/40 rounded-sm p-5 mb-6">
          <div className="font-mono text-xs text-amber tracking-widest mb-4">BOX DIMENSIONS</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {BOX_PRESETS.map((p,i)=>(
              <button key={i} onClick={()=>selectPreset(i)} className={`px-3 py-1.5 text-xs font-mono rounded-sm border transition-colors ${boxPreset===i?"border-amber bg-amber/10 text-amber":"border-ironworks3 text-steel hover:border-bone"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mb-4">
            {[["L",boxL,setBoxL],["W",boxW,setBoxW],["H",boxH,setBoxH]].map(([label,val,set])=>(
              <div key={label as string} className="flex-1">
                <label className="block font-mono text-xs text-steel mb-1">{label as string} (in)</label>
                <input value={val as string} onChange={e=>{(set as any)(e.target.value);setBoxPreset(4);}} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm font-mono"/>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCreateLabel} disabled={creatingLabel} className="flex items-center gap-2 px-4 py-2.5 bg-amber text-ironworks font-display font-bold text-sm rounded-sm hover:bg-amber-dark transition-colors disabled:opacity-50">
              <Package size={15}/>{creatingLabel?"CREATING...":"PURCHASE & PRINT LABEL"}
            </button>
            <button onClick={()=>setShowLabelPicker(false)} className="text-xs font-mono text-steel hover:text-bone">cancel</button>
            {labelError&&<div className="text-xs text-red-400 font-mono">{labelError}</div>}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
          <div className="font-mono text-xs text-amber tracking-widest mb-3">CUSTOMER</div>
          <div className="space-y-1.5 text-sm">
            <div><span className="text-steel">Name:</span> {order.customer_name}</div>
            <div><span className="text-steel">Email:</span> <a href={`mailto:${order.customer_email}`} className="text-amber hover:underline">{order.customer_email}</a></div>
            {order.address&&<div><span className="text-steel">Ship to:</span> {order.address}, {order.city}, {order.state} {order.zip}</div>}
            <div><span className="text-steel">Shipping:</span> {order.shipping_service||"--"} · ${order.shipping_cost?.toFixed(2)}</div>
            <div><span className="text-steel">Total:</span> <span className="font-bold text-amber">${order.total?.toFixed(2)}</span></div>
            <div className="font-mono text-xs text-steel pt-1">{new Date(order.created_at).toLocaleString("en-US")}</div>
          </div>
        </div>
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
          <div className="font-mono text-xs text-amber tracking-widest mb-3">STATUS</div>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-steel mb-1.5 tracking-wider">STATUS</label>
              <select value={status} onChange={e=>setStatus(e.target.value)} style={{color:STATUS_COLORS[status]}} className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-sm">
                {STATUS_OPTIONS.map(o=><option key={o.value} value={o.value} style={{color:STATUS_COLORS[o.value]}}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1.5 tracking-wider">TRACKING NUMBER</label>
              <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="USPS tracking..." className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm font-mono"/>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1.5 tracking-wider">NOTES</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Internal notes..." className="w-full px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm resize-none"/>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full py-3 font-display font-bold bg-amber text-ironworks rounded-sm hover:bg-amber-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Save size={16}/>{saved?"SAVED!":saving?"SAVING...":"SAVE CHANGES"}
            </button>
            {status==="shipped"&&tracking&&<div className="font-mono text-xs text-green-400 text-center">Customer will receive a shipping email</div>}
          </div>
        </div>
      </div>
      {order.order_items?.length>0&&(
        <div className="bg-ironworks2 border border-ironworks3 rounded-sm">
          <div className="px-5 py-4 border-b border-ironworks3 font-mono text-xs text-amber tracking-widest">PARTS ({order.order_items.length})</div>
          <div className="divide-y divide-ironworks3">
            {order.order_items.map((item:any)=>(
              <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-sm">{item.file_name}</div>
                  <div className="font-mono text-xs text-steel mt-1">{item.material} · {item.quality} · {item.infill}% · {item.grams}g · {item.hours}h</div>
                </div>
                <div className="font-display font-bold text-amber">${item.price?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
