export const runtime = "edge";
"use client";
import{useEffect,useState,use}from "react";
import{Package,Truck,CheckCircle2,Clock,AlertCircle}from "lucide-react";
const STEPS=[{key:"received",label:"Order Received"},{key:"queued",label:"In Queue"},{key:"printing",label:"Printing"},{key:"quality_check",label:"Quality Check"},{key:"shipped",label:"Shipped"},{key:"delivered",label:"Delivered"}];
const STATUS_ORDER=["pending","received","queued","printing","quality_check","shipped","delivered"];
export default function OrderTracking({params}:{params:Promise<{id:string}>}){
  const{id}=use(params);
  const[order,setOrder]=useState<any>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  useEffect(()=>{
    fetch(`/api/order/${id}`).then(r=>r.json()).then(data=>{if(data.error)setError(data.error);else setOrder(data);}).catch(()=>setError("Could not load order")).finally(()=>setLoading(false));
  },[id]);
  const currentStep=order?STATUS_ORDER.indexOf(order.status):-1;
  return(
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="font-mono text-xs uppercase tracking-widest text-amber mb-4">Order Tracking</div>
      <h1 className="font-display font-black text-4xl md:text-5xl leading-[0.92] mb-6">Order <span className="text-amber">{id}</span></h1>
      {loading&&<div className="mt-12 text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin"/></div>}
      {error&&<div className="mt-8 flex items-center gap-3 text-red-400 bg-ironworks2 border border-ironworks3 rounded-sm p-4"><AlertCircle size={20}/><span>{error==="Order not found"?"Order not found. Check the ID and try again.":error}</span></div>}
      {order&&(
        <div className="space-y-6">
          {order.status!=="cancelled"&&(
            <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-6">
              <div className="font-mono text-xs tracking-widest text-amber mb-6">STATUS</div>
              <div className="space-y-4">
                {STEPS.map(step=>{
                  const idx=STATUS_ORDER.indexOf(step.key);
                  const done=idx<currentStep;const active=idx===currentStep;
                  return(
                    <div key={step.key} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done||active?"bg-amber":"bg-ironworks3"}`}>
                        <CheckCircle2 size={16} color={done||active?"#0f0f10":"#5a5a5e"}/>
                      </div>
                      <div className={`text-sm font-medium ${active?"text-amber":done?"text-bone/60":"text-bone/30"}`}>
                        {step.label}{active&&<span className="ml-2 font-mono text-xs text-amber">← current</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {order.tracking_number&&(
            <div className="bg-ironworks2 border border-amber rounded-sm p-5">
              <div className="font-mono text-xs tracking-widest text-amber mb-2">TRACKING</div>
              <div className="font-display font-bold text-xl">{order.tracking_number}</div>
              <div className="font-mono text-xs text-steel mt-1">{order.shipping_service||"USPS"}</div>
            </div>
          )}
          <div className="bg-ironworks2 border border-ironworks3 rounded-sm p-5">
            <div className="font-mono text-xs tracking-widest text-steel mb-3">{new Date(order.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{order.customer_name}</div>
                <div className="font-mono text-xs text-steel mt-1">{order.item_count} part{order.item_count!==1?"s":""}</div>
              </div>
              <div className="font-display font-bold text-xl text-amber">${order.total?.toFixed(2)}</div>
            </div>
          </div>
          <p className="text-bone/50 text-sm text-center">Questions? Email <a href="mailto:info@dragline3d.com" className="text-amber hover:underline">info@dragline3d.com</a></p>
        </div>
      )}
    </div>
  );
}

