import{verifyAdminToken}from "@/lib/adminAuth";

function sb(path:string,opts:RequestInit={}){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
}

export async function GET(request:Request){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const r=await sb("material_pricing?select=*&order=material.asc");
  if(!r.ok)return Response.json({error:"Failed"},{status:500});
  return Response.json(await r.json());
}

export async function PATCH(request:Request){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const{material,cost_per_kg}=await request.json();
  const r=await sb(`material_pricing?material=eq.${material}`,{method:"PATCH",body:JSON.stringify({cost_per_kg,updated_at:new Date().toISOString()})});
  if(!r.ok)return Response.json({error:"Failed"},{status:500});
  return Response.json({ok:true});
}
