"use client";
import{useState}from "react";
import{useRouter}from "next/navigation";
import{DraglineMark}from "@/components/DraglineMark";
export default function AdminLogin(){
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[error,setError]=useState<string|null>(null);
  const[loading,setLoading]=useState(false);
  const router=useRouter();
  async function handleLogin(e:React.FormEvent){
    e.preventDefault();setLoading(true);setError(null);
    const res=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    const data=await res.json();
    if(!res.ok){setError("Invalid credentials.");setLoading(false);return;}
    localStorage.setItem("dragline_admin_token",data.token);
    router.push("/admin/orders");
  }
  return(
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><DraglineMark size={56}/></div>
        <div className="font-display font-black text-3xl text-center mb-2">Admin Login</div>
        <div className="font-mono text-xs text-steel text-center tracking-widest mb-8">DRAGLINE 3D</div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username"
            className="w-full px-4 py-3 rounded-sm bg-ironworks2 border border-ironworks3 focus:border-amber focus:outline-none text-bone" required autoComplete="username"/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"
            className="w-full px-4 py-3 rounded-sm bg-ironworks2 border border-ironworks3 focus:border-amber focus:outline-none text-bone" required autoComplete="current-password"/>
          {error&&<div className="text-red-400 text-sm text-center">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full py-4 font-display font-bold bg-amber text-ironworks rounded-sm hover:bg-amber-dark transition-colors disabled:opacity-50">
            {loading?"Logging in...":"LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
