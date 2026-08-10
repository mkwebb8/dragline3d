"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Upload, Save, X, Box, Image as ImageIcon } from "lucide-react";
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

const CATEGORIES = ["Home & Decor", "Organization", "Tools & Gadgets", "Toys & Games", "Cosplay & Props", "Automotive", "Electronics Enclosures", "Other"];

type CatalogItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string;
  file_name: string;
  image_url: string | null;
  published: boolean;
  sort_order: number;
};

function EditModal({ item, token, onSave, onClose }: {
  item: Partial<CatalogItem> & { id?: string };
  token: string;
  onSave: (saved: CatalogItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: item.title || "",
    description: item.description || "",
    category: item.category || CATEGORIES[0],
    file_url: item.file_url || "",
    file_name: item.file_name || "",
    image_url: item.image_url || "",
    published: item.published ?? false,
    sort_order: item.sort_order ?? 0,
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const isNew = !item.id;

  async function uploadTo(file: File, kind: "file" | "image") {
    kind === "file" ? setUploadingFile(true) : setUploadingImage(true);
    setUploadMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/catalog/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    kind === "file" ? setUploadingFile(false) : setUploadingImage(false);
    if (!r.ok) { setUploadMsg("Upload failed"); return; }
    const { url, fileName } = await r.json();
    if (kind === "file") {
      setForm(f => ({ ...f, file_url: url, file_name: fileName }));
    } else {
      setForm(f => ({ ...f, image_url: url }));
    }
    setUploadMsg("Uploaded");
    setTimeout(() => setUploadMsg(""), 3000);
  }

  async function handleSave() {
    if (!form.file_url) { setUploadMsg("Upload a design file first"); return; }
    setSaving(true);
    const url = isNew ? "/api/admin/catalog" : `/api/admin/catalog/${item.id}`;
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
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <span className="font-mono text-xs tracking-widest">{isNew ? "NEW CATALOG ITEM" : "EDIT ITEM"}</span>
          <button onClick={onClose} className="text-steel hover:text-bone cursor-pointer"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="aspect-video rounded-xl overflow-hidden relative flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)" }}>
            {form.image_url ? (
              <img src={form.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-steel/40">
                <ImageIcon size={32} />
                <span className="font-mono text-xs">No thumbnail yet</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingFile}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs text-bone/70 hover:text-bone transition-colors cursor-pointer disabled:opacity-40"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
              <Box size={13} className={uploadingFile ? "animate-pulse" : ""} />
              {uploadingFile ? "Uploading..." : form.file_name ? "Replace Design File" : "Upload Design File"}
            </button>
            <button
              onClick={() => imageRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs text-bone/70 hover:text-bone transition-colors cursor-pointer disabled:opacity-40"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
              <Upload size={13} className={uploadingImage ? "animate-pulse" : ""} />
              {uploadingImage ? "Uploading..." : "Upload Thumbnail"}
            </button>
            {uploadMsg && <span className="font-mono text-xs text-green-400">{uploadMsg}</span>}
            <input ref={fileRef} type="file" accept=".stl,.3mf,.step,.stp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadTo(f, "file"); e.target.value = ""; }} />
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadTo(f, "image"); e.target.value = ""; }} />
          </div>
          {form.file_name && (
            <div className="font-mono text-[10px] text-amber/70">Design file: {form.file_name}</div>
          )}

          <div>
            <label className="font-mono text-[10px] text-steel/60 block mb-1">TITLE</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Modular desk organizer"
              className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono" style={inputSt} />
          </div>

          <div>
            <label className="font-mono text-[10px] text-steel/60 block mb-1">DESCRIPTION</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Short description shown to customers..."
              className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono resize-none" style={inputSt} />
          </div>

          <div>
            <label className="font-mono text-[10px] text-steel/60 block mb-1">CATEGORY</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono cursor-pointer" style={inputSt}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="font-mono text-[10px] text-steel/60 block mb-1">SORT ORDER</label>
              <input type="number" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg text-bone text-sm font-mono" style={inputSt} />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => setForm(f => ({ ...f, published: !f.published }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs cursor-pointer transition-colors ${form.published ? "text-green-400" : "text-steel"}`}
                style={{ border: `1px solid ${form.published ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.09)"}` }}>
                {form.published ? <Eye size={13} /> : <EyeOff size={13} />}
                {form.published ? "Published" : "Draft"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl font-mono text-xs text-steel hover:text-bone cursor-pointer"
            style={{ border: "1px solid rgba(255,255,255,0.09)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-mono text-xs font-bold text-ironworks cursor-pointer disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)" }}>
            <Save size={13} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [editing, setEditing] = useState<Partial<CatalogItem> & { id?: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    const t = localStorage.getItem("dragline_admin_token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t);
    setLoading(true);
    const r = await fetch("/api/admin/catalog", { headers: { Authorization: `Bearer ${t}` } });
    if (r.status === 401) { router.push("/admin/login"); return; }
    setItems(await r.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this catalog item?")) return;
    setDeleting(id);
    await fetch(`/api/admin/catalog/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems(i => i.filter(x => x.id !== id));
    setDeleting(null);
  }

  async function handleTogglePublished(item: CatalogItem) {
    const r = await fetch(`/api/admin/catalog/${item.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ published: !item.published }),
    });
    if (r.ok) {
      const updated = await r.json();
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
    }
  }

  function handleSaved(saved: CatalogItem) {
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-steel hover:text-bone transition-colors cursor-pointer">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="font-display font-extrabold text-xl">Catalog</div>
            <div className="font-mono text-xs text-steel">DRAGLINE 3D - MANAGE PRE-MADE DESIGNS</div>
          </div>
        </div>
        <button
          onClick={() => setEditing({ published: false, category: CATEGORIES[0], sort_order: items.length })}
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
            <div key={item.id} className={`rounded-xl overflow-hidden transition-opacity ${item.published ? "" : "opacity-50"}`} style={glass}>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-steel/30">
                    <Box size={28} />
                    <span className="font-mono text-[9px]">NO THUMBNAIL</span>
                  </div>
                )}
                {item.category && (
                  <div className="absolute top-2 right-2 font-mono text-[9px] font-bold px-2 py-0.5 rounded text-ironworks"
                    style={{ background: "#ffb547" }}>
                    {item.category}
                  </div>
                )}
                {!item.published && (
                  <div className="absolute top-2 left-2 font-mono text-[9px] font-bold px-2 py-0.5 rounded text-white"
                    style={{ background: "rgba(0,0,0,0.6)" }}>
                    DRAFT
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="font-display font-bold text-base mb-0.5">{item.title || "-"}</div>
                <div className="font-mono text-[9px] text-amber/70 mb-2">{item.file_name}</div>
                {item.description && <p className="text-bone/40 text-xs leading-relaxed line-clamp-2">{item.description}</p>}
              </div>
              <div className="flex items-center gap-2 px-4 pb-4">
                <button onClick={() => setEditing(item)}
                  className="flex-1 py-1.5 rounded-lg font-mono text-xs text-bone/60 hover:text-bone transition-colors cursor-pointer"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  Edit
                </button>
                <button onClick={() => handleTogglePublished(item)}
                  className="p-1.5 rounded-lg text-steel hover:text-bone transition-colors cursor-pointer"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  title={item.published ? "Unpublish" : "Publish"}>
                  {item.published ? <Eye size={13} /> : <EyeOff size={13} />}
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

          {items.length === 0 && (
            <div className="col-span-3 text-center py-20 text-steel">
              <Box size={32} className="mx-auto mb-3 opacity-30" />
              <div className="font-mono text-xs">No catalog items yet - click ADD ITEM to start</div>
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
