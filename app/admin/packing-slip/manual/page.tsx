"use client";
export const runtime = "edge";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText, ArrowLeft } from "lucide-react";



const glass = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };
const inputSt = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, color: "#f5f0e8", fontFamily: "monospace", fontSize: 13, padding: "6px 10px", width: "100%" };

const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU", "PLA-CF", "PETG-CF", "PA-CF", "ASA-CF", "PC", "PA"];
const QUALITIES = ["draft", "fast", "standard", "fine"];

interface Part { name: string; material: string; color: string; quality: string; infill: number; qty: number; }

const emptyPart = (): Part => ({ name: "", material: "PLA", color: "Midnight Black", quality: "standard", infill: 20, qty: 1 });

// Draw the DraglineMark logo using jsPDF vector primitives
// SVG viewBox: 0 0 140 140 — 8 stacked rects + amber diagonal cable
function drawLogo(doc: any, ox: number, oy: number, size: number) {
  const s = size / 140;
  const rects: [number,number,number,number][] = [
    [28,26,58,6],[28,38,74,6],[28,50,82,6],[28,62,84,6],
    [28,74,84,6],[28,86,82,6],[28,98,74,6],[28,110,58,6],
  ];
  doc.setFillColor(20, 20, 20);
  for (const [x,y,w,h] of rects) {
    doc.roundedRect(ox+x*s, oy+y*s, w*s, h*s, 0.4, 0.4, "F");
  }
  doc.setDrawColor(255, 181, 71);
  doc.setLineWidth(size*4/140);
  doc.setLineCap("round");
  doc.line(ox+36*s, oy+116*s, ox+108*s, oy+32*s);
  doc.setLineCap("square");
  doc.setLineWidth(0.3);
}

export default function ManualPackingSlip() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("Peter");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [shippingService, setShippingService] = useState("USPS Priority");
  const [tracking, setTracking] = useState("");
  const [parts, setParts] = useState<Part[]>([emptyPart()]);
  const [generating, setGenerating] = useState(false);

  function updatePart(i: number, field: keyof Part, val: any) {
    setParts(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function addPart() { setParts(p => [...p, emptyPart()]); }
  function removePart(i: number) { setParts(p => p.filter((_, idx) => idx !== i)); }

  async function generate() {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "letter" });
      const W = 215.9;
      const margin = 20;
      let y = 20;

      // Logo
      drawLogo(doc, margin, y - 10, 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 20);
      doc.text("DRAGLINE 3D", margin + 22, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Layer by layer · dragline3d.com", margin + 22, y + 5);

      // Date top right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), W - margin, y, { align: "right" });

      // PACKING SLIP badge
      doc.setFillColor(20, 20, 20);
      doc.roundedRect(W - margin - 24, y + 8, 24, 6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("PACKING SLIP", W - margin - 12, y + 12.5, { align: "center" });
      y += 22;

      doc.setDrawColor(20, 20, 20);
      doc.setLineWidth(0.5);
      doc.line(margin, y, W - margin, y);
      y += 8;

      // Ship To + Shipping Method
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("SHIP TO", margin, y);
      doc.text("SHIPPING METHOD", margin + 80, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text(customerName || "", margin, y);
      doc.text(shippingService || "—", margin + 80, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      if (address) { doc.text(address, margin, y); y += 4; }
      if (city || state || zip) { doc.text(`${city}, ${state} ${zip}`.trim(), margin, y); y += 4; }
      doc.setTextColor(120, 120, 120);
      if (email) doc.text(email, margin, y);
      if (tracking) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("TRACKING", margin + 80, y - 3);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        doc.text(tracking, margin + 80, y + 2);
      }
      y += 10;

      // Table header
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, W - margin, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("PART", margin + 2, y);
      doc.text("MATERIAL", margin + 80, y);
      doc.text("COLOR", margin + 110, y);
      doc.text("QUALITY", margin + 138, y);
      doc.text("INFILL", margin + 161, y);
      doc.text("QTY", W - margin, y, { align: "right" });
      y += 3;
      doc.line(margin, y, W - margin, y);
      y += 4;

      // Rows
      for (const item of parts) {
        if (!item.name) continue;
        const fname = item.name.replace(/\.(stl|3mf|step|stp)$/i, "");
        const truncated = fname.length > 30 ? fname.slice(0, 28) + "…" : fname;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        doc.text(truncated, margin + 2, y + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.text(item.material, margin + 80, y + 4);
        doc.text(item.color || "—", margin + 110, y + 4);
        doc.text(item.quality, margin + 138, y + 4);
        doc.text(`${item.infill}%`, margin + 161, y + 4);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 20, 20);
        doc.text(String(item.qty), W - margin, y + 4, { align: "right" });
        y += 10;
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, y, W - margin, y);
        y += 2;
      }

      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, W - margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for your order · questions? info@dragline3d.com", margin, y);
      doc.text("dragline3d.com", W - margin, y, { align: "right" });

      doc.output("dataurlnewwindow");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e0f", color: "#f5f0e8", fontFamily: "monospace", padding: "32px 24px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#7a7a7a", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ flex: 1 }} />
          <FileText size={16} style={{ color: "#ffb547" }} />
          <span style={{ fontSize: 13, color: "#ffb547", letterSpacing: 2 }}>MANUAL PACKING SLIP</span>
        </div>

        {/* Customer */}
        <div style={{ ...glass, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#7a7a7a", letterSpacing: 2, marginBottom: 14 }}>SHIP TO</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#7a7a7a", marginBottom: 4 }}>NAME</div>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" style={inputSt} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#7a7a7a", marginBottom: 4 }}>EMAIL</div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" style={inputSt} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, color: "#7a7a7a", marginBottom: 4 }}>ADDRESS</div>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" style={inputSt} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#7a7a7a", marginBottom: 4 }}>CITY</div>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" style={inputSt} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#7a7a7a", marginBottom: 4 }}>STATE</div>
                <input value={state} onChange={e => setState(e.target.value)} placeholder="NY" style={inputSt} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#7a7a7a", marginBottom: 4 }}>ZIP</div>
                <input value={zip} onChange={e => setZip(e.target.value)} placeholder="10001" style={inputSt} />
              </div>
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div style={{ ...glass, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#7a7a7a", letterSpacing: 2, marginBottom: 14 }}>SHIPPING</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#7a7a7a", marginBottom: 4 }}>SERVICE</div>
              <input value={shippingService} onChange={e => setShippingService(e.target.value)} placeholder="USPS Priority" style={inputSt} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#7a7a7a", marginBottom: 4 }}>TRACKING #</div>
              <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="9400111899223456789012" style={inputSt} />
            </div>
          </div>
        </div>

        {/* Parts */}
        <div style={{ ...glass, borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#7a7a7a", letterSpacing: 2 }}>PARTS</div>
            <button onClick={addPart} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,181,71,0.12)", border: "1px solid rgba(255,181,71,0.25)", borderRadius: 8, color: "#ffb547", cursor: "pointer", fontSize: 11, padding: "4px 12px" }}>
              <Plus size={12} /> Add Part
            </button>
          </div>

          {parts.map((p, i) => (
            <div key={i} style={{ ...glass, borderRadius: 10, padding: 14, marginBottom: 10, position: "relative" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#7a7a7a", marginBottom: 3 }}>PART NAME</div>
                  <input value={p.name} onChange={e => updatePart(i, "name", e.target.value)} placeholder="filename.stl" style={inputSt} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#7a7a7a", marginBottom: 3 }}>MATERIAL</div>
                  <select value={p.material} onChange={e => updatePart(i, "material", e.target.value)}
                    style={{ ...inputSt, appearance: "none" as any }}>
                    {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#7a7a7a", marginBottom: 3 }}>COLOR</div>
                  <input value={p.color} onChange={e => updatePart(i, "color", e.target.value)} placeholder="Midnight Black" style={inputSt} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 60px", gap: 10, alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#7a7a7a", marginBottom: 3 }}>QUALITY</div>
                  <select value={p.quality} onChange={e => updatePart(i, "quality", e.target.value)}
                    style={{ ...inputSt, appearance: "none" as any }}>
                    {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#7a7a7a", marginBottom: 3 }}>INFILL %</div>
                  <input type="number" min={5} max={100} step={5} value={p.infill}
                    onChange={e => updatePart(i, "infill", parseInt(e.target.value) || 20)} style={inputSt} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#7a7a7a", marginBottom: 3 }}>QTY</div>
                  <input type="number" min={1} max={99} value={p.qty}
                    onChange={e => updatePart(i, "qty", parseInt(e.target.value) || 1)} style={inputSt} />
                </div>
                {parts.length > 1 && (
                  <button onClick={() => removePart(i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Generate button */}
        <button onClick={generate} disabled={generating}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: generating ? "rgba(255,181,71,0.15)" : "rgba(255,181,71,0.18)", border: "1px solid rgba(255,181,71,0.35)", color: "#ffb547", fontSize: 13, fontFamily: "monospace", letterSpacing: 2, cursor: generating ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <FileText size={15} />
          {generating ? "GENERATING..." : "GENERATE PACKING SLIP"}
        </button>

      </div>
    </div>
  );
}
