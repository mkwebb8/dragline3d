"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, ExternalLink, FileText, Receipt, Package, CheckCircle2, Circle, Scissors, Printer, PlayCircle, Download, Upload, PlusCircle, Pencil, X, Check } from "lucide-react";
import type { CSSProperties } from "react";
import BoxSelect from "@/components/BoxSelect"; // ← added

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const inputSt: CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" };
function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
  e.currentTarget.style.boxShadow = "none";
}
const STATUS_OPTIONS = [{ value: "pending", label: "Payment Pending" }, { value: "received", label: "Order Received" }, { value: "queued", label: "In Queue" }, { value: "printing", label: "Printing" }, { value: "quality_check", label: "Quality Check" }, { value: "shipped", label: "Shipped" }, { value: "delivered", label: "Delivered" }, { value: "cancelled", label: "Cancelled" }];
const STATUS_COLORS: Record<string, string> = { pending: "#6b7280", received: "#3b82f6", queued: "#f59e0b", printing: "#f97316", quality_check: "#a855f7", shipped: "#22c55e", delivered: "#16a34a", cancelled: "#ef4444" };
const BOX_PRESETS = [
  { label: "Small (10×8×4)", l: 10, w: 8, h: 4 },
  { label: "Medium (14×12×6)", l: 14, w: 12, h: 6 },
  { label: "Large (18×14×8)", l: 18, w: 14, h: 8 },
  { label: "XL (24×18×10)", l: 24, w: 18, h: 10 },
  { label: "Custom", l: 0, w: 0, h: 0 },
];
const COLOR_OPTIONS = ["Black","White","Gray","Silver","Red","Orange","Yellow","Green","Blue","Navy","Purple","Pink","Brown","Natural","Translucent","Clear"];
const PART_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "#6b7280", icon: Circle },
  sliced: { label: "Sliced", color: "#3b82f6", icon: Scissors },
  sent_to_printer: { label: "Sent to Printer", color: "#f59e0b", icon: Printer },
  printing: { label: "Printing", color: "#f97316", icon: PlayCircle },
  completed: { label: "Completed", color: "#22c55e", icon: CheckCircle2 },
};
export default function AdminOrderDetail(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { id } = params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [boxPreset, setBoxPreset] = useState(0);
  const [boxL, setBoxL] = useState("14");
  const [boxW, setBoxW] = useState("12");
  const [boxH, setBoxH] = useState("6");
  const [recipientName, setRecipientName] = useState("");
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [token, setToken] = useState(""); // ← added for BoxSelect
  const [boxes, setBoxes] = useState<any[]>([]);
  const [showAddPart, setShowAddPart] = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [addPartFile, setAddPartFile] = useState<File | null>(null);
  const [addPartFields, setAddPartFields] = useState({ material: "PETG", color: "", quality: "Standard", infill: "15", qty: "1", grams: "", hoursH: "", hoursM: "", price: "" });
  const [spools, setSpools] = useState<any[]>([]);
  const [editingColor, setEditingColor] = useState<Record<string, string | null>>({});
  const [colorSaving, setColorSaving] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t); // ← added
    fetch(`/api/admin/orders/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(data => {
        setOrder(data); setStatus(data.status || "received"); setTracking(data.tracking_number || "");
        setNotes(data.notes || ""); setInvoiceUrl(data.square_invoice_url || null);
        setLabelUrl(data.label_url || null);
        setRecipientName(data.customer_name || "");
      })
      .finally(() => setLoading(false));
    fetch("/api/admin/inventory/boxes", { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : []).then(setBoxes).catch(() => {});
    fetch("/api/admin/inventory", { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : []).then(setSpools).catch(() => {});
  }, [id, router]);

  function selectPreset(i: number) {
    setBoxPreset(i);
    const p = BOX_PRESETS[i];
    if (p.l) { setBoxL(String(p.l)); setBoxW(String(p.w)); setBoxH(String(p.h)); }
  }
  async function handleSave() {
    const t = localStorage.getItem("dragline_admin_token"); if (!t) return;
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ status, tracking_number: tracking, notes }) });
    if (res.ok) { const u = await res.json(); setOrder(u); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }
  async function handleCreateInvoice() {
    const t = localStorage.getItem("dragline_admin_token"); if (!t) return;
    setInvoicing(true); setInvoiceError(null);
    const res = await fetch(`/api/admin/orders/${id}/invoice`, { method: "POST", headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) { const data = await res.json(); setInvoiceUrl(data.invoice_url); window.open(data.invoice_url, "_blank"); }
    else { const err = await res.json(); setInvoiceError(err.error || "Failed to create invoice"); }
    setInvoicing(false);
  }
  async function handleCreateLabel() {
    const t = localStorage.getItem("dragline_admin_token"); if (!t) return;
    setCreatingLabel(true); setLabelError(null);
    const res = await fetch(`/api/admin/orders/${id}/label`, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ length: parseFloat(boxL), width: parseFloat(boxW), height: parseFloat(boxH), recipientName: recipientName || undefined }) });
    if (res.ok) {
      const data = await res.json();
      setLabelUrl(data.label_url); setTracking(data.tracking_number);
      setShowLabelPicker(false); window.open(data.label_url, "_blank");
    } else { const err = await res.json(); setLabelError(err.error || "Label creation failed"); }
    setCreatingLabel(false);
  }
  async function handleRunDone(item: any) {
    const t = localStorage.getItem("dragline_admin_token"); if (!t) return;
    const newPrintedQty = (item.printed_qty || 0) + 1;
    const res = await fetch(`/api/admin/orders/${id}/items/${item.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ printed_qty: newPrintedQty }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrder((o: any) => ({ ...o, order_items: o.order_items.map((i: any) => i.id === item.id ? { ...i, ...updated } : i) }));
    }
  }

  async function handleAddPart() {
    const t = localStorage.getItem("dragline_admin_token") || "";
    setAddingPart(true);
    const fd = new FormData();
    if (addPartFile) fd.append("file", addPartFile);
    const { hoursH, hoursM, ...rest } = addPartFields;
    const hours = (parseInt(hoursH) || 0) + (parseInt(hoursM) || 0) / 60;
    Object.entries(rest).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (hours > 0) fd.append("hours", String(hours));
    const res = await fetch(`/api/admin/orders/${id}/items`, { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd });
    if (res.ok) {
      const newItem = await res.json();
      setOrder((o: any) => ({ ...o, order_items: [...(o.order_items || []), newItem] }));
      setShowAddPart(false);
      setAddPartFile(null);
      setAddPartFields({ material: "PETG", color: "", quality: "Standard", infill: "15", qty: "1", grams: "", hoursH: "", hoursM: "", price: "" });
    } else { alert("Failed to add part"); }
    setAddingPart(false);
  }

  async function downloadFile(fileName: string, itemId?: string) {
    const t = localStorage.getItem("dragline_admin_token") || "";
    const params = new URLSearchParams({ fileName });
    if (itemId) params.set("itemId", itemId);
    const res = await fetch(`/api/admin/orders/${id}/file?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) { alert("File not found"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  async function uploadItemFile(item: any, file: File) {
    const t = localStorage.getItem("dragline_admin_token") || "";
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/admin/orders/${id}/items/${item.id}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    });
    if (!res.ok) { alert("Upload failed"); return; }
    const updated = await res.json();
    setOrder((o: any) => ({ ...o, order_items: o.order_items.map((i: any) => i.id === item.id ? { ...i, ...updated } : i) }));
  }

  async function handleColorSave(item: any, newColor: string) {
    if (newColor === (item.color || "")) { setEditingColor(ec => ({ ...ec, [item.id]: null })); return; }
    const t = localStorage.getItem("dragline_admin_token") || "";
    setColorSaving(s => ({ ...s, [item.id]: true }));
    const res = await fetch(`/api/admin/orders/${id}/items/${item.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ color: newColor }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrder((o: any) => ({ ...o, order_items: o.order_items.map((i: any) => i.id === item.id ? { ...i, ...updated } : i) }));
    }
    setEditingColor(ec => ({ ...ec, [item.id]: null }));
    setColorSaving(s => ({ ...s, [item.id]: false }));
  }

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-16 text-center"><div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" /></div>;
  if (!order) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-bone/50">Order not found</div>;
  const completedQty = order.order_items?.reduce((s: number, i: any) => s + (i.printed_qty || 0), 0) || 0;
  const totalCount = order.order_items?.reduce((s: number, i: any) => s + (i.qty || 1), 0) || 0;
  const COST_PER_KG: Record<string, number> = { PLA: 16, PETG: 18, TPU: 24, ABS: 20, ASA: 22, "PET-GF15": 30, "PETG-ESD": 66, PA: 35, "ASA-CF": 40, "PETG-CF": 40, "PA-CF": 80, PCTG: 29.95 };
  const totalGrams = order.order_items?.reduce((s: number, i: any) => s + (i.grams || 0) * (i.qty || 1), 0) || 0;
  const filamentCost = order.order_items?.reduce((s: number, i: any) => s + ((i.grams || 0) * (i.qty || 1) / 1000) * (COST_PER_KG[i.material] || 16), 0) || 0;
  const selectedBox = order.box_id ? boxes.find((b: any) => b.id === order.box_id) : null;
  const packagingCost = selectedBox ? Number(selectedBox.cost_each) || 0 : 0;
  const matCost = filamentCost + packagingCost;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/orders" className="text-bone/50 hover:text-bone transition-colors cursor-pointer"><ArrowLeft size={20} /></Link>
        <div>
          <div className="font-mono text-xs text-amber font-bold">{order.id}</div>
          <div className="font-display font-extrabold text-2xl">{order.customer_name}</div>
        </div>
        <div className="ml-auto">
          <Link href={`/order/${order.id}`} target="_blank" className="flex items-center gap-1 text-xs font-mono text-bone/50 hover:text-bone transition-colors cursor-pointer">
            Customer view <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {invoiceUrl ? (
          <a href={invoiceUrl} target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-white bg-green-600 hover:bg-green-500 transition-colors cursor-pointer">
            <Receipt size={15} />VIEW INVOICE
          </a>
        ) : (
          <button onClick={handleCreateInvoice} disabled={invoicing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            <Receipt size={15} />{invoicing ? "CREATING…" : order.square_invoice_url ? "GO TO SQUARE INVOICE" : "CREATE SQUARE INVOICE"}
          </button>
        )}
        <button onClick={() => window.open(`/admin/orders/${id}/invoice`, "_blank")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-ironworks cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
          <FileText size={15} />INVOICE PDF
        </button>
        <button onClick={() => window.open(`/admin/orders/${id}/packing-slip`, "_blank")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-bone cursor-pointer transition-opacity hover:opacity-80"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
          <FileText size={15} />PACKING SLIP
        </button>
        {labelUrl ? (
          <a href={labelUrl} target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer">
            <Package size={15} />PRINT LABEL
          </a>
        ) : (
          <button onClick={() => setShowLabelPicker(!showLabelPicker)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-bone cursor-pointer transition-opacity hover:opacity-80"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
            <Package size={15} />CREATE LABEL
          </button>
        )}
        {invoiceError && <div className="text-xs text-red-400 self-center font-mono">{invoiceError}</div>}
      </div>

      {showLabelPicker && (
        <div className="rounded-xl p-5 mb-6" style={{ ...glass, border: "1px solid rgba(255,181,71,0.40)" }}>
          <div className="font-mono text-xs text-amber tracking-widest mb-4">BOX DIMENSIONS</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {BOX_PRESETS.map((p, i) => (
              <button key={i} onClick={() => selectPreset(i)}
                className="px-3 py-1.5 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                style={boxPreset === i
                  ? { border: "1px solid #ffb547", background: "rgba(255,181,71,0.10)", color: "#ffb547" }
                  : { border: "1px solid rgba(255,255,255,0.07)", color: "#5a5a5e" }}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mb-4">
            {([["L", boxL, setBoxL], ["W", boxW, setBoxW], ["H", boxH, setBoxH]] as const).map(([label, val, set]) => (
              <div key={label as string} className="flex-1">
                <label className="block font-mono text-xs text-steel mb-1">{label as string} (in)</label>
                <input value={val as string} onChange={e => { (set as any)(e.target.value); setBoxPreset(4); }}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm font-mono transition-colors"
                  style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="block font-mono text-xs text-steel mb-1">RECIPIENT NAME <span className="text-steel/50">(optional — overrides customer name on label)</span></label>
            <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={order.customer_name}
              className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors"
              style={inputSt} onFocus={focusOn} onBlur={focusOff} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCreateLabel} disabled={creatingLabel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
              <Package size={15} />{creatingLabel ? "CREATING…" : "PURCHASE & PRINT LABEL"}
            </button>
            <button onClick={() => setShowLabelPicker(false)} className="text-xs font-mono text-steel hover:text-bone cursor-pointer">cancel</button>
            {labelError && <div className="text-xs text-red-400 font-mono">{labelError}</div>}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-5" style={glass}>
          <div className="font-mono text-xs text-amber tracking-widest mb-3">CUSTOMER</div>
          <div className="space-y-1.5 text-sm">
            <div><span className="text-steel">Name:</span> {order.customer_name}</div>
            <div><span className="text-steel">Email:</span> <a href={`mailto:${order.customer_email}`} className="text-amber hover:underline cursor-pointer">{order.customer_email}</a></div>
            {order.address && <div><span className="text-steel">Ship to:</span> {order.address}{order.city ? `, ${order.city}` : ""}{order.state ? `, ${order.state}` : ""} {order.zip}</div>}
            <div><span className="text-steel">Shipping:</span> {order.shipping_service || "--"} · ${Number(order.shipping_cost || 0).toFixed(2)}</div>
            <div><span className="text-steel">Total:</span> <span className="font-bold text-amber">${order.total?.toFixed(2)}</span></div>
            <div><span className="text-steel">Filament:</span> {(totalGrams / 1000).toFixed(3)} kg</div>
            <div><span className="text-steel">Filament cost:</span> <span className="text-red-400">${filamentCost.toFixed(2)}</span></div>
            {packagingCost > 0 && (
              <div><span className="text-steel">Packaging cost:</span> <span className="text-pink-400">${packagingCost.toFixed(2)}</span> <span className="text-steel/50">({selectedBox?.name})</span></div>
            )}

            <div><span className="text-steel">Total COGS:</span> <span className="font-bold text-red-400">${matCost.toFixed(2)}</span></div>
            <div className="font-mono text-xs text-steel pt-1">{new Date(order.created_at).toLocaleString("en-US")}</div>
          </div>
        </div>
        <div className="rounded-xl p-5" style={glass}>
          <div className="font-mono text-xs text-amber tracking-widest mb-3">STATUS</div>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-steel mb-1.5 tracking-wider">STATUS</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ ...inputSt, color: STATUS_COLORS[status] }}
                className="w-full px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                onFocus={focusOn} onBlur={focusOff}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ color: STATUS_COLORS[o.value] }}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1.5 tracking-wider">TRACKING NUMBER</label>
              <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="USPS tracking…"
                className="w-full px-3 py-2 rounded-xl text-bone text-sm font-mono transition-colors"
                style={inputSt} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label className="block font-mono text-xs text-steel mb-1.5 tracking-wider">NOTES</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Internal notes…"
                className="w-full px-3 py-2 rounded-xl text-bone text-sm resize-none transition-colors"
                style={inputSt}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,181,71,0.50)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,181,71,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl font-display font-bold text-ironworks flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
              <Save size={16} />{saved ? "SAVED!" : saving ? "SAVING…" : "SAVE CHANGES"}
            </button>
            {status === "shipped" && tracking && <div className="font-mono text-xs text-green-400 text-center">Customer will receive a shipping email</div>}
          </div>
        </div>
      </div>

      {token && (
        <div className="mb-6">
          <BoxSelect
            orderId={order.id}
            currentBoxId={order.box_id ?? null}
            token={token}
            onSave={(newBoxId) => setOrder((o: any) => ({ ...o, box_id: newBoxId }))}
          />
        </div>
      )}

      {order.order_items?.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={glass}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="font-mono text-xs text-amber tracking-widest">PARTS ({completedQty}/{totalCount} done)</div>
            <button onClick={() => setShowAddPart(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <PlusCircle size={12} /> ADD PART
            </button>
            <div className="flex items-center gap-3">
              {completedQty === totalCount && totalCount > 0 && (
                <div className="font-mono text-xs text-green-400">All parts complete</div>
              )}
              <Link href="/admin/parts" className="font-mono text-xs text-steel hover:text-amber transition-colors cursor-pointer">Manage in Parts Queue →</Link>
            </div>
          </div>
          <div>
            {order.order_items.map((item: any) => {
              const partStatus = item.part_status || "pending";
              const cfg = PART_STATUS_CONFIG[partStatus] || PART_STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const qty = item.qty || 1;
              return (
                <div key={item.id} className={`px-5 py-4 flex items-center justify-between gap-4 border-b last:border-b-0 transition-colors ${item.completed ? "bg-green-500/[0.03]" : ""}`}
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon size={18} className="flex-shrink-0" style={{ color: cfg.color }} />
                    <img
                      src={`/api/admin/orders/${order.id}/thumb?itemId=${item.id}`}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className={item.completed ? "opacity-50" : ""}>
                      <div className={`font-medium text-sm ${item.completed ? "line-through text-steel" : ""}`}>
                        {qty > 1 && <span className="font-mono text-amber font-bold mr-1.5">{qty}×</span>}
                        {item.file_name}
                      </div>
                      <div className="font-mono text-xs text-steel mt-1 flex items-center flex-wrap gap-x-1">
                        <span>{item.material} · {item.quality} · {item.infill}% · {item.grams}g ea · {(() => { const h = item.print_hours || item.hours || 0; const hrs = Math.floor(h); const mins = Math.round((h-hrs)*60); return hrs > 0 && mins > 0 ? `${hrs}h ${mins}m` : hrs > 0 ? `${hrs}h` : `${mins}m`; })()} ea{item.print_hours ? <span className="text-amber ml-1">✓actual</span> : null}</span>
                        {editingColor[item.id] !== undefined && editingColor[item.id] !== null ? (
                          <span className="flex items-center gap-1 mt-0.5">
                            <span className="text-steel/50">·</span>
                            <select
                              autoFocus
                              value={editingColor[item.id] as string}
                              onChange={e => { setEditingColor(ec => ({ ...ec, [item.id]: e.target.value })); handleColorSave(item, e.target.value); }}
                              onKeyDown={e => { if (e.key === "Escape") setEditingColor(ec => ({ ...ec, [item.id]: null })); }}
                              className="px-1.5 py-0.5 rounded text-bone text-xs font-mono cursor-pointer"
                              style={{ background: "rgba(30,30,35,0.95)", border: "1px solid rgba(255,181,71,0.5)", outline: "none" }}
                            >
                              <option value="">— no color —</option>
                              {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button onClick={() => setEditingColor(ec => ({ ...ec, [item.id]: null }))} className="text-steel hover:text-bone"><X size={11} /></button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 group/color">
                            <span className="text-steel/50">·</span>
                            <span className={item.color ? "text-bone/70" : "text-steel/40"}>{item.color || "no color"}</span>
                            <button onClick={() => setEditingColor(ec => ({ ...ec, [item.id]: item.color || "" }))}
                              className="opacity-0 group-hover/color:opacity-100 transition-opacity text-steel hover:text-amber">
                              <Pencil size={10} />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => downloadFile(item.file_name, item.id)} title={`Download ${item.file_name}`}
                      className="text-steel hover:text-amber transition-colors flex-shrink-0">
                      <Download size={15} />
                    </button>
                    {/* Upload replacement file (e.g. STEP received via email) */}
                    <label title="Replace file" className="text-steel hover:text-blue-400 transition-colors flex-shrink-0 cursor-pointer">
                      <Upload size={14} />
                      <input type="file" className="hidden" accept=".stl,.step,.stp,.3mf,.obj"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadItemFile(item, f); e.target.value = ""; }} />
                    </label>
                    {/* Progress badge for multi-run items */}
                    {qty > 1 && (
                      <span className="font-mono text-xs px-2 py-1 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)", color: (item.printed_qty || 0) >= qty ? "#22c55e" : "#f59e0b" }}>
                        {item.printed_qty || 0}/{qty} done
                      </span>
                    )}
                    <span className="font-mono text-xs px-2 py-1 rounded-xl border"
                      style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}11` }}>
                      {cfg.label}
                    </span>
                    {/* Mark run done — only show if not all runs finished */}
                    {(item.printed_qty || 0) < qty && (
                      <button onClick={() => handleRunDone(item)}
                        title="Mark one run as finished"
                        className="flex items-center gap-1 px-2 py-1 rounded-xl font-mono text-xs text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer"
                        style={{ border: "1px solid rgba(34,197,94,0.3)" }}>
                        <PlusCircle size={12} /> RUN DONE
                      </button>
                    )}
                    <div className={`font-display font-bold text-amber ${item.completed ? "opacity-50" : ""}`}>
                      ${(item.price * qty).toFixed(2)}
                      {qty > 1 && <span className="font-mono text-xs text-steel font-normal ml-1">${item.price?.toFixed(2)} ea</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        {showAddPart && (
          <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,181,71,0.25)", background: "rgba(255,181,71,0.03)" }}>
            <div className="font-mono text-xs text-amber tracking-widest mb-4">ADD PART MANUALLY</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block font-mono text-xs text-steel mb-1">MATERIAL</label>
                <select value={addPartFields.material} onChange={e => setAddPartFields(f => ({ ...f, material: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                  {["PLA","PETG","TPU","ABS","ASA","PET-GF15","PETG-ESD","PA","ASA-CF","PETG-CF","PA-CF","PCTG"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">COLOR</label>
                <select value={addPartFields.color} onChange={e => setAddPartFields(f => ({ ...f, color: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                  <option value="">— select —</option>
                  {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">QUALITY</label>
                <select value={addPartFields.quality} onChange={e => setAddPartFields(f => ({ ...f, quality: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm transition-colors cursor-pointer" style={inputSt} onFocus={focusOn} onBlur={focusOff}>
                  {["Draft (0.3mm)","Standard (0.2mm)","Fine (0.15mm)","Ultra (0.1mm)"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">INFILL %</label>
                <input type="number" value={addPartFields.infill} onChange={e => setAddPartFields(f => ({ ...f, infill: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm font-mono transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block font-mono text-xs text-steel mb-1">QTY</label>
                <input type="number" value={addPartFields.qty} onChange={e => setAddPartFields(f => ({ ...f, qty: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm font-mono transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">GRAMS</label>
                <input type="number" value={addPartFields.grams} onChange={e => setAddPartFields(f => ({ ...f, grams: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm font-mono transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">PRINT TIME</label>
                <div className="flex gap-1">
                  <input type="number" min="0" value={addPartFields.hoursH} onChange={e => setAddPartFields(f => ({ ...f, hoursH: e.target.value }))}
                    placeholder="0h" className="w-full px-2 py-2 rounded-xl text-bone text-sm font-mono transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                  <input type="number" min="0" max="59" value={addPartFields.hoursM} onChange={e => setAddPartFields(f => ({ ...f, hoursM: e.target.value }))}
                    placeholder="0m" className="w-full px-2 py-2 rounded-xl text-bone text-sm font-mono transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
                </div>
              </div>
              <div>
                <label className="block font-mono text-xs text-steel mb-1">PRICE $</label>
                <input type="number" value={addPartFields.price} onChange={e => setAddPartFields(f => ({ ...f, price: e.target.value }))} placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl text-bone text-sm font-mono transition-colors" style={inputSt} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-mono text-xs text-steel mb-1">FILE <span className="text-steel/50">(optional — attach STL/STEP/3MF)</span></label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer w-fit transition-colors hover:opacity-80"
                style={{ border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)" }}>
                <Upload size={13} className="text-steel" />
                <span className="font-mono text-xs text-bone">{addPartFile ? addPartFile.name : "Choose file…"}</span>
                <input type="file" className="hidden" accept=".stl,.step,.stp,.3mf,.obj"
                  onChange={e => setAddPartFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleAddPart} disabled={addingPart || !addPartFields.price}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-ironworks cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
                <PlusCircle size={14} />{addingPart ? "ADDING…" : "ADD TO ORDER"}
              </button>
              <button onClick={() => setShowAddPart(false)} className="text-xs font-mono text-steel hover:text-bone cursor-pointer">cancel</button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Inventory check panel */}
      {order.order_items?.length > 0 && spools.length > 0 && (() => {
        // Aggregate needed grams per material (including color in key for detail)
        const neededByMat: Record<string, number> = {};
        const neededByMatColor: Record<string, { color: string; grams: number }[]> = {};
        for (const item of order.order_items) {
          const mat = item.material || "Unknown";
          const g = (item.grams || 0) * (item.qty || 1);
          neededByMat[mat] = (neededByMat[mat] || 0) + g;
          if (!neededByMatColor[mat]) neededByMatColor[mat] = [];
          const existing = neededByMatColor[mat].find(x => x.color === (item.color || ""));
          if (existing) existing.grams += g; else neededByMatColor[mat].push({ color: item.color || "", grams: g });
        }
        // Aggregate on-hand grams per material
        const onHandByMat: Record<string, number> = {};
        for (const spool of spools) {
          const mat = spool.material || "Unknown";
          onHandByMat[mat] = (onHandByMat[mat] || 0) + (spool.weight_remaining_g || 0);
        }
        const materials = Object.keys(neededByMat).sort();
        const anyShortfall = materials.some(m => (neededByMat[m] || 0) > (onHandByMat[m] || 0));
        return (
          <div className="mt-4 rounded-xl p-5" style={{ ...glass, border: anyShortfall ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(34,197,94,0.25)" }}>
            <div className="font-mono text-xs tracking-widest mb-3" style={{ color: anyShortfall ? "#f87171" : "#4ade80" }}>
              INVENTORY CHECK {anyShortfall ? "— ORDER MATERIALS NEEDED" : "— SUFFICIENT STOCK"}
            </div>
            <div className="space-y-2">
              {materials.map(mat => {
                const needed = neededByMat[mat] || 0;
                const onHand = onHandByMat[mat] || 0;
                const shortfall = needed - onHand;
                const spoolsNeeded = Math.ceil(shortfall / 1000);
                return (
                  <div key={mat} className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="font-mono text-xs font-bold w-20 flex-shrink-0" style={{ color: shortfall > 0 ? "#f87171" : "#4ade80" }}>{mat}</span>
                    <span className="text-steel text-xs">need <span className="text-bone">{needed.toFixed(0)}g</span></span>
                    <span className="text-steel text-xs">on hand <span className={onHand >= needed ? "text-green-400" : "text-red-400"}>{onHand.toFixed(0)}g</span></span>
                    {shortfall > 0 ? (
                      <span className="font-mono text-xs px-2 py-0.5 rounded-lg" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                        order ~{shortfall.toFixed(0)}g ({spoolsNeeded} spool{spoolsNeeded !== 1 ? "s" : ""})
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-green-400/60">✓ ok</span>
                    )}
                    {neededByMatColor[mat].filter(x => x.color).length > 0 && (
                      <span className="text-steel/50 text-xs">
                        [{neededByMatColor[mat].filter(x => x.color).map(x => `${x.color} ${x.grams.toFixed(0)}g`).join(", ")}]
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
