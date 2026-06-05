"use client";
import{useEffect,useState,useCallback}from "react";
import{useRouter}from "next/navigation";
import Link from "next/link";
import{ArrowLeft,RefreshCw,Clock,CheckCircle2,Circle,Scissors,Printer,PlayCircle,ChevronDown,ChevronUp}from "lucide-react";

const PART_STATUSES=[
  {value:"pending",label:"Pending",color:"#6b7280"},
  {value:"sliced",label:"Sliced",color:"#3b82f6"},
  {value:"sent_to_printer",label:"Sent to Printer",color:"#f59e0b"},
  {value:"printing",label:"Printing",color:"#f97316"},
  {value:"completed",label:"Completed",color:"#22c55e"},
];

const STATUS_ICONS:Record<string,any>={
  pending:Circle,
  sliced:Scissors,
  sent_to_printer:Printer,
  printing:PlayCircle,
  completed:CheckCircle2,
};

function formatHours(h:number){
  const hrs=Math.floor(h);
  const mins=Math.round((h-hrs)*60);
  if(hrs>0)return`${hrs}h ${mins}m`;
  return`${mins}m`;
}

export default function PartsPage(){
  const[parts,setParts]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[token,setToken]=useState("");
  const[editingHours,setEditingHours]=useState<Record<string,string>>({});
  const[saving,setSaving]=useState<Record<string,boolean>>({});
  const router=useRouter();

  const fetchParts=useCallback(async()=>{
    const t=localStorage.getItem("dragline_admin_token");
    if(!t){router.push("/admin/login");return;}
    setToken(t);
    setLoading(true);
    const res=await fetch("/api/admin/orders?status=queued",{headers:{Authorization:`Bearer ${t}`}});
    const queued=res.ok?await res.json():[];
    const res2=await fetch("/api/admin/orders?status=printing",{headers:{Authorization:`Bearer ${t}`}});
    const printing=res2.ok?await res2.json():[];
    const res3=await fetch("/api/admin/orders?status=received",{headers:{Authorization:`Bearer ${t}`}});
    const received=res3.ok?await res3.json():[];
    // Flatten all items with order context, FIFO by order created_at
    const allOrders=[...received,...queued,...printing].sort((a:any,b:any)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
    const flatParts=allOrders.flatMap((o:any)=>(o.order_items||[]).map((i:any)=>({...i,order_id:o.id,order_status:o.status,customer_name:o.customer_name,order_created_at:o.created_at})));
    setParts(flatParts);
    setLoading(false);
  },[router]);

  useEffect(()=>{fetchParts();},[fetchParts]);

  async function updatePart(itemId:string,updates:Record<string,any>){
    setSaving(s=>({...s,[itemId]:true}));
    await fetch(`/api/admin/orders/${parts.find(p=>p.id===itemId)?.order_id}/items/${itemId}`,{
      method:"PATCH",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify(updates),
    });
    setParts(prev=>prev.map(p=>p.id===itemId?{...p,...updates,completed:updates.part_status==="completed"?true:updates.part_status?false:p.completed}:p));
    setSaving(s=>({...s,[itemId]:false}));
  }

  async function saveHours(itemId:string){
    const val=parseFloat(editingHours[itemId]);
    if(isNaN(val)||val<=0)return;
    await updatePart(itemId,{print_hours:val});
    setEditingHours(s=>({...s,[itemId]:""}));
  }

  const incompleteParts=parts.filter(p=>!p.completed);
  const backlogHours=incompleteParts.reduce((s,p)=>s+(p.print_hours||p.hours||0),0);

  const statusGroups=PART_STATUSES.map(s=>({
    ...s,
    parts:parts.filter(p=>(p.part_status||"pending")===s.value&&!p.completed),
  }));
  const completedParts=parts.filter(p=>p.completed);

  if(loading)return<div className="max-w-5xl mx-auto px-6 py-16 text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin"/></div>;

  return(
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors"><ArrowLeft size={20}/></Link>
          <div>
            <div className="font-display font-extrabold text-xl">Parts Queue</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D · FIFO</div>
          </div>
        </div>
        <button onClick={fetchParts} className="p-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone transition-colors"><RefreshCw size={16}/></button>
      </div>

      {/* Backlog */}
      {backlogHours>0&&(
        <div className="mb-6 px-4 py-3 bg-ironworks2 border border-ironworks3 rounded-sm flex items-center gap-3">
          <Clock size={14} className="text-amber"/>
          <span className="font-mono text-xs text-steel">PRINT BACKLOG</span>
          <span className="font-mono text-xs font-bold text-amber">~{formatHours(backlogHours)}</span>
          <span className="font-mono text-xs text-steel">across {incompleteParts.length} part{incompleteParts.length!==1?"s":""}</span>
        </div>
      )}

      {parts.length===0&&(
        <div className="text-center py-20 text-bone/40">
          <div className="font-display text-2xl mb-2">No active parts</div>
          <div className="font-mono text-xs">Parts from queued and printing orders appear here</div>
        </div>
      )}

      {/* Status groups */}
      {statusGroups.filter(g=>g.parts.length>0).map(group=>(
        <div key={group.value} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{background:group.color}}/>
            <div className="font-mono text-xs tracking-widest" style={{color:group.color}}>{group.label.toUpperCase()}</div>
            <div className="font-mono text-xs text-steel">({group.parts.length})</div>
          </div>
          <div className="space-y-2">
            {group.parts.map(part=>{
              const Icon=STATUS_ICONS[part.part_status||"pending"];
              const effectiveHours=part.print_hours||part.hours||0;
              return(
                <div key={part.id} className="bg-ironworks2 border border-ironworks3 rounded-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-sm truncate">{part.file_name}</div>
                        {part.print_hours&&<span className="font-mono text-xs text-amber bg-amber/10 px-1.5 py-0.5 rounded-sm">custom time</span>}
                      </div>
                      <div className="font-mono text-xs text-steel mb-2">
                        {part.material} · {part.color||"Midnight Black"} · {part.quality} · {part.infill}% · {part.grams}g · {formatHours(effectiveHours)}
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
                      {/* Hours editor */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          placeholder={`${effectiveHours.toFixed(1)}h`}
                          value={editingHours[part.id]||""}
                          onChange={e=>setEditingHours(s=>({...s,[part.id]:e.target.value}))}
                          className="w-20 px-2 py-1 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-xs font-mono"
                        />
                        {editingHours[part.id]&&(
                          <button onClick={()=>saveHours(part.id)} className="px-2 py-1 text-xs font-mono bg-amber text-ironworks rounded-sm">save</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status buttons */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ironworks3">
                    {PART_STATUSES.map(s=>(
                      <button
                        key={s.value}
                        disabled={saving[part.id]}
                        onClick={()=>updatePart(part.id,{part_status:s.value})}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono border transition-colors ${(part.part_status||"pending")===s.value?"border-current font-bold":"border-ironworks3 text-steel hover:border-bone/40"}`}
                        style={(part.part_status||"pending")===s.value?{color:s.color,borderColor:s.color,background:`${s.color}15`}:{}}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Completed */}
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
                    <div className="font-medium text-sm line-through text-steel truncate">{part.file_name}</div>
                    <div className="font-mono text-xs text-steel">{part.material} · {part.quality} · {part.order_id}</div>
                  </div>
                </div>
                <button onClick={()=>updatePart(part.id,{part_status:"printing",completed:false})} className="text-xs font-mono text-steel hover:text-bone border border-ironworks3 px-2 py-1 rounded-sm">undo</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
