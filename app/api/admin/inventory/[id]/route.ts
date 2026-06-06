export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";

function sb(path:string,opts:RequestInit={}){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
}

export async function PATCH(request:Request,{params}:{params:{id:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  const r=await sb(`filament_inventory?id=eq.${params.id}`,{method:"PATCH",body:JSON.stringify({...body,updated_at:new Date().toISOString()})});
  if(!r.ok)return Response.json({error:"Failed"},{status:500});
  const[row]=await r.json();return Response.json(row);
}

export async function DELETE(request:Request,{params}:{params:{id:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  await sb(`filament_inventory?id=eq.${params.id}`,{method:"DELETE"});
  return Response.json({ok:true});
}
