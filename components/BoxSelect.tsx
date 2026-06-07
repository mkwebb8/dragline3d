"use client";
// app/components/BoxSelect.tsx
// Usage: <BoxSelect orderId={order.id} currentBoxId={order.box_id} token={token} />

import { useEffect, useState } from "react";
import { Package, Save } from "lucide-react";

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
  onSave?: (newBoxId: string | null) => void;
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

export default function BoxSelect({ orderId, currentBoxId, token, onSave }: Props) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  // savedBoxId = what's actually on the order in the DB
  const [savedBoxId, setSavedBoxId] = useState<string>(currentBoxId || "");
  // selected = what the dropdown currently shows (may differ before Save)
  const [selected, setSelected] = useState<string>(currentBoxId || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/inventory/boxes", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setBoxes)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setSavedBoxId(currentBoxId || "");
    setSelected(currentBoxId || "");
  }, [currentBoxId]);

  const isDirty = selected !== savedBoxId;
  const selectedBox = boxes.find(b => b.id === selected);
  const savedBox = boxes.find(b => b.id === savedBoxId);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    // 1. Update the order's box_id
    const orderRes = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ box_id: selected || null }),
    });
    if (!orderRes.ok) {
      setSaving(false);
      alert("Failed to update order box");
      return;
    }

    // 2. Refetch fresh quantities before adjusting — avoids stale-read issues
    const freshBoxes: Box[] = await fetch("/api/admin/inventory/boxes", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : boxes).catch(() => boxes);
    setBoxes(freshBoxes);

    // If switching away from a previous box, restore its stock (+1)
    if (savedBoxId && savedBoxId !== selected) {
      const prev = freshBoxes.find(b => b.id === savedBoxId);
      if (prev) {
        const res = await fetch(`/api/admin/inventory/boxes/${savedBoxId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: prev.quantity + 1 }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Failed to restore previous box qty:", err);
        } else {
          setBoxes(bs => bs.map(b => b.id === savedBoxId ? { ...b, quantity: b.quantity + 1 } : b));
        }
      }
    }

    // If selecting a new box, decrement its stock (-1)
    if (selected) {
      const next = freshBoxes.find(b => b.id === selected);
      if (next) {
        const res = await fetch(`/api/admin/inventory/boxes/${selected}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: Math.max(0, next.quantity - 1) }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to update box inventory: ${err.error || res.status}`);
        } else {
          setBoxes(bs => bs.map(b => b.id === selected ? { ...b, quantity: Math.max(0, b.quantity - 1) } : b));
        }
      }
    }

    setSavedBoxId(selected);
    onSave?.(selected || null);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-xl p-4" style={glass}>
      <div className="flex items-center gap-2 mb-3">
        <Package size={14} className="text-steel" />
        <div className="font-mono text-xs text-steel tracking-wider">SHIPPING BOX</div>
        {saving && <div className="w-3 h-3 border border-white/10 border-t-amber rounded-full animate-spin ml-auto" />}
        {saved && <div className="font-mono text-xs text-green-400 ml-auto">Saved ✓</div>}
      </div>

      <div className="flex gap-2">
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setSaved(false); }}
          className="flex-1 px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer"
          style={inputSt}
          onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <option value="">— No box —</option>
          {boxes.map(b => (
            <option key={b.id} value={b.id} disabled={b.quantity <= 0 && b.id !== savedBoxId}>
              {b.name} ({b.length_in}×{b.width_in}×{b.height_in}&quot;){b.quantity <= 0 ? " — OUT" : ` · ${b.quantity} left`}
            </option>
          ))}
        </select>

        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}
          >
            <Save size={12} />
            SAVE
          </button>
        )}
      </div>

      {selectedBox && (
        <div className="flex items-center gap-3 mt-2 font-mono text-xs text-steel flex-wrap">
          <span>{selectedBox.length_in}″ × {selectedBox.width_in}″ × {selectedBox.height_in}″</span>
          {selectedBox.cost_each != null && (
            <span className="text-amber">${Number(selectedBox.cost_each).toFixed(2)} COGS</span>
          )}
          <span className={selectedBox.quantity < 3 ? "text-red-400" : "text-steel/60"}>
            {savedBoxId === selectedBox.id ? selectedBox.quantity : selectedBox.quantity} in stock
            {selectedBox.quantity === 0 && savedBoxId !== selectedBox.id ? " — OUT" : ""}
          </span>
        </div>
      )}

      {boxes.length === 0 && (
        <div className="font-mono text-xs text-steel/50 mt-1">Add boxes in Inventory first</div>
      )}
    </div>
  );
}
