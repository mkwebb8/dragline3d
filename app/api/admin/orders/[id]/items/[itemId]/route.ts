export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";

function sb(path:string,opts:RequestInit={}){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
}

export async function PATCH(request:Request,{params}:{params:{id:string,itemId:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  const allowed=["completed","part_status","print_hours","printed_qty","grams","runs"];
  const updates:Record<string,any>={};
  for(const k of allowed)if(body[k]!==undefined)updates[k]=body[k];

  // Keep completed in sync with part_status
  if(updates.part_status==="completed")updates.completed=true;
  else if(updates.part_status&&updates.part_status!=="completed")updates.completed=false;

  // Update the item
  const r=await sb(`order_items?id=eq.${params.itemId}`,{method:"PATCH",body:JSON.stringify(updates)});
  if(!r.ok)return Response.json({error:"Update failed"},{status:500});
  const[item]=await r.json();

  // Auto-deduct filament inventory when part is completed
  if(updates.part_status==="completed"||updates.completed===true){
    try{
      const gramsToDeduct=(item.grams||0)*(item.qty||1);
      const material=item.material;
      if(gramsToDeduct>0&&material){
        // Get oldest spool of this material with remaining stock (FIFO)
        const spoolRes=await sb(`filament_inventory?material=eq.${encodeURIComponent(material)}&weight_remaining_g=gt.0&order=created_at.asc&limit=1`);
        if(spoolRes.ok){
          const spools=await spoolRes.json();
          if(spools.length>0){
            const spool=spools[0];
            const newWeight=Math.max(0,Number(spool.weight_remaining_g)-gramsToDeduct);
            await sb(`filament_inventory?id=eq.${spool.id}`,{
              method:"PATCH",
              body:JSON.stringify({weight_remaining_g:newWeight,updated_at:new Date().toISOString()}),
            });
            console.log(`[inventory] deducted ${gramsToDeduct}g ${material} from spool ${spool.id} → ${newWeight}g remaining`);
          }
        }
      }
    }catch(e:any){console.error("[inventory] deduct error:",e.message);}
  }

  return Response.json(item);
}
