"use client";
// Drop this into app/admin/orders/[id]/page.tsx
// Import: import BoxSelect from "@/components/BoxSelect";
// Usage:  <BoxSelect orderId={order.id} currentBoxId={order.box_id} token={token} />
//
// The component handles its own fetch + PATCH. No other changes needed
// as long as your existing PATCH /api/admin/orders/[id] accepts { box_id }.

import { useEffect, useState } from "react";
import { Package } from "lucide-react";

interface Box {
  id: string;
  name: string;
  length_in: number;
  width_in: number;
  height_in: number;
  quantity: number;
  cost_each: number | null;
}

interface Props {
  orderId: string;
  currentBoxId?: string | null;
  token: string;
}

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const inputSt: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  outline: "none",
};

export default function BoxSelect({ orderId, currentBoxId, token }: Props) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selected, setSelected] = useState<string>(currentBoxId || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/inventory/boxes", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setBoxes)
      .catch(() => {});
  }, [token]);

  useEffect(() => { setSelected(currentBoxId || ""); }, [currentBoxId]);

  async function handleChange(boxId: string) {
    setSelected(boxId);
    setSaving(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ box_id: boxId || null }),
    });
    setSaving(false);
  }

  const selectedBox = boxes.find(b => b.id === selected);

  return (
    <div className="rounded-xl p-4" style={glass}>
      <div className="flex items-center gap-2 mb-3">
        <Package size={14} className="text-steel" />
        <div className="font-mono text-xs text-steel tracking-wider">SHIPPING BOX</div>
        {saving && <div className="w-3 h-3 border border-white/10 border-t-amber rounded-full animate-spin ml-auto" />}
      </div>
      <select
        value={selected}
        onChange={e => handleChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer mb-2"
        style={inputSt}
        onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <option value="">— No box selected —</option>
        {boxes.map(b => (
          <option key={b.id} value={b.id} disabled={b.quantity <= 0}>
            {b.name} ({b.length_in}×{b.width_in}×{b.height_in}&quot;){b.quantity <= 0 ? " — OUT" : ` · ${b.quantity} left`}
          </option>
        ))}
      </select>
      {selectedBox && (
        <div className="font-mono text-xs text-steel">
          {selectedBox.length_in}″ × {selectedBox.width_in}″ × {selectedBox.height_in}″
          {selectedBox.cost_each ? ` · $${Number(selectedBox.cost_each).toFixed(2)} each` : ""}
          {" · "}<span className={selectedBox.quantity < 3 ? "text-red-400" : "text-steel"}>{selectedBox.quantity} in stock</span>
        </div>
      )}
      {boxes.length === 0 && (
        <div className="font-mono text-xs text-steel/50">Add boxes in Inventory first</div>
      )}
    </div>
  );
}
