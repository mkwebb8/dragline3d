import{verifyAdminToken}from "@/lib/adminAuth";

function supabase(path:string,opts:RequestInit={},env:any={}){
  const url=env.SUPABASE_URL||process.env.SUPABASE_URL;
  const key=env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
}

export async function GET(request:Request){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const r=await supabase("plates?select=*,plate_items(*)&order=created_at.desc");
  if(!r.ok)return Response.json({error:"Failed to fetch plates"},{status:500});
  return Response.json(await r.json());
}

export async function POST(request:Request){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const{name,items}=await request.json();
  if(!name||!items?.length)return Response.json({error:"Name and items required"},{status:400});

  // Create plate
  const pr=await supabase("plates",{method:"POST",body:JSON.stringify({name,status:"pending"})});
  if(!pr.ok)return Response.json({error:"Failed to create plate"},{status:500});
  const[plate]=await pr.json();

  // Create plate items
  const plateItems=items.map((itemId:string)=>({plate_id:plate.id,order_item_id:itemId,qty_on_plate:1}));
  const ir=await supabase("plate_items",{method:"POST",body:JSON.stringify(plateItems)});
  if(!ir.ok)return Response.json({error:"Failed to add items to plate"},{status:500});

  return Response.json(plate);
}
