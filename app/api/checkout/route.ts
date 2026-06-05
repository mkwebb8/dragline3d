export const runtime = "edge";
import { createOrder } from "@/lib/db";
const MATERIALS: Record<string, { costPerKg: number; density: number }> = {
  PLA:{costPerKg:16,density:1.24},PCTG:{costPerKg:29.95,density:1.27},TPU:{costPerKg:24,density:1.21},
  ABS:{costPerKg:20,density:1.04},ASA:{costPerKg:22,density:1.07},"PET-GF15":{costPerKg:30,density:1.45},
  "PETG-ESD":{costPerKg:66,density:1.27},PA:{costPerKg:35,density:1.14},
  "ASA-CF":{costPerKg:40,density:1.11},"PETG-CF":{costPerKg:40,density:1.31},"PA-CF":{costPerKg:80,density:1.18},
};
const QUALITIES:Record<string,{mult:number}>={draft:{mult:0.7},fast:{mult:0.85},standard:{mult:1.0},fine:{mult:1.6}};
const TAX_RATE=0.06;
function computePrice(volumeMm3:number,material:string,quality:string,infill:number){
  const mat=MATERIALS[material];const q=QUALITIES[quality];
  if(!mat||!q)return null;
  const grams=(volumeMm3/1000)*mat.density*(0.12+(1-0.12)*(infill/100));
  const hours=(grams/10)*q.mult;
  return Math.max(8,Math.round(((grams/1000)*mat.costPerKg*2.5+hours*0.50+12)*100)/100);
}
export async function POST(request:Request){
  const body=await request.json();
  const{items,shippingCost,shippingLabel,customerEmail,customerName,address,city,state,zip}=body;
  const locationId=process.env.SQUARE_LOCATION_ID;
  const accessToken=process.env.SQUARE_ACCESS_TOKEN;
  if(!locationId||!accessToken)return Response.json({error:"Square not configured"},{status:503});
  const orderId=`DL-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const lineItems:any[]=[];
  const dbItems:any[]=[];
  if(items&&Array.isArray(items)){
    for(const item of items){
      const price=item.price||computePrice(item.volumeMm3,item.material,item.quality,item.infill)||8;
      const qty=item.qty||1;
      lineItems.push({
        name:`${item.fileName.replace(/\.(stl|3mf)$/i,"")} - ${item.material} ${item.quality} ${item.infill}%`,
        quantity:String(qty),
        base_price_money:{amount:Math.round(price*100),currency:"USD"},
      });
      dbItems.push({file_name:item.fileName,material:item.material,quality:item.quality,infill:item.infill,grams:item.grams,hours:item.hours,price,qty});
    }
  }
  const subtotal=dbItems.reduce((s:number,i:any)=>s+i.price*i.qty,0);
  const taxAmount=Math.round(subtotal*TAX_RATE*100)/100;
  const shipping=shippingCost||0;
  lineItems.push({name:"KY Sales Tax (6%)",quantity:"1",base_price_money:{amount:Math.round(taxAmount*100),currency:"USD"}});
  if(shipping>0){
    lineItems.push({name:`Shipping - ${shippingLabel||"USPS"}`,quantity:"1",base_price_money:{amount:Math.round(shipping*100),currency:"USD"}});
  }
  const total=subtotal+taxAmount+shipping;
  const squareBody={
    idempotency_key:crypto.randomUUID(),
    order:{location_id:locationId,line_items:lineItems},
    checkout_options:{redirect_url:`https://dragline3d.com/order-confirmed?id=${orderId}`,ask_for_shipping_address:false,merchant_support_email:"info@dragline3d.com"},
    pre_populated_data:{buyer_email:customerEmail||""},
    payment_note:`Dragline 3D order ${orderId}`,
  };
  const resp=await fetch("https://connect.squareup.com/v2/online-checkout/payment-links",{
    method:"POST",
    headers:{"Square-Version":"2026-01-22","Authorization":`Bearer ${accessToken}`,"Content-Type":"application/json"},
    body:JSON.stringify(squareBody),
  });
  const data=await resp.json();
  if(!resp.ok){
    console.error("Square error:",JSON.stringify(data));
    return Response.json({error:"Payment provider error",square_error:data},{status:502});
  }
  createOrder({
    id:orderId,square_payment_link_id:data.payment_link?.id,
    customer_name:customerName||"",customer_email:customerEmail||"",
    address:address||"",city:city||"",state:state||"",zip:zip||"",
    shipping_service:shippingLabel||"",shipping_cost:shipping,subtotal,total,status:"pending",items:dbItems,
  } as any).then(()=>console.log("Order saved:",orderId)).catch((e:Error)=>console.error("DB error:",e.message));
}
