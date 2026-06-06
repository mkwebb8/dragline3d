import{Suspense}from "react";
import OrderConfirmedContent from "./content";
export default function OrderConfirmed(){
  return(
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-24 text-center"><div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin"/></div>}>
      <OrderConfirmedContent/>
    </Suspense>
  );
}
