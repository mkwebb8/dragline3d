export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";

function supabase(path:string,opts:RequestInit={}){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
}

export async function PATCH(request:Request,{params}:{params:{plateId:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const{status}=await request.json();
  const r=await supabase(`plates?id=eq.${params.plateId}`,{method:"PATCH",body:JSON.stringify({status,updated_at:new Date().toISOString()})});
  if(!r.ok)return Response.json({error:"Failed to update plate"},{status:500});
  const[plate]=await r.json();
  return Response.json(plate);
}

export async function DELETE(request:Request,{params}:{params:{plateId:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const r=await supabase(`plates?id=eq.${params.plateId}`,{method:"DELETE"});
  if(!r.ok)return Response.json({error:"Failed to delete plate"},{status:500});
  return Response.json({ok:true});
}
