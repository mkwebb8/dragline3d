"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Upload, Save, X, GripVertical, Play, Image as ImageIcon } from "lucide-react";
import type { CSSProperties } from "react";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const inputSt: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  outline: "none",
};

const MATERIALS = ["PLA", "PETG", "TPU", "ABS", "ASA", "PET-GF15", "PETG-ESD", "PA", "ASA-CF", "PETG-CF", "PA-CF", "PCTG"];

type GalleryItem = {
  id: string;
  title: string;
  client: string;
  material: string;
  notes: string;
  image_url: string | null;
  video_url: string | null;
  sort_order: number;
  visible: boolean;
};

function EditModal({ item, token, onSave, onClose }: {
  item: Partial<GalleryItem> & { id?: string };
  token: string;
  onSave: (saved: GalleryItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: item.title || "",
    client: item.client || "",
    material: item.material || "PLA",
    notes: item.notes || "",
    image_url: item.image_url || "",
    video_url: item.video_url || "",
    sort_order: item.sort_order ?? 0,
    visible: item.visible ?? true,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !item.id;

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/gallery/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    setUploading(false);
    if (!r.ok) { setUploadMsg("Upload failed"); return; }
    const { url, isVideo } = await r.json();
    if (isVideo) {
      setForm(f => ({ ...f, video_url: url, image_url: f.image_url }));
    } else {
      setForm(f => ({ ...f, image_url: url }));
    }
    setUploadMsg("✓ Uploaded");
    setTimeout(() => setUploadMsg(""), 3000);
  }

  async function handleSave() {
    setSaving(true);
    const url = isNew
      ? "/api/admin/gallery"
      : `/api/admin/gallery/${item.id}`;
    const method = isNew ? "POST" : "PATCH";
    const r = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!r.ok) return;
    const saved = await r.json();
    onSave(saved);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={glass}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <span className="font-mono text-xs tracking-widest">{isNew ? "NEW GALLERY ITEM" : "EDIT ITEM"}</span>
          <button onClick={onClose} className="text-steel hover:text-bone cursor-pointer"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Media preview */}
          <div className="aspect-video rounded-xl overflow-hidden relative flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)" }}>
            {form.image_url ? (
              <img src={form.image_url} alt="" className="w-full h-full object-cover" />
            ) : form.video_url ? (
              <div className="flex flex-col items-center gap-2 text-steel">
                <Play size={32} />
                <span className="font-mono text-xs">Video uploaded</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-steel/40">
                <ImageIcon size={32} />
                <span className="font-mono text-xs">No media yet</span>
              </div>
            )}
          </div>

          {/* Upload button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs text-bone/70 hover:text-bone transition-colors cursor-pointer disabled:opacity-40"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
              <Upload size={13} className={uploading ? "animate-pulse" : ""} />
              {uploading ? "Uploading…" : "Upload Photo or Video"}
            </button>
            {uploadMsg && <span className="font-mono text-xs text-green-400">{uploadMsg}</span>}
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
          </div>

          {/* Or paste video URL */}
          <div>
            <label className="font-mono text-[10px] text-steel/60 block mb-1">OR PASTE VIDEO URL (Facebook, YouTube, direct mp4…)</label>
            <input
              value={form.video_url}
              onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              placeholder="https://facebook.com/watch/..."
              className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono"
              style={inputSt} />
          </div>

          {/* Title */}
          <div>
            <label className="font-mono text-[10px] text-steel/60 block mb-1">TITLE</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Custom enclosure"
              className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono" style={inputSt} />
          </div>

          {/* Client */}
          <div>
            <label className="font-mono text-[10px] text-steel/60 block mb-1">CLIENT / PROJECT TYPE</label>
            <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
              placeholder="e.g. Local electronics shop"
              className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono" style={inputSt} />
          </div>

          {/* Material */}
          <div>
            <label className="font-mono text-[10px] text-steel/60 block mb-1">MATERIAL</label>
            <select value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono cursor-pointer" style={inputSt}>
              {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Notes / Caption */}
          <div>
            <label className="font-mono text-[10px] text-steel/60 block mb-1">CAPTION / NOTES</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} placeholder="Describe the project, challenge, or result…"
              className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono resize-none" style={inputSt} />
          </div>

          {/* Sort + Visible row */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="font-mono text-[10px] text-steel/60 block mb-1">SORT ORDER</label>
              <input type="number" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono" style={inputSt} />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => setForm(f => ({ ...f, visible: !f.visible }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs cursor-pointer transition-colors ${form.visible ? "text-green-400" : "text-steel"}`}
                style={{ border: `1px solid ${form.visible ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.09)"}` }}>
                {form.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                {form.visible ? "Visible" : "Hidden"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl font-mono text-xs text-steel hover:text-bone cursor-pointer"
            style={{ border: "1px solid rgba(255,255,255,0.09)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            <Save size={13} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [editing, setEditing] = useState<Partial<GalleryItem> & { id?: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t);
    setLoading(true);
    const r = await fetch("/api/admin/gallery", { headers: { Authorization: `Bearer ${t}` } });
    if (r.status === 401) { router.push("/admin/login"); return; }
    setItems(await r.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this gallery item?")) return;
    setDeleting(id);
    await fetch(`/api/admin/gallery/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems(i => i.filter(x => x.id !== id));
    setDeleting(null);
  }

  async function handleToggleVisible(item: GalleryItem) {
    const r = await fetch(`/api/admin/gallery/${item.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !item.visible }),
    });
    if (r.ok) {
      const updated = await r.json();
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
    }
  }

  function handleSaved(saved: GalleryItem) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next;
      }
      return [...prev, saved].sort((a, b) => a.sort_order - b.sort_order);
    });
    setEditing(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-steel hover:text-bone transition-colors cursor-pointer">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="font-display font-extrabold text-xl">Gallery</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D · MANAGE PORTFOLIO</div>
          </div>
        </div>
        <button
          onClick={() => setEditing({ visible: true, material: "PLA", sort_order: items.length })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer"
          style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
          <Plus size={14} /> ADD ITEM
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-white/10 border-t-amber rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className={`rounded-xl overflow-hidden transition-opacity ${item.visible ? "" : "opacity-50"}`} style={glass}>
              {/* Thumbnail */}
              <div className="aspect-video relative overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : item.video_url ? (
                  <div className="flex flex-col items-center gap-1 text-steel/50">
                    <Play size={28} />
                    <span className="font-mono text-[9px]">VIDEO</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-steel/30">
                    <ImageIcon size={28} />
                    <span className="font-mono text-[9px]">COMING SOON</span>
                  </div>
                )}
                {/* Material badge */}
                <div className="absolute top-2 right-2 font-mono text-[9px] font-bold px-2 py-0.5 rounded text-ironworks"
                  style={{ background: "#ffb547" }}>
                  {item.material}
                </div>
                {/* Hidden badge */}
                {!item.visible && (
                  <div className="absolute top-2 left-2 font-mono text-[9px] font-bold px-2 py-0.5 rounded text-white"
                    style={{ background: "rgba(0,0,0,0.6)" }}>
                    HIDDEN
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="font-display font-bold text-base mb-0.5">{item.title || "—"}</div>
                {item.client && <div className="font-mono text-[9px] text-amber/70 mb-2">{item.client}</div>}
                {item.notes && <p className="text-bone/40 text-xs leading-relaxed line-clamp-2">{item.notes}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 pb-4">
                <button onClick={() => setEditing(item)}
                  className="flex-1 py-1.5 rounded-lg font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  Edit
                </button>
                <button onClick={() => handleToggleVisible(item)}
                  className="p-1.5 rounded-lg text-steel hover:text-bone transition-colors cursor-pointer"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  title={item.visible ? "Hide from public" : "Show to public"}>
                  {item.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="p-1.5 rounded-lg text-steel hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="col-span-3 text-center py-20 text-steel">
              <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
              <div className="font-mono text-xs">No gallery items yet — click ADD ITEM to start</div>
            </div>
          )}
        </div>
      )}

      {editing && (
        <EditModal
          item={editing}
          token={token}
          onSave={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
