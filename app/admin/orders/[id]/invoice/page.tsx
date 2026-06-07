"use client";
export const runtime = "edge";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

// npm install html2canvas jspdf   ← required
// TrueNAS CORS: System → General Settings → add your admin app origin

const SQUARE_PCT = 0.029;
const SQUARE_FIXED = 0.30;
const COST_PER_KG: Record<string, number> = {
  PLA: 16, PETG: 18, TPU: 24, ABS: 20, ASA: 22, "PET-GF15": 30,
  "PETG-ESD": 66, PA: 35, "ASA-CF": 40, "PETG-CF": 40, "PA-CF": 80, PCTG: 29.95,
};
const NAS_BASE = "/mnt/media3/dragline3d";
const PAID_STATUSES = ["shipped", "delivered", "quality_check", "printing", "queued", "received"];

function fc(n: number) { return `$${n.toFixed(2)}`; }
function fDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

type NasStatus = "idle" | "saving" | "saved" | "error" | "no-config";

export default function InvoicePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [order, setOrder] = useState<any>(null);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nasStatus, setNasStatus] = useState<NasStatus>("idle");
  const [nasError, setNasError] = useState<string | null>(null);
  const [showNasConfig, setShowNasConfig] = useState(false);
  const [nasUrlInput, setNasUrlInput] = useState("");
  const [nasKeyInput, setNasKeyInput] = useState("");
  const invoiceRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("dragline_admin_token");
    if (!token) { router.push("/admin/login"); return; }
    Promise.all([
      fetch(`/api/admin/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/inventory/boxes", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([ord, bxs]) => {
      setOrder(ord);
      setBoxes(bxs);
      setLoading(false);
    });
    setNasUrlInput(localStorage.getItem("truenas_url") || "");
    setNasKeyInput(localStorage.getItem("truenas_key") || "");
  }, [id, router]);

  async function saveToNas(orderData: any) {
    const nasUrl = localStorage.getItem("truenas_url");
    const nasKey = localStorage.getItem("truenas_key");
    if (!nasUrl || !nasKey) { setNasStatus("no-config"); return; }
    if (!invoiceRef.current) return;

    setNasStatus("saving");
    setNasError(null);

    try {
      // Dynamically import so these don't affect SSR bundle
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Capture the dark invoice at 2× resolution
      const canvas = await html2canvas(invoiceRef.current, {
        backgroundColor: "#080808",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      const pdfBytes = pdf.output("arraybuffer");

      const orderId = (orderData.id || "UNKNOWN").toUpperCase();
      const month = orderData.created_at?.slice(0, 7) || new Date().toISOString().slice(0, 7);

      const paths = [
        `${NAS_BASE}/orders/${orderId}/invoice.pdf`,
        `${NAS_BASE}/records/${month}/${orderId}-invoice.pdf`,
      ];

      for (const path of paths) {
        const fd = new FormData();
        fd.append("data", JSON.stringify({ path, mode: "0644" }));
        fd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "invoice.pdf");

        const res = await fetch(`${nasUrl}/api/v2.0/filesystem/put`, {
          method: "POST",
          headers: { Authorization: `Bearer ${nasKey}` },
          body: fd,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `TrueNAS responded ${res.status}`);
        }
      }

      setNasStatus("saved");
    } catch (err: any) {
      setNasStatus("error");
      setNasError(
        err.message?.includes("Failed to fetch")
          ? "Cannot reach TrueNAS — check the URL and that CORS is enabled (System → General Settings → UI → Allowed Origins)"
          : err.message || "Unknown error"
      );
    }
  }

  function saveNasConfig() {
    localStorage.setItem("truenas_url", nasUrlInput.replace(/\/$/, ""));
    localStorage.setItem("truenas_key", nasKeyInput);
    setShowNasConfig(false);
    setNasStatus("idle");
    if (order) saveToNas(order);
  }

  // On load: trigger print dialog + NAS save
  useEffect(() => {
    if (!loading && order) {
      const pt = setTimeout(() => window.print(), 600);
      saveToNas(order);
      return () => clearTimeout(pt);
    }
  }, [loading, order]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !order) return null;

  const items: any[] = order.order_items || [];
  const subtotal = order.subtotal || 0;
  const shipping = Number(order.shipping_cost || 0);
  const tax = Math.round(subtotal * 0.06 * 100) / 100;
  const total = order.total || (subtotal + tax + shipping);
  const isPaid = PAID_STATUSES.includes(order.status);
  const boxMap: Record<string, any> = {};
  for (const b of boxes) boxMap[b.id] = b;
  const selectedBox = order.box_id ? boxMap[order.box_id] : null;
  const invoiceNum = (order.id || "DRAFT").toUpperCase();
  const invoiceDate = order.created_at ? fDate(order.created_at) : "";
  const month = order.created_at?.slice(0, 7) || "";

  const nasStatusLabel: Record<NasStatus, { text: string; color: string }> = {
    idle:      { text: "—", color: "#7a7060" },
    saving:    { text: "Saving to NAS…", color: "#f59e0b" },
    saved:     { text: `Saved ✓  orders/${invoiceNum}/  +  records/${month}/`, color: "#4ade80" },
    error:     { text: "NAS error", color: "#f87171" },
    "no-config": { text: "TrueNAS not configured", color: "#f87171" },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #080808;
          color: #e8dfd0;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .mono { font-family: 'Space Mono', 'Courier New', monospace; }
        @media print {
          body { background: #fff !important; color: #1a1a1a !important; }
          .no-print { display: none !important; }
          .page { box-shadow: none !important; border: none !important; background: #fff !important; }
          .amber { color: #c47d00 !important; }
          .paid-badge { background: #dcfce7 !important; color: #15803d !important; border: 1.5px solid #86efac !important; }
          .header-bg { background: #f8f4ef !important; border-bottom: 2px solid #e8dfd0 !important; }
          .line-row:nth-child(even) { background: #f9f6f2 !important; }
          .total-row { background: #f0ebe3 !important; border-top: 1.5px solid #d0c8bc !important; }
          .divider { border-color: #d0c8bc !important; }
          .label-text { color: #6b6560 !important; }
          .footer-bg { background: #f8f4ef !important; border-top: 1px solid #e0d8cc !important; }
          .note-box { background: #f5f1eb !important; border: 1px solid #ddd5c8 !important; }
        }
      `}</style>

      {/* ── Top bar (hidden on print) ─────────────────────────────── */}
      <div className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#0d0d0d", borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 12,
      }}>
        {/* NAS status */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          {nasStatus === "saving" && (
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              border: "2px solid rgba(245,158,11,0.3)", borderTopColor: "#f59e0b",
              animation: "spin 0.8s linear infinite",
            }} />
          )}
          <span className="mono" style={{ fontSize: 11, color: nasStatusLabel[nasStatus].color }}>
            NAS: {nasStatusLabel[nasStatus].text}
          </span>
          {nasStatus === "error" && nasError && (
            <span className="mono" style={{ fontSize: 10, color: "#f87171", marginLeft: 4 }}>
              — {nasError}
            </span>
          )}
          {(nasStatus === "error" || nasStatus === "no-config") && (
            <button
              onClick={() => setShowNasConfig(true)}
              className="mono"
              style={{
                fontSize: 10, color: "#f59e0b", background: "none",
                border: "1px solid rgba(245,158,11,0.30)", borderRadius: 6,
                padding: "2px 8px", cursor: "pointer", marginLeft: 4,
              }}
            >
              Configure
            </button>
          )}
          {nasStatus === "saved" && (
            <button
              onClick={() => order && saveToNas(order)}
              className="mono"
              style={{
                fontSize: 10, color: "#7a7060", background: "none",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
                padding: "2px 8px", cursor: "pointer", marginLeft: 4,
              }}
            >
              Re-save
            </button>
          )}
        </div>

        {/* Config gear */}
        <button
          onClick={() => setShowNasConfig(v => !v)}
          title="TrueNAS settings"
          style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#7a7060", fontSize: 14,
          }}
        >⚙</button>

        <button
          onClick={() => window.print()}
          style={{
            background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
            color: "#1a1208", border: "none", borderRadius: 10,
            padding: "7px 16px", fontFamily: "'Space Mono', monospace",
            fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em",
          }}
        >
          SAVE / PRINT
        </button>
        <button
          onClick={() => window.close()}
          style={{
            background: "rgba(255,255,255,0.04)", color: "#7a7060",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
            padding: "7px 12px", fontFamily: "'Space Mono', monospace",
            fontSize: 11, cursor: "pointer",
          }}
        >✕</button>
      </div>

      {/* ── NAS config panel ─────────────────────────────────────── */}
      {showNasConfig && (
        <div className="no-print" style={{
          position: "fixed", top: 52, right: 20, zIndex: 200,
          background: "#141414", border: "1px solid rgba(255,181,71,0.20)",
          borderRadius: 14, padding: "20px 20px", width: 340,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <div className="mono" style={{ fontSize: 10, color: "#7a7060", letterSpacing: "0.12em", marginBottom: 14 }}>
            TRUENAS SETTINGS
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="mono" style={{ fontSize: 10, color: "#7a7060", display: "block", marginBottom: 4 }}>
              URL (e.g. http://192.168.1.100)
            </label>
            <input
              type="text" value={nasUrlInput}
              onChange={e => setNasUrlInput(e.target.value)}
              placeholder="http://192.168.x.x"
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
                color: "#e8dfd0", fontFamily: "monospace", fontSize: 12, outline: "none",
              }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="mono" style={{ fontSize: 10, color: "#7a7060", display: "block", marginBottom: 4 }}>
              API Key
            </label>
            <input
              type="password" value={nasKeyInput}
              onChange={e => setNasKeyInput(e.target.value)}
              placeholder="TrueNAS API key"
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
                color: "#e8dfd0", fontFamily: "monospace", fontSize: 12, outline: "none",
              }}
            />
          </div>
          <div className="mono" style={{ fontSize: 9, color: "#5a5245", marginBottom: 14, lineHeight: 1.6 }}>
            CORS required: TrueNAS → System → General Settings → UI → Allowed Origins → add your admin app domain
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={saveNasConfig}
              style={{
                flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer", fontWeight: 700,
                background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
                color: "#1a1208", border: "none", fontFamily: "'Space Mono', monospace", fontSize: 11,
              }}
            >SAVE & TEST</button>
            <button
              onClick={() => setShowNasConfig(false)}
              style={{
                padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                background: "rgba(255,255,255,0.04)", color: "#7a7060",
                border: "1px solid rgba(255,255,255,0.08)", fontFamily: "monospace", fontSize: 11,
              }}
            >Cancel</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Invoice content (captured for PDF) ───────────────────── */}
      <div style={{ paddingTop: 52 }}>
        <div ref={invoiceRef} className="page" style={{
          maxWidth: 780, margin: "0 auto", minHeight: "100vh",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
        }}>

          {/* Header */}
          <div className="header-bg" style={{
            background: "rgba(255,181,71,0.06)",
            borderBottom: "1px solid rgba(255,181,71,0.15)",
            padding: "36px 40px 28px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em", color: "#ffb547",
                }}>DRAGLINE 3D</div>
                <div className="mono label-text" style={{ fontSize: 10, letterSpacing: "0.14em", color: "#7a7060", marginTop: 3 }}>
                  FDM 3D PRINTING SERVICES · LOUISVILLE, KY
                </div>
                <div className="mono label-text" style={{ fontSize: 10, color: "#7a7060", marginTop: 2 }}>dragline3d.com</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#e8dfd0",
                }}>INVOICE</div>
                <div className="mono" style={{ fontSize: 11, color: "#ffb547", marginTop: 4 }}>#{invoiceNum}</div>
                <div className="mono label-text" style={{ fontSize: 10, color: "#7a7060", marginTop: 2 }}>{invoiceDate}</div>
                {isPaid && (
                  <div className="paid-badge" style={{
                    display: "inline-block", marginTop: 10,
                    background: "rgba(34,197,94,0.12)", color: "#4ade80",
                    border: "1.5px solid rgba(34,197,94,0.30)",
                    borderRadius: 6, padding: "3px 12px",
                    fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                  }}>PAID</div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div style={{ padding: "28px 40px 20px", display: "flex", gap: 48 }}>
            <div>
              <div className="mono label-text" style={{ fontSize: 9, letterSpacing: "0.15em", color: "#7a7060", marginBottom: 6 }}>BILL TO</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{order.customer_name || "—"}</div>
              {order.customer_email && (
                <div className="mono" style={{ fontSize: 11, color: "#9a9080", marginTop: 3 }}>{order.customer_email}</div>
              )}
            </div>
            <div>
              <div className="mono label-text" style={{ fontSize: 9, letterSpacing: "0.15em", color: "#7a7060", marginBottom: 6 }}>ORDER STATUS</div>
              <div style={{ fontWeight: 600, fontSize: 15, textTransform: "capitalize" }}>
                {order.status?.replace(/_/g, " ") || "—"}
              </div>
              {order.tracking_number && (
                <div className="mono" style={{ fontSize: 11, color: "#9a9080", marginTop: 3 }}>Tracking: {order.tracking_number}</div>
              )}
            </div>
          </div>

          <div className="divider" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0 40px" }} />

          {/* Line items */}
          <div style={{ padding: "20px 40px" }}>
            <div className="mono label-text" style={{
              display: "grid", gridTemplateColumns: "1fr 80px 90px 90px",
              fontSize: 9, letterSpacing: "0.14em", color: "#7a7060",
              paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}>
              <span>DESCRIPTION</span>
              <span style={{ textAlign: "center" }}>QTY</span>
              <span style={{ textAlign: "right" }}>UNIT PRICE</span>
              <span style={{ textAlign: "right" }}>TOTAL</span>
            </div>

            {items.map((item: any, i: number) => {
              const qty = item.qty || 1;
              const unitPrice = item.price || 0;
              const grams = (item.grams || 0) * qty;
              return (
                <div key={i} className="line-row" style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 90px 90px",
                  padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {item.name || item.description || "Custom 3D Print"}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "#9a9080", marginTop: 3 }}>
                      {item.material && <span style={{ color: "#ffb547" }}>{item.material}</span>}
                      {item.material && grams > 0 && <span style={{ color: "#6a6050" }}> · </span>}
                      {grams > 0 && <span>{grams.toFixed(0)}g filament</span>}
                      {(item.print_hours || item.hours) ? (
                        <span style={{ color: "#6a6050" }}> · {((item.print_hours || item.hours || 0) * qty).toFixed(1)}h print time</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 13, textAlign: "center", alignSelf: "center" }}>{qty}</div>
                  <div className="mono" style={{ fontSize: 13, textAlign: "right", alignSelf: "center" }}>{fc(unitPrice)}</div>
                  <div className="mono" style={{ fontSize: 13, textAlign: "right", alignSelf: "center", fontWeight: 700 }}>{fc(unitPrice * qty)}</div>
                </div>
              );
            })}

            {selectedBox && (
              <div className="line-row" style={{
                display: "grid", gridTemplateColumns: "1fr 80px 90px 90px",
                padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{selectedBox.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "#9a9080", marginTop: 3 }}>
                    {selectedBox.length_in}″ × {selectedBox.width_in}″ × {selectedBox.height_in}″ shipping box
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 13, textAlign: "center", alignSelf: "center" }}>1</div>
                <div className="mono" style={{ fontSize: 13, textAlign: "right", alignSelf: "center" }}>—</div>
                <div className="mono" style={{ fontSize: 13, textAlign: "right", alignSelf: "center", color: "#9a9080" }}>incl.</div>
              </div>
            )}

            {items.length === 0 && (
              <div className="mono" style={{ fontSize: 12, color: "#7a7060", padding: "16px 0" }}>No items</div>
            )}
          </div>

          {/* Totals */}
          <div style={{ padding: "0 40px 28px", marginTop: "auto" }}>
            <div style={{ maxWidth: 300, marginLeft: "auto" }}>
              {[
                { label: "Subtotal", value: fc(subtotal), color: "#e8dfd0" },
                { label: "KY Sales Tax (6%)", value: fc(tax), color: "#9a9080" },
                { label: "Shipping", value: shipping > 0 ? fc(shipping) : "—", color: "#9a9080" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <span className="mono label-text" style={{ fontSize: 11, color: "#7a7060" }}>{label}</span>
                  <span className="mono" style={{ fontSize: 12, color }}>{value}</span>
                </div>
              ))}
              <div className="total-row" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 10px", marginTop: 4,
                background: "rgba(255,181,71,0.07)", borderRadius: 8,
                border: "1px solid rgba(255,181,71,0.20)",
              }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "#7a7060" }}>TOTAL</span>
                <span className="amber" style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 800, fontSize: 22, color: "#ffb547",
                }}>{fc(total)}</span>
              </div>
              {isPaid && (
                <div className="mono" style={{
                  textAlign: "right", fontSize: 10, color: "#4ade80", marginTop: 6, letterSpacing: "0.06em",
                }}>✓ Payment received online</div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div style={{ padding: "0 40px 24px" }}>
              <div className="note-box" style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "14px 16px",
              }}>
                <div className="mono label-text" style={{ fontSize: 9, letterSpacing: "0.14em", color: "#7a7060", marginBottom: 6 }}>NOTES</div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>{order.notes}</div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="footer-bg" style={{
            background: "rgba(255,181,71,0.03)", borderTop: "1px solid rgba(255,181,71,0.10)",
            padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: "auto",
          }}>
            <div className="mono label-text" style={{ fontSize: 9, color: "#5a5245", letterSpacing: "0.08em" }}>
              DRAGLINE 3D LLC · LOUISVILLE, KY · dragline3d.com
            </div>
            <div className="mono label-text" style={{ fontSize: 9, color: "#5a5245" }}>
              Thank you for your business.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
