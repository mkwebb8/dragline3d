export type OrderStatus = "pending"|"received"|"queued"|"printing"|"quality_check"|"shipped"|"delivered"|"cancelled";
export type OrderItem = { id?:string;order_id?:string;file_name:string;material:string;quality:string;infill:number;grams?:number;hours?:number;price:number;qty?:number;color?:string };
export type Order = { id:string;square_payment_link_id?:string;customer_name:string;customer_email:string;address?:string;city?:string;state?:string;zip?:string;shipping_service?:string;shipping_cost?:number;subtotal?:number;total:number;status:OrderStatus;tracking_number?:string;notes?:string;square_invoice_url?:string;created_at?:string;updated_at?:string;order_items?:OrderItem[] };
function supabase(path:string,opts:RequestInit={}){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
}

export function generateOrderId(){
  const d=new Date().toISOString().slice(0,10).replace(/-/g,"");
  const r=Math.random().toString(36).slice(2,6).toUpperCase();
  return `DL-${d}-${r}`;
}

export async function createOrder(order:any):Promise<Order>{
  const{items,...o}=order;const id=o.id||generateOrderId();
  const resp=await supabase("orders",{method:"POST",body:JSON.stringify({id,...o})});
  if(!resp.ok)throw new Error(await resp.text());
  const[created]=await resp.json();
  if(items?.length){
    const ir=await supabase("order_items",{method:"POST",body:JSON.stringify(items.map((i:any)=>({...i,order_id:id,id:undefined})))});
    if(!ir.ok)throw new Error(await ir.text());
  }
  return created;
}

export async function getOrders(status?:OrderStatus):Promise<Order[]>{
  const f=status?`?status=eq.${status}&order=created_at.desc`:"?order=created_at.desc";
  const r=await supabase(`orders${f}&select=*,order_items(*)`);if(!r.ok)throw new Error(await r.text());return r.json();
}

export async function getOrder(id:string):Promise<Order|null>{
  const r=await supabase(`orders?id=eq.${id}&select=*,order_items(*)`);
  if(!r.ok)throw new Error(await r.text());const rows=await r.json();return rows[0]||null;
}

export async function updateOrder(id:string,updates:any):Promise<Order>{
  const r=await supabase(`orders?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({...updates,updated_at:new Date().toISOString()})});
  if(!r.ok)throw new Error(await r.text());const[u]=await r.json();return u;
}

export const STATUS_LABELS:Record<string,string>={pending:"Payment Pending",received:"Order Received",queued:"In Queue",printing:"Printing",quality_check:"Quality Check",shipped:"Shipped",delivered:"Delivered",cancelled:"Cancelled"};
export const STATUS_COLORS:Record<string,string>={pending:"#6b7280",received:"#3b82f6",queued:"#f59e0b",printing:"#f97316",quality_check:"#a855f7",shipped:"#22c55e",delivered:"#16a34a",cancelled:"#ef4444"};
