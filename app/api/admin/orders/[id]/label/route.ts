export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";
import{getOrder}from "@/lib/db";
export async function POST(request:Request,{params}:{params:{id:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const{id}=params;
  const{length,width,height,rateId,recipientName}=await request.json();
  const order=await getOrder(id);
  if(!order)return Response.json({error:"Order not found"},{status:404});
  const shippoKey=process.env.SHIPPO_API_KEY;
  if(!shippoKey)return Response.json({error:"Shippo not configured"},{status:500});
  const totalGrams=order.order_items?.reduce((s:number,i:any)=>s+(i.grams||0),0)||0;
  const weightOz=Math.max(1,Math.round((totalGrams/28.35)*10)/10);
  if(rateId&&rateId!=="flat_ground"){
    const txResp=await fetch("https://api.goshippo.com/transactions/",{
      method:"POST",
      headers:{Authorization:`ShippoToken ${shippoKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({rate:rateId,label_file_type:"PDF",async:false}),
    });
    const tx=await txResp.json();
    if(tx.status==="SUCCESS"){
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?id=eq.${id}`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.SUPABASE_SERVICE_KEY}`,"apikey":process.env.SUPABASE_SERVICE_KEY!},
        body:JSON.stringify({tracking_number:tx.tracking_number}),
      });
      return Response.json({label_url:tx.label_url,tracking_number:tx.tracking_number});
    }
    return Response.json({error:tx.messages?.[0]?.text||"Label creation failed"},{status:502});
  }
  const shipment={
    address_from:{
      name:process.env.SHIP_FROM_NAME||"Dragline 3D",
      street1:process.env.SHIP_FROM_STREET||"",
      city:process.env.SHIP_FROM_CITY||"Louisville",
      state:process.env.SHIP_FROM_STATE||"KY",
      zip:process.env.SHIP_FROM_ZIP||"40201",
      country:"US",
    },
    address_to:{name:recipientName||order.customer_name,street1:order.address,city:order.city,state:order.state,zip:order.zip,country:"US"},
    parcels:[{length:String(length),width:String(width),height:String(height),distance_unit:"in",weight:String(weightOz),mass_unit:"oz"}],
    async:false,
  };
  const shipResp=await fetch("https://api.goshippo.com/shipments/",{
    method:"POST",
    headers:{Authorization:`ShippoToken ${shippoKey}`,"Content-Type":"application/json"},
    body:JSON.stringify(shipment),
  });
  const shipData=await shipResp.json();
  if(!shipResp.ok){console.error("Shippo error:",JSON.stringify(shipData));return Response.json({error:"Shippo shipment error",detail:shipData},{status:502});}
  const matchedRate=shipData.rates?.find((r:any)=>
    r.servicelevel?.name===order.shipping_service||r.service===order.shipping_service
  )||shipData.rates?.[0];
  if(!matchedRate)return Response.json({error:"No matching rate found",rates:shipData.rates?.map((r:any)=>r.servicelevel?.name)},{status:404});
  const txResp=await fetch("https://api.goshippo.com/transactions/",{
    method:"POST",
    headers:{Authorization:`ShippoToken ${shippoKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({rate:matchedRate.object_id,label_file_type:"PDF",async:false}),
  });
  const tx=await txResp.json();
  if(tx.status!=="SUCCESS"){console.error("Shippo tx error:",JSON.stringify(tx));return Response.json({error:tx.messages?.[0]?.text||"Label creation failed",detail:tx},{status:502});}
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?id=eq.${id}`,{
    method:"PATCH",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.SUPABASE_SERVICE_KEY}`,"apikey":process.env.SUPABASE_SERVICE_KEY!},
    body:JSON.stringify({tracking_number:tx.tracking_number}),
  });
  return Response.json({label_url:tx.label_url,tracking_number:tx.tracking_number,rate_used:matchedRate.servicelevel?.name,amount:matchedRate.amount});
}
