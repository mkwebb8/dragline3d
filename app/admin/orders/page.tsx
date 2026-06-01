"use client";
import{useEffect,useState,useCallback}from "react";
import{useRouter}from "next/navigation";
import Link from "next/link";
import{DraglineMark}from "@/components/DraglineMark";
import{LogOut,RefreshCw,ExternalLink}from "lucide-react";
const STATUS_LABELS:Record<string,string>={pending:"Payment Pending",received:"Order Received",queued:"In Queue",printing:"Printing",quality_check:"Quality Check",shipped:"Shipped",delivered:"Delivered",cancelled:"Cancelled"};
const STATUS_COLORS:Record<string,string>={pending:"#6b7280",received:"#3b82f6",queued:"#f59e0b",printing:"#f97316",quality_check:"#a855f7",shipped:"#22c55e",delivered:"#16a34a",cancelled:"#ef4444"};
export default function AdminOrders(){
  const[orders,setOrders]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState("all");
  const router=useRouter();
  const fetchOrders=useCallback(async()=>{
    const token=localStorage.getItem("dragline_admin_token");
    if(!token){router.push("/admin/login");return;}
    setLoading(true);
    const url=filter==="all"?"/api/admin/orders":`/api/admin/orders?status=${filter}`;
    const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
    if(res.status===401){router.push("/admin/login");return;}
    setOrders(await res.json());
    setLoading(false);
  },[filter,router]);
  useEffect(()=>{fetchOrders();},[fetchOrders]);
  function logout(){localStorage.removeItem("dragline_admin_token");router.push("/admin/login");}
  const FILTERS=["all","received","queued","printing","quality_check","shipped"];
  return(
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <DraglineMark size={36}/>
          <div>
            <div className="font-display font-extrabold text-xl">Order Queue</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchOrders} className="p-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone transition-colors"><RefreshCw size={16}/></button>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone text-sm transition-colors"><LogOut size={14}/> Logout</button>
        </div>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-3 py-1.5 rounded-sm font-mono text-xs tracking-wide transition-colors ${filter===f?"bg-amber text-ironworks":"border border-ironworks3 text-bone/60 hover:text-bone"}`}>
            {f==="all"?"ALL":STATUS_LABELS[f]?.toUpperCase()}
          </button>
        ))}
      </div>
      {loading?(
        <div className="text-center py-20"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin"/></div>
      ):orders.length===0?(
        <div className="text-center py-20 text-bone/40">
          <div className="font-display text-2xl mb-2">No orders</div>
          <div className="font-mono text-xs">Orders appear here when customers checkout</div>
        </div>
      ):(
        <div className="space-y-2">
          {orders.map(order=>(
            <Link key={order.id} href={`/admin/orders/${order.id}`}
              className="block bg-ironworks2 border border-ironworks3 rounded-sm p-4 hover:border-amber/40 transition-colors group">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-xs text-amber font-bold">{order.id}</div>
                  <div className="font-medium text-sm mt-0.5">{order.customer_name}</div>
                  <div className="font-mono text-xs text-steel">{order.customer_email}</div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-display font-bold text-lg text-amber">${order.total?.toFixed(2)}</div>
                    <div className="font-mono text-xs text-steel">{new Date(order.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-sm text-xs font-mono font-bold"
                    style={{background:`${STATUS_COLORS[order.status]}22`,color:STATUS_COLORS[order.status]}}>
                    {STATUS_LABELS[order.status]}
                  </div>
                  <ExternalLink size={14} className="text-bone/30 group-hover:text-bone/60 transition-colors"/>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
