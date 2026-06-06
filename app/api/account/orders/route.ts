export const runtime="edge";

function supabase(path:string,opts:RequestInit={}){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
}

export async function GET(request:Request){
  const{searchParams}=new URL(request.url);
  const email=searchParams.get("email");
  if(!email)return Response.json({error:"Email required"},{status:400});
  const r=await supabase(`orders?customer_email=eq.${encodeURIComponent(email)}&select=*,order_items(*)&order=created_at.desc`);
  if(!r.ok)return Response.json({error:"Failed to fetch orders"},{status:500});
  return Response.json(await r.json());
}
