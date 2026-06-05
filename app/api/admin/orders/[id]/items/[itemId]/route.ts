export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";
export async function PATCH(request:Request,{params}:{params:{id:string,itemId:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  const allowed=["completed","part_status","print_hours","printed_qty"];
  const updates:Record<string,any>={};
  for(const k of allowed)if(body[k]!==undefined)updates[k]=body[k];
  // Keep completed in sync with part_status
  if(updates.part_status==="completed")updates.completed=true;
  else if(updates.part_status&&updates.part_status!=="completed")updates.completed=false;
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  const r=await fetch(`${url}/rest/v1/order_items?id=eq.${params.itemId}`,{
    method:"PATCH",
    headers:{apikey:key!,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},
    body:JSON.stringify(updates),
  });
  if(!r.ok)return Response.json({error:"Update failed"},{status:500});
  const[item]=await r.json();
  return Response.json(item);
}
