"use client";
import{useEffect,useState,useCallback}from "react";
import{useRouter}from "next/navigation";
import Link from "next/link";
import{RefreshCw,Clock,CheckCircle2,Circle,Scissors,Printer,PlayCircle,Thermometer,Layers,List,Minus,Plus}from "lucide-react";

const PART_STATUSES=[
  {value:"pending",label:"Pending",color:"#6b7280"},
  {value:"sliced",label:"Sliced",color:"#3b82f6"},
  {value:"sent_to_printer",label:"Sent to Printer",color:"#f59e0b"},
  {value:"printing",label:"Printing",color:"#f97316"},
  {value:"completed",label:"Completed",color:"#22c55e"},
];

const STATUS_ICONS:Record<string,any>={
  pending:Circle,sliced:Scissors,sent_to_printer:Printer,printing:PlayCircle,completed:CheckCircle2,
};

function formatHours(h:number){
  const hrs=Math.floor(h);const mins=Math.round((h-hrs)*60);
  if(hrs>0)return`${hrs}h ${mins}m`;return`${mins}m`;
}

function formatDuration(seconds:number){
  const h=Math.floor(seconds/3600);const m=Math.floor((seconds%3600)/60);
  if(h>0)return`${h}h ${m}m`;return`${m}m`;
}

function PrinterWidget({token}:{token:string}){
  const[data,setData]=useState<any>(null);
  const[error,setError]=useState(false);
  const fetchPrinter=useCallback(async()=>{
    try{
      const res=await fetch("/api/printer",{headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok){setError(true);return;}
      setData(await res.json());setError(false);
    }catch{setError(true);}
  },[token]);
  useEffect(()=>{fetchPrinter();const interval=setInterval(fetchPrinter,10000);return()=>clearInterval(interval);},[fetchPrinter]);
  if(error||!data)return(
    <div className="mb-6 rounded-sm border border-ironworks3 bg-ironworks2 p-4 flex items-center gap-3">
      <Printer size={16} className="text-steel"/>
      <span className="font-mono text-xs text-steel">PRINTER OFFLINE</span>
    </div>
  );
  const stats=data.print_stats;const vsd=data.virtual_sdcard;const bed=data.heater_bed;const extruder=data.extruder;
  const state:string=stats?.state||"standby";const progress=vsd?.progress||0;const elapsed=stats?.print_duration||0;
  const eta=progress>0.01?(elapsed/progress-elapsed):0;
  const filename=stats?.filename?.split("/").pop()?.replace(".gcode","")||"";
  const isActive=state==="printing";
  return(
    <div className="mb-6 rounded-sm border border-ironworks3 bg-ironworks2 overflow-hidden">
      <div className="px-4 py-3 border-b border-ironworks3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer size={14} className={isActive?"text-amber":"text-steel"}/>
          <span className="font-mono text-xs tracking-widest font-bold">K2 PLUS</span>
          <span className={`px-2 py-0.5 rounded-sm font-mono text-xs font-bold ${isActive?"bg-orange-500/20 text-orange-400":"bg-ironworks3 text-steel"}`}>{state.toUpperCase()}</span>
        </div>
        {isActive&&filename&&<span className="font-mono text-xs text-steel truncate max-w-xs">{filename}</span>}
      </div>
      {isActive&&(
        <div className="p-4">
          <div className="mb-3">
            <div className="flex justify-between font-mono text-xs mb-1.5">
              <span className="text-bone/60">Progress</span>
              <span className="text-amber font-bold">{(progress*100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-ironworks3 rounded-full overflow-hidden">
              <div className="h-full bg-amber transition-all duration-1000 rounded-full" style={{width:`${progress*100}%`}}/>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-ironworks rounded-sm p-3"><div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Clock size={10}/> Elapsed</div><div className="font-display font-bold text-sm">{formatDuration(elapsed)}</div></div>
            <div className="bg-ironworks rounded-sm p-3"><div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Clock size={10}/> Remaining</div><div className="font-display font-bold text-sm">{eta>0?formatDuration(eta):"—"}</div></div>
            <div className="bg-ironworks rounded-sm p-3"><div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Thermometer size={10}/> Nozzle</div><div className="font-display font-bold text-sm">{extruder?.temperature?.toFixed(0)}°<span className="text-steel text-xs">/{extruder?.target?.toFixed(0)}°</span></div></div>
            <div className="bg-ironworks rounded-sm p-3"><div className="font-mono text-xs text-steel mb-1 flex items-center gap-1"><Thermometer size={10}/> Bed</div><div className="font-display font-bold text-sm">{bed?.temperature?.toFixed(0)}°<span className="text-steel text-xs">/{bed?.target?.toFixed(0)}°</span></div></div>
          </div>
          {vsd?.layer>0&&<div className="mt-2 font-mono text-xs text-steel flex items-center gap-1"><Layers size={10}/> Layer {vsd.layer} · Z {stats?.z_pos?.toFixed(2)}mm</div>}
        </div>
      )}
      {!isActive&&(
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          <div className="font-mono text-xs text-steel flex items-center gap-1.5"><Thermometer size={10}/> Nozzle: {extruder?.temperature?.toFixed(0)}°C</div>
          <div className="font-mono text-xs text-steel flex items-center gap-1.5"><Thermometer size={10}/> Bed: {bed?.temperature?.toFixed(0)}°C</div>
        </div>
      )}
    </div>
  );
}

export default function PartsPage(){
  const[parts,setParts]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[token,setToken]=useState("");
  const[editingHours,setEditingHours]=useState<Record<string,string>>({});
  const[editingGrams,setEditingGrams]=useState<Record<string,string>>({});
  const[saving,setSaving]=useState<Record<string,boolean>>({});
  const router=useRouter();

  const fetchParts=useCallback(async()=>{
    const t=localStorage.getItem("dragline_admin_token");
    if(!t){router.push("/admin/login");return;}
    setToken(t);setLoading(true);
    const res=await fetch("/api/admin/orders?status=queued",{headers:{Authorization:`Bearer ${t}`}});
    const queued=res.ok?await res.json():[];
    const res2=await fetch("/api/admin/orders?status=printing",{headers:{Authorization:`Bearer ${t}`}});
    const printing=res2.ok?await res2.json():[];
    const res3=await fetch("/api/admin/orders?status=received",{headers:{Authorization:`Bearer ${t}`}});
    const received=res3.ok?await res3.json():[];
    const allOrders=[...received,...queued,...printing].sort((a:any,b:any)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
    const flatParts=allOrders.flatMap((o:any)=>(o.order_items||[]).map((i:any)=>({...i,order_id:o.id,order_status:o.status,customer_name:o.customer_name,order_created_at:o.created_at})));
    setParts(flatParts);setLoading(false);
  },[router]);

  useEffect(()=>{fetchParts();},[fetchParts]);

  async function updatePart(itemId:string,updates:Record<string,any>){
    setSaving(s=>({...s,[itemId]:true}));
    await fetch(`/api/admin/orders/${parts.find(p=>p.id===itemId)?.order_id}/items/${itemId}`,{
      method:"PATCH",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify(updates),
    });
    setParts(prev=>prev.map(p=>{
      if(p.id!==itemId)return p;
      const updated={...p,...updates};
      if(updates.part_status==="completed")updated.completed=true;
      else if(updates.part_status&&updates.part_status!=="completed")updated.completed=false;
      return updated;
    }));
    setSaving(s=>({...s,[itemId]:false}));
  }

  async function updatePrintedQty(itemId:string,delta:number){
    const part=parts.find(p=>p.id===itemId);
    if(!part)return;
    const qty=part.qty||1;
    const current=part.printed_qty||0;
    const next=Math.max(0,Math.min(qty,current+delta));
    if(next===current)return;
    const updates:Record<string,any>={printed_qty:next};
    if(next>=qty){updates.part_status="completed";updates.completed=true;}
    else if(part.part_status==="completed"){updates.part_status="printing";updates.completed=false;}
    await updatePart(itemId,updates);
  }

  async function saveHours(itemId:string){
    const val=parseFloat(editingHours[itemId]);
    if(isNaN(val)||val<=0)return;
    await updatePart(itemId,{print_hours:val});
    setEditingHours(s=>({...s,[itemId]:""}));
  }

  async function saveGrams(itemId:string){
    const val=parseFloat(editingGrams[itemId]);
    if(isNaN(val)||val<=0)return;
    await updatePart(itemId,{grams:val});
    setEditingGrams(s=>({...s,[itemId]:""}));
  }

  const incompleteParts=parts.filter(p=>!p.completed);
  const backlogHours=incompleteParts.reduce((s,p)=>s+(p.print_hours||p.hours||0)*(p.qty||1),0);
  const statusGroups=PART_STATUSES.map(s=>({...s,parts:parts.filter(p=>(p.part_status||"pending")===s.value&&!p.completed)}));
  const completedParts=parts.filter(p=>p.completed);

  if(loading)return<div className="max-w-5xl mx-auto px-6 py-16 text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin"/></div>;

  return(
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-display font-extrabold text-xl">Parts Queue</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D · FIFO</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchParts} className="p-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone transition-colors"><RefreshCw size={16}/></button>
          <Link href="/admin/orders" className="flex items-center gap-2 px-3 py-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone text-sm transition-colors font-mono text-xs"><List size={14}/>ORDER QUEUE</Link>
        </div>
      </div>

      {token&&<PrinterWidget token={token}/>}

      {backlogHours>0&&(
        <div className="mb-6 px-4 py-3 bg-ironworks2 border border-ironworks3 rounded-sm flex items-center gap-3">
          <Clock size={14} className="text-amber"/>
          <span className="font-mono text-xs text-steel">PRINT BACKLOG</span>
          <span className="font-mono text-xs font-bold text-amber">~{formatHours(backlogHours)}</span>
          <span className="font-mono text-xs text-steel">across {incompleteParts.length} line{incompleteParts.length!==1?"s":""} · {incompleteParts.reduce((s,p)=>s+(p.qty||1),0)} pcs</span>
        </div>
      )}

      {parts.length===0&&(
        <div className="text-center py-20 text-bone/40">
          <div className="font-display text-2xl mb-2">No active parts</div>
          <div className="font-mono text-xs">Parts from queued and printing orders appear here</div>
        </div>
      )}

      {statusGroups.filter(g=>g.parts.length>0).map(group=>(
        <div key={group.value} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{background:group.color}}/>
            <div className="font-mono text-xs tracking-widest" style={{color:group.color}}>{group.label.toUpperCase()}</div>
            <div className="font-mono text-xs text-steel">({group.parts.length})</div>
          </div>
          <div className="space-y-2">
            {group.parts.map(part=>{
              const effectiveHours=part.print_hours||part.hours||0;
              const qty=part.qty||1;
              const printedQty=part.printed_qty||0;
              const hasMultiple=qty>1;
              return(
                <div key={part.id} className="bg-ironworks2 border border-ironworks3 rounded-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {hasMultiple&&<span className="font-mono text-xs font-bold text-amber">{qty}×</span>}
                        <div className="font-medium text-sm truncate">{part.file_name}</div>
                        {part.print_hours&&<span className="font-mono text-xs text-amber bg-amber/10 px-1.5 py-0.5 rounded-sm">custom time</span>}
                        {editingGrams[part.id]===undefined&&part.grams&&<span className="font-mono text-xs text-steel/50 bg-ironworks px-1.5 py-0.5 rounded-sm">{part.grams}g ea</span>}
                      </div>
                      <div className="font-mono text-xs text-steel mb-2">
                        {part.material} · {part.color||"Midnight Black"} · {part.quality} · {part.infill}% · {formatHours(effectiveHours)} ea
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/orders/${part.order_id}`} className="font-mono text-xs text-amber hover:underline">{part.order_id}</Link>
                        <span className="font-mono text-xs text-steel">·</span>
                        <span className="font-mono text-xs text-steel">{part.customer_name}</span>
                        <span className="font-mono text-xs text-steel">·</span>
                        <span className="font-mono text-xs text-steel capitalize px-1.5 py-0.5 rounded-sm bg-ironworks border border-ironworks3">{part.order_status}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {hasMultiple&&(
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-steel">printed:</span>
                          <button onClick={()=>updatePrintedQty(part.id,-1)} disabled={saving[part.id]||printedQty<=0} className="w-6 h-6 rounded-sm border border-ironworks3 bg-ironworks flex items-center justify-center hover:border-amber transition-colors disabled:opacity-30"><Minus size={10}/></button>
                          <span className={`font-mono text-sm font-bold w-8 text-center ${printedQty>=qty?"text-green-400":"text-amber"}`}>{printedQty}/{qty}</span>
                          <button onClick={()=>updatePrintedQty(part.id,1)} disabled={saving[part.id]||printedQty>=qty} className="w-6 h-6 rounded-sm border border-ironworks3 bg-ironworks flex items-center justify-center hover:border-amber transition-colors disabled:opacity-30"><Plus size={10}/></button>
                        </div>
                      )}
                      {/* Grams editor */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-steel">g:</span>
                        <input type="number" step="0.1" min="0.1" placeholder={`${Number(part.grams||0).toFixed(1)}`} value={editingGrams[part.id]||""} onChange={e=>setEditingGrams(s=>({...s,[part.id]:e.target.value}))} className="w-20 px-2 py-1 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-xs font-mono"/>
                        {editingGrams[part.id]&&<button onClick={()=>saveGrams(part.id)} className="px-2 py-1 text-xs font-mono bg-amber text-ironworks rounded-sm">save</button>}
                      </div>
                      {/* Hours editor */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-steel">h:</span>
                        <input type="number" step="0.1" min="0.1" placeholder={`${effectiveHours.toFixed(1)}`} value={editingHours[part.id]||""} onChange={e=>setEditingHours(s=>({...s,[part.id]:e.target.value}))} className="w-20 px-2 py-1 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-xs font-mono"/>
                        {editingHours[part.id]&&<button onClick={()=>saveHours(part.id)} className="px-2 py-1 text-xs font-mono bg-amber text-ironworks rounded-sm">save</button>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ironworks3">
                    {PART_STATUSES.map(s=>(
                      <button key={s.value} disabled={saving[part.id]} onClick={()=>updatePart(part.id,{part_status:s.value})}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono border transition-colors ${(part.part_status||"pending")===s.value?"border-current font-bold":"border-ironworks3 text-steel hover:border-bone/40"}`}
                        style={(part.part_status||"pending")===s.value?{color:s.color,borderColor:s.color,background:`${s.color}15`}:{}}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {completedParts.length>0&&(
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"/>
            <div className="font-mono text-xs tracking-widest text-green-500">COMPLETED</div>
            <div className="font-mono text-xs text-steel">({completedParts.length})</div>
          </div>
          <div className="space-y-2 opacity-50">
            {completedParts.map(part=>(
              <div key={part.id} className="bg-ironworks2 border border-ironworks3 rounded-sm px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 size={16} className="text-green-400 flex-shrink-0"/>
                  <div>
                    <div className="font-medium text-sm line-through text-steel truncate">
                      {(part.qty||1)>1&&<span className="mr-1">{part.qty}×</span>}{part.file_name}
                    </div>
                    <div className="font-mono text-xs text-steel">{part.material} · {part.quality} · {part.order_id}</div>
                  </div>
                </div>
                <button onClick={()=>updatePart(part.id,{part_status:"printing",completed:false,printed_qty:0})} className="text-xs font-mono text-steel hover:text-bone border border-ironworks3 px-2 py-1 rounded-sm">undo</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
