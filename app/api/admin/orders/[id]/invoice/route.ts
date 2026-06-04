export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";
import{getOrder}from "@/lib/db";

export async function POST(request:Request,{params}:{params:{id:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const{id}=params;
  const order=await getOrder(id);
  if(!order)return Response.json({error:"Order not found"},{status:404});

  const subtotal=(order.order_items||[]).reduce((s:number,i:any)=>s+i.price,0);
  const preTax=Math.round((subtotal/1.08)*100)/100;
  const taxAmount=Math.round((subtotal-preTax)*100)/100;

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
            ...(order.order_items||[]).map((item:any)=>({
              name:item.file_name,
              quantity:"1",
              base_price_money:{amount:Math.round((item.price/1.08)*100),currency:"USD"},
              note:`${item.material} · ${item.quality} · ${item.infill}% infill`,
            })),
            {
              name:"KY Sales Tax (6%)",
              quantity:"1",
              base_price_money:{amount:Math.round(taxAmount*100),currency:"USD"},
              note:"Kentucky sales tax on parts",
            },
            {
              name:`Shipping — ${order.shipping_service||"USPS"}`,
              quantity:"1",
              base_price_money:{amount:Math.round((order.shipping_cost||0)*100),currency:"USD"},
              note:"Tax-exempt",
            },
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
        idempotency_key:`invoice-${order.id}-v2`,
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
    body:JSON.stringify({version:invoice.version,idempotency_key:`publish-${order.id}-v2`}),
  });

  await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?id=eq.${id}`,{
    method:"PATCH",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.SUPABASE_SERVICE_KEY}`,"apikey":process.env.SUPABASE_SERVICE_KEY!},
    body:JSON.stringify({square_invoice_url:invoiceUrl}),
  });

  return Response.json({invoice_url:invoiceUrl,invoice_id:invoice.id});
}
