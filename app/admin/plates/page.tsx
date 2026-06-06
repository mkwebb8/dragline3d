"use client";
import{useEffect,useState,useCallback}from "react";
import{useRouter}from "next/navigation";
import Link from "next/link";
import{RefreshCw,List,Plus,CheckCircle2,Circle,Trash2,Layers}from "lucide-react";

const PLATE_STATUSES=[
  {value:"pending",label:"Pending",color:"#6b7280"},
  {value:"printing",label:"Printing",color:"#f97316"},
  {value:"completed",label:"Completed",color:"#22c55e"},
];

function formatHours(h:number){
  const hrs=Math.floor(h);const mins=Math.round((h-hrs)*60);
  if(hrs>0&&mins>0)return`${hrs}h ${mins}m`;
  if(hrs>0)return`${hrs}h`;
  return`${mins}m`;
}

export default function PlatesPage(){
  const[parts,setParts]=useState<any[]>([]);
  const[plates,setPlates]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[token,setToken]=useState("");
  const[selected,setSelected]=useState<Set<string>>(new Set());
  const[plateName,setPlateName]=useState("");
  const[creating,setCreating]=useState(false);
  const[createError,setCreateError]=useState<string|null>(null);
  const router=useRouter();

  const fetchData=useCallback(async()=>{
    const t=localStorage.getItem("dragline_admin_token");
    if(!t){router.push("/admin/login");return;}
    setToken(t);setLoading(true);

    // Fetch active orders
    const statuses=["received","queued","printing"];
    const orderResults=await Promise.all(statuses.map(s=>
      fetch(`/api/admin/orders?status=${s}`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.ok?r.json():[])
    ));
    const allOrders=orderResults.flat().sort((a:any,b:any)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
    const flatParts=allOrders.flatMap((o:any)=>(o.order_items||[])
      .filter((i:any)=>!i.completed)
      .map((i:any)=>({...i,order_id:o.id,customer_name:o.customer_name,order_status:o.status})));
    setParts(flatParts);

    // Fetch plates
    const pr=await fetch("/api/admin/plates",{headers:{Authorization:`Bearer ${t}`}});
    if(pr.ok)setPlates(await pr.json());

    setLoading(false);
  },[router]);

  useEffect(()=>{fetchData();},[fetchData]);

  function toggleSelect(id:string){
    setSelected(prev=>{
      const next=new Set(prev);
      if(next.has(id))next.delete(id);else next.add(id);
      return next;
    });
  }

  async function createPlate(){
    if(selected.size===0){setCreateError("Select at least one part.");return;}
    if(!plateName.trim()){setCreateError("Enter a plate name.");return;}
    setCreating(true);setCreateError(null);
    const res=await fetch("/api/admin/plates",{
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({name:plateName.trim(),items:Array.from(selected)}),
    });
    if(res.ok){
      setPlateName("");setSelected(new Set());
      await fetchData();
    }else{
      const e=await res.json();setCreateError(e.error||"Failed to create plate");
    }
    setCreating(false);
  }

  async function updatePlateStatus(plateId:string,status:string){
    await fetch(`/api/admin/plates/${plateId}`,{
      method:"PATCH",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({status}),
    });
    setPlates(prev=>prev.map(p=>p.id===plateId?{...p,status}:p));
    if(status==="completed")await fetchData();
  }

  async function deletePlate(plateId:string){
    await fetch(`/api/admin/plates/${plateId}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
    setPlates(prev=>prev.filter(p=>p.id!==plateId));
    await fetchData();
  }

  // Parts not already on an active plate
  const assignedItemIds=new Set(plates.filter(p=>p.status!=="completed").flatMap((p:any)=>(p.plate_items||[]).map((i:any)=>i.order_item_id)));
  const unassignedParts=parts.filter(p=>!assignedItemIds.has(p.id));
  const activePlates=plates.filter(p=>p.status!=="completed");
  const completedPlates=plates.filter(p=>p.status==="completed");

  if(loading)return<div className="max-w-5xl mx-auto px-6 py-16 text-center"><div className="inline-block w-8 h-8 border-2 border-ironworks3 border-t-amber rounded-full animate-spin"/></div>;

  return(
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-display font-extrabold text-xl">Plate Builder</div>
          <div className="font-mono text-xs text-steel">DRAGLINE 3D · BUILD PLATES</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone transition-colors"><RefreshCw size={16}/></button>
          <Link href="/admin/parts" className="flex items-center gap-2 px-3 py-2 rounded-sm border border-ironworks3 text-bone/60 hover:text-bone text-sm transition-colors font-mono text-xs"><List size={14}/>PARTS QUEUE</Link>
        </div>
      </div>

      {/* Part selector */}
      <div className="bg-ironworks2 border border-ironworks3 rounded-sm mb-6">
        <div className="px-5 py-4 border-b border-ironworks3 flex items-center justify-between">
          <div className="font-mono text-xs text-amber tracking-widest">UNASSIGNED PARTS ({unassignedParts.length})</div>
          {selected.size>0&&(
            <div className="font-mono text-xs text-steel">{selected.size} selected</div>
          )}
        </div>
        {unassignedParts.length===0?(
          <div className="px-5 py-8 text-center text-bone/40 font-mono text-xs">All parts assigned to plates</div>
        ):(
          <div className="divide-y divide-ironworks3">
            {unassignedParts.map(part=>{
              const hoursPerPiece=part.print_hours||part.hours||0;
              const qty=part.qty||1;
              const runs=part.runs||1;
              const piecesPerRun=qty/runs;
              const hoursPerRun=hoursPerPiece*piecesPerRun;
              const gramsPerRun=Number(part.grams||0)*piecesPerRun;
              const isSelected=selected.has(part.id);
              return(
                <div key={part.id} onClick={()=>toggleSelect(part.id)}
                  className={`px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${isSelected?"bg-amber/5 border-l-2 border-l-amber":"hover:bg-ironworks3/30"}`}>
                  <div className={`flex-shrink-0 ${isSelected?"text-amber":"text-steel"}`}>
                    {isSelected?<CheckCircle2 size={18}/>:<Circle size={18}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {qty>1&&<span className="font-mono text-xs font-bold text-amber">{qty}×</span>}
                      <span className="font-medium text-sm truncate">{part.file_name}</span>
                    </div>
                    <div className="font-mono text-xs text-steel mt-0.5">
                      {part.material} · {part.color||"Midnight Black"} · {part.quality} · {part.infill}%
                    </div>
                    <div className="font-mono text-xs text-steel/60 mt-0.5">
                      {runs} run{runs!==1?"s":""} · {gramsPerRun.toFixed(1)}g/run · {formatHours(hoursPerRun)}/run
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs text-steel">{part.order_id}</div>
                    <div className="font-mono text-xs text-steel/60">{part.customer_name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create plate bar */}
        {selected.size>0&&(
          <div className="px-5 py-4 border-t border-amber/30 bg-amber/5 flex items-center gap-3">
            <input value={plateName} onChange={e=>setPlateName(e.target.value)} placeholder="Plate name (e.g. Plate 1 — BTM parts)" className="flex-1 px-3 py-2 rounded-sm bg-ironworks border border-ironworks3 focus:border-amber focus:outline-none text-bone text-sm"/>
            <button onClick={createPlate} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-amber text-ironworks font-display font-bold text-sm rounded-sm hover:opacity-90 transition-colors disabled:opacity-50">
              <Plus size={14}/>{creating?"CREATING...":"BUILD PLATE"}
            </button>
            <button onClick={()=>setSelected(new Set())} className="font-mono text-xs text-steel hover:text-bone">clear</button>
            {createError&&<div className="font-mono text-xs text-red-400">{createError}</div>}
          </div>
        )}
      </div>

      {/* Active plates */}
      {activePlates.length>0&&(
        <div className="mb-6">
          <div className="font-mono text-xs text-amber tracking-widest mb-3">ACTIVE PLATES ({activePlates.length})</div>
          <div className="space-y-3">
            {activePlates.map(plate=>{
              const items=plate.plate_items||[];
              const totalGrams=items.reduce((s:number,pi:any)=>{
                const part=parts.find(p=>p.id===pi.order_item_id);
                if(!part)return s;
                const qty=part.qty||1;const runs=part.runs||1;
                return s+Number(part.grams||0)*(qty/runs);
              },0);
              const totalHours=items.reduce((s:number,pi:any)=>{
                const part=parts.find(p=>p.id===pi.order_item_id);
                if(!part)return s;
                const qty=part.qty||1;const runs=part.runs||1;
                const h=part.print_hours||part.hours||0;
                return s+h*(qty/runs);
              },0);
              const cfg=PLATE_STATUSES.find(s=>s.value===plate.status)||PLATE_STATUSES[0];
              return(
                <div key={plate.id} className={`bg-ironworks2 border rounded-sm overflow-hidden ${plate.status==="printing"?"border-orange-500/40":"border-ironworks3"}`}>
                  <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-ironworks3">
                    <div className="flex items-center gap-3">
                      <Layers size={14} className="text-amber"/>
                      <div className="font-display font-bold text-sm">{plate.name}</div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-sm border" style={{color:cfg.color,borderColor:`${cfg.color}44`,background:`${cfg.color}11`}}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="font-mono text-xs text-steel">{totalGrams.toFixed(1)}g · {formatHours(totalHours)}</div>
                      <div className="flex gap-1.5">
                        {PLATE_STATUSES.map(s=>(
                          <button key={s.value} onClick={()=>updatePlateStatus(plate.id,s.value)}
                            className={`px-2 py-1 rounded-sm text-xs font-mono border transition-colors ${plate.status===s.value?"border-current font-bold":"border-ironworks3 text-steel hover:border-bone/40"}`}
                            style={plate.status===s.value?{color:s.color,borderColor:s.color,background:`${s.color}15`}:{}}
                          >{s.label}</button>
                        ))}
                      </div>
                      <button onClick={()=>deletePlate(plate.id)} className="text-steel hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <div className="divide-y divide-ironworks3">
                    {items.map((pi:any)=>{
                      const part=parts.find(p=>p.id===pi.order_item_id)||{file_name:pi.order_item_id,material:"",quality:"",infill:0,qty:1,grams:0,hours:0};
                      const qty=part.qty||1;const runs=part.runs||1;
                      const piecesPerRun=qty/runs;
                      const h=part.print_hours||part.hours||0;
                      return(
                        <div key={pi.id} className="px-5 py-2.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            {qty>1&&<span className="font-mono text-xs text-amber font-bold">{qty}×</span>}
                            <span className="font-medium text-sm truncate">{part.file_name}</span>
                          </div>
                          <div className="font-mono text-xs text-steel flex-shrink-0">
                            {(Number(part.grams||0)*piecesPerRun).toFixed(1)}g · {formatHours(h*piecesPerRun)} · {part.order_id||""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed plates */}
      {completedPlates.length>0&&(
        <div>
          <div className="font-mono text-xs text-green-500 tracking-widest mb-3">COMPLETED PLATES ({completedPlates.length})</div>
          <div className="space-y-2 opacity-50">
            {completedPlates.map(plate=>(
              <div key={plate.id} className="bg-ironworks2 border border-ironworks3 rounded-sm px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={14} className="text-green-400"/>
                  <div className="font-display font-bold text-sm line-through text-steel">{plate.name}</div>
                  <div className="font-mono text-xs text-steel">{(plate.plate_items||[]).length} parts</div>
                </div>
                <button onClick={()=>deletePlate(plate.id)} className="text-steel hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
