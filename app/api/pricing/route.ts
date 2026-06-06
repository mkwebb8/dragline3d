export const runtime="edge";

export async function GET(){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)return Response.json({error:"Not configured"},{status:503});
  const r=await fetch(`${url}/rest/v1/material_pricing?select=material,cost_per_kg&order=material.asc`,{
    headers:{apikey:key,Authorization:`Bearer ${key}`}
  });
  if(!r.ok)return Response.json({error:"Failed"},{status:500});
  const rows=await r.json();
  const map:Record<string,number>={};
  for(const row of rows)map[row.material]=Number(row.cost_per_kg);
  return Response.json(map,{headers:{"Cache-Control":"public, max-age=60"}});
}
