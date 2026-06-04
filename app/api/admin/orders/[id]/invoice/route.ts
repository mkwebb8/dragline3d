export const runtime="edge";
import{NextRequest,NextResponse}from "next/server";
import{verifyAdminToken}from "@/lib/adminAuth";
import{createClient}from "@supabase/supabase-js";

export async function POST(request:Request,{params}:{params:{id:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const{id}=params;
  const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_KEY!);

  const{data:order}=await supabase.from("orders").select("*").eq("id",id).single();
  if(!order)return Response.json({error:"Order not found"},{status:404});
  const{data:items}=await supabase.from("order_items").select("*").eq("order_id",id);

  const squareRes=await fetch("https://connect.squareup.com/v2/invoices",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,"Square-Version":"2024-01-18"},
    body:JSON.stringify({
      invoice:{
        location_id:process.env.SQUARE_LOCATION_ID,
        order:{
          location_id:process.env.SQUARE_LOCATION_ID,
          reference_id:order.id,
          line_items:[
            ...(items||[]).map((item:any)=>({
              name:item.file_name,
              quantity:"1",
              base_price_money:{amount:Math.round(item.price*100),currency:"USD"},
              note:`${item.material} · ${item.quality} · ${item.infill}% infill`,
            })),
            {name:`Shipping — ${order.shipping_service||"USPS"}`,quantity:"1",base_price_money:{amount:Math.round((order.shipping_cost||0)*100),currency:"USD"}},
          ],
        },
        primary_recipient:{
          email_address:order.customer_email,
          given_name:order.customer_name?.split(" ")[0],
          family_name:order.customer_name?.split(" ").slice(1).join(" "),
          address:{address_line_1:order.address,locality:order.city,administrative_district_level_1:order.state,postal_code:order.zip,country:"US"},
        },
        payment_requests:[{request_type:"BALANCE",due_date:new Date(Date.now()+7*86400000).toISOString().split("T")[0],tipping_enabled:false}],
        delivery_method:"EMAIL",
        invoice_number:order.id,
        title:`Dragline 3D — Order ${order.id}`,
        description:"Custom 3D printing order — dragline3d.com",
        idempotency_key:`invoice-${order.id}`,
      },
    }),
  });
  const squareData=await squareRes.json();
  if(!squareRes.ok||squareData.errors)return Response.json({error:squareData.errors?.[0]?.detail||"Square error"},{status:502});

  const invoice=squareData.invoice;
  const invoiceUrl=`https://squareup.com/pay-invoice/${invoice.id}`;

  await fetch(`https://connect.squareup.com/v2/invoices/${invoice.id}/publish`,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,"Square-Version":"2024-01-18"},
    body:JSON.stringify({version:invoice.version,idempotency_key:`publish-${order.id}`}),
  });

  await supabase.from("orders").update({square_invoice_url:invoiceUrl}).eq("id",id);
  return Response.json({invoice_url:invoiceUrl,invoice_id:invoice.id});
}
