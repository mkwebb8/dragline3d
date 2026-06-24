function supabase(path:string,opts:RequestInit={}){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  return fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
}

export async function GET(request:Request, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  const{searchParams}=new URL(request.url);
  const email=searchParams.get("email");
  if(!email)return Response.json({error:"Email required"},{status:400});
  const r=await supabase(`orders?id=eq.${params.id}&customer_email=eq.${encodeURIComponent(email)}&select=*,order_items(*)`);
  if(!r.ok)return Response.json({error:"Failed to fetch order"},{status:500});
  const rows=await r.json();
  if(!rows.length)return Response.json({error:"Order not found"},{status:404});
  return Response.json(rows[0]);
}
