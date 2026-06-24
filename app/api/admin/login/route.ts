export async function POST(request:Request){
  const{username,password}=await request.json();
  const adminUsername=process.env.ADMIN_USERNAME;
  const adminPassword=process.env.ADMIN_PASSWORD;
  const secret=process.env.ADMIN_SECRET||"dragline-admin-secret";
  if(!adminPassword||password!==adminPassword||!adminUsername||username!==adminUsername)return Response.json({error:"Invalid credentials"},{status:401});
  const payload=JSON.stringify({ts:Date.now(),role:"admin"});
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,enc.encode(payload));
  const sigB64=btoa(String.fromCharCode(...new Uint8Array(sig)));
  const token=`${btoa(payload)}.${sigB64}`;
  return Response.json({token});
}
