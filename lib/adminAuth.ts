export async function verifyAdminToken(request:Request):Promise<boolean>{
  const h=request.headers.get("authorization");
  if(!h?.startsWith("Bearer "))return false;
  const token=h.slice(7);
  const secret=process.env.ADMIN_SECRET||"dragline-admin-secret";
  try{
    const[payloadB64,sigB64]=token.split(".");
    if(!payloadB64||!sigB64)return false;
    const payload=atob(payloadB64);
    const{ts}=JSON.parse(payload);
    if(Date.now()-ts>30*24*60*60*1000)return false;
    const enc=new TextEncoder();
    const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
    const sigBytes=Uint8Array.from(atob(sigB64),c=>c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC",key,sigBytes,enc.encode(payload));
  }catch{return false;}
}
