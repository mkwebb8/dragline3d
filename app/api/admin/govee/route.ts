export const runtime="edge";
import{verifyAdminToken}from "@/lib/adminAuth";

export async function GET(request:Request){
  if(!await verifyAdminToken(request))return Response.json({error:"Unauthorized"},{status:401});
  const apiKey=process.env.GOVEE_API_KEY;
  if(!apiKey)return Response.json({error:"Govee not configured"},{status:503});

  try{
    // Get devices
    const devRes=await fetch("https://developer-api.govee.com/v1/devices",{
      headers:{"Govee-API-Key":apiKey}
    });
    if(!devRes.ok)return Response.json({error:"Govee API error"},{status:502});
    const devData=await devRes.json();
    const devices=devData.data?.devices||[];
    const plug=devices.find((d:any)=>d.model==="H5086")||devices[0];
    if(!plug)return Response.json({error:"No device found"},{status:404});

    // Get device state
    const stateRes=await fetch(`https://developer-api.govee.com/v1/devices/state?device=${encodeURIComponent(plug.device)}&model=${plug.model}`,{
      headers:{"Govee-API-Key":apiKey}
    });
    if(!stateRes.ok)return Response.json({error:"State fetch failed"},{status:502});
    const stateData=await stateRes.json();
    const props=stateData.data?.properties||[];

    const onProp=props.find((p:any)=>p.powerState!==undefined);
    const wattsProp=props.find((p:any)=>p.watt!==undefined);
    
    return Response.json({
      device:plug.device,
      model:plug.model,
      name:plug.deviceName,
      on:onProp?.powerState==="on",
      watts:wattsProp?.watt||0,
    });
  }catch(e:any){
    return Response.json({error:e.message},{status:500});
  }
}
