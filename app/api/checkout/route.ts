export const runtime = "edge";
const MATERIALS = {
  PLA:{costPerKg:22,density:1.24},PETG:{costPerKg:28,density:1.27},TPU:{costPerKg:38,density:1.21},
  ABS:{costPerKg:25,density:1.04},ASA:{costPerKg:32,density:1.07},PC:{costPerKg:48,density:1.20},
  PA:{costPerKg:55,density:1.14},"PLA-CF":{costPerKg:65,density:1.30},"PETG-CF":{costPerKg:70,density:1.31},"PA-CF":{costPerKg:95,density:1.18},
};
const QUALITIES={draft:{mult:0.7},standard:{mult:1.0},fine:{mult:1.6}};
function computePrice(volumeMm3,material,quality,infill){
  const mat=MATERIALS[material];const q=QUALITIES[quality];
  if(!mat||!q)return null;
  const grams=(volumeMm3/1000)*mat.density*(0.12+(1-0.12)*(infill/100));
  const hours=(grams/10)*q.mult;
  return Math.max(8,Math.round(((grams/1000)*mat.costPerKg*2.5+hours*0.20+4)*1.08*100)/100);
}
export async function POST(request) {
  const body = await request.json();
  const {volumeMm3,material,quality,infill,fileName}=body;
  if(!MATERIALS[material]||!QUALITIES[quality])return Response.json({error:"Invalid params"},{status:400});
  const price=computePrice(volumeMm3,material,quality,infill);
  const name=`${(fileName||"Custom part").slice(0,60)} - ${material} - ${quality}`;
  const squareBody={
    idempotency_key:crypto.randomUUID(),
    quick_pay:{name,price_money:{amount:Math.round(price*100),currency:"USD"},location_id:process.env.SQUARE_LOCATION_ID},
    checkout_options:{redirect_url:"https://dragline3d.com/order-confirmed",ask_for_shipping_address:true},
  };
  const resp=await fetch("https://connect.squareup.com/v2/online-checkout/payment-links",{
    method:"POST",
    headers:{"Square-Version":"2026-01-22","Authorization":`Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,"Content-Type":"application/json"},
    body:JSON.stringify(squareBody),
  });
  const data=await resp.json();
  if(!resp.ok)return Response.json({error:"Payment provider error"},{status:502});
  return Response.json({url:data.payment_link?.url,price});
}

