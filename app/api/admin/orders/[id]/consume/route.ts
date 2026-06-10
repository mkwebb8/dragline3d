// app/api/admin/orders/[id]/consume/route.ts
// Manual trigger — also called automatically via the [id]/route.ts PATCH when status → "printing"
export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";
import{getOrder}from "@/lib/db";

const SB_URL=process.env.SUPABASE_URL!;
const SB_KEY=process.env.SUPABASE_SERVICE_KEY!;
const h={apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,"Content-Type":"application/json",Prefer:"return=representation"};

export async function POST(request:Request,{params}:{params:{id:string}}){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const ord=await getOrder(params.id);
  if(!ord)return Response.json({error:"Order not found"},{status:404});
  if(ord.inventory_consumed)return Response.json({ok:true,skipped:true,reason:"Already consumed"});

  const items:Array<{material?:string;grams?:number;qty?:number}>=ord.order_items||[];
  const log:string[]=[];

  for(const item of items){
    const mat=item.material||"PLA";
    let need=(item.grams||0)*(item.qty||1);
    if(need<=0)continue;
    const sr=await fetch(`${SB_URL}/rest/v1/inventory?material=eq.${encodeURIComponent(mat)}&weight_remaining_g=gt.0&order=created_at.asc`,{headers:h});
    const spools:Array<{id:string;weight_remaining_g:number}>=await sr.json();
    for(const s of spools){
      if(need<=0)break;
      const deduct=Math.min(s.weight_remaining_g,need);
      await fetch(`${SB_URL}/rest/v1/inventory?id=eq.${s.id}`,{method:"PATCH",headers:h,body:JSON.stringify({weight_remaining_g:Math.max(0,s.weight_remaining_g-deduct)})});
      log.push(`${mat}: −${deduct.toFixed(0)}g from spool ${s.id} (${Math.max(0,s.weight_remaining_g-deduct).toFixed(0)}g left)`);
      need-=deduct;
    }
    if(need>0)log.push(`⚠ ${mat}: ${need.toFixed(0)}g short — no spools remaining`);
  }

  await fetch(`${SB_URL}/rest/v1/orders?id=eq.${params.id}`,{method:"PATCH",headers:h,body:JSON.stringify({inventory_consumed:true})});
  return Response.json({ok:true,log});
}
