"use client";
export const runtime = "edge";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SQUARE_PCT = 0.029;
const SQUARE_FIXED = 0.30;
const COST_PER_KG: Record<string, number> = {
  PLA: 16, PETG: 18, TPU: 24, ABS: 20, ASA: 22, "PET-GF15": 30,
  "PETG-ESD": 66, PA: 35, "ASA-CF": 40, "PETG-CF": 40, "PA-CF": 80, PCTG: 29.95,
};

function fc(n: number) { return `$${n.toFixed(2)}`; }
function fDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
const PAID_STATUSES = ["shipped", "delivered", "quality_check", "printing", "queued", "received"];

export default function InvoicePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [order, setOrder] = useState<any>(null);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, [id, router]);

  // Auto-trigger print/save dialog once loaded
  useEffect(() => {
    if (!loading && order) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, order]);

  if (loading || !order) return null;

  const items: any[] = order.order_items || [];
  const subtotal = order.subtotal || 0;
  const shipping = Number(order.shipping_cost || 0);
  const tax = Math.round(subtotal * 0.06 * 100) / 100;
  const total = order.total || (subtotal + tax + shipping);
  const squareFee = Math.round((total * SQUARE_PCT + SQUARE_FIXED) * 100) / 100;
  const isPaid = PAID_STATUSES.includes(order.status);
  const boxMap: Record<string, any> = {};
  for (const b of boxes) boxMap[b.id] = b;
  const selectedBox = order.box_id ? boxMap[order.box_id] : null;
  const packagingCost = selectedBox ? Number(selectedBox.cost_each) || 0 : 0;
  const filamentCost = items.reduce((s: number, i: any) =>
    s + ((i.grams || 0) * (i.qty || 1) / 1000) * (COST_PER_KG[i.material] || 16), 0);

  // Build invoice number from order ID or created_at
  const invoiceNum = order.id?.toUpperCase() || "DRAFT";
  const invoiceDate = order.created_at ? fDate(order.created_at) : "";

  return (
    <>
      {/* ── Print stylesheet overrides ────────────────────────────── */}
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

        /* ── Print: switch to white paper ─────────────────────────── */
        @media print {
          body { background: #ffffff !important; color: #1a1a1a !important; }
          .no-print { display: none !important; }
          .page { box-shadow: none !important; border: none !important; background: #ffffff !important; }
          .amber { color: #c47d00 !important; }
          .paid-badge { background: #dcfce7 !important; color: #15803d !important; border: 1.5px solid #86efac !important; }
          .header-bg { background: #f8f4ef !important; border-bottom: 2px solid #e8dfd0 !important; }
          .line-row:nth-child(even) { background: #f9f6f2 !important; }
          .total-row { background: #f0ebe3 !important; border-top: 1.5px solid #d0c8bc !important; }
          .divider { border-color: #d0c8bc !important; }
          .label-text { color: #6b6560 !important; }
          .footer-bg { background: #f8f4ef !important; border-top: 1px solid #e0d8cc !important; }
          .note-box { background: #f5f1eb !important; border: 1px solid #ddd5c8 !important; }
          .cogs-row { background: #fafafa !important; border-top: 1px dashed #d0c8bc !important; }
        }
      `}</style>

      {/* ── Print button (hidden on print) ───────────────────────── */}
      <div className="no-print" style={{
        position: "fixed", top: 16, right: 16, zIndex: 100,
        display: "flex", gap: 8,
      }}>
        <button
          onClick={() => window.print()}
          style={{
            background: "linear-gradient(135deg, #ffb547 0%, #d99535 100%)",
            color: "#1a1208", border: "none", borderRadius: 10,
            padding: "8px 18px", fontFamily: "'Space Mono', monospace",
            fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em",
          }}
        >
          SAVE / PRINT
        </button>
        <button
          onClick={() => window.close()}
          style={{
            background: "rgba(255,255,255,0.06)", color: "#a09880",
            border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
            padding: "8px 14px", fontFamily: "'Space Mono', monospace",
            fontSize: 12, cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Invoice page ─────────────────────────────────────────── */}
      <div className="page" style={{
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
            {/* Brand */}
            <div>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em",
                color: "#ffb547",
              }}>
                DRAGLINE 3D
              </div>
              <div className="mono label-text" style={{
                fontSize: 10, letterSpacing: "0.14em", color: "#7a7060", marginTop: 3,
              }}>
                FDM 3D PRINTING SERVICES · LOUISVILLE, KY
              </div>
              <div className="mono label-text" style={{ fontSize: 10, color: "#7a7060", marginTop: 2 }}>
                dragline3d.com
              </div>
            </div>

            {/* Invoice meta + paid badge */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em",
                color: "#e8dfd0",
              }}>
                INVOICE
              </div>
              <div className="mono" style={{ fontSize: 11, color: "#ffb547", marginTop: 4 }}>
                #{invoiceNum}
              </div>
              <div className="mono label-text" style={{ fontSize: 10, color: "#7a7060", marginTop: 2 }}>
                {invoiceDate}
              </div>
              {isPaid && (
                <div className="paid-badge" style={{
                  display: "inline-block", marginTop: 10,
                  background: "rgba(34,197,94,0.12)", color: "#4ade80",
                  border: "1.5px solid rgba(34,197,94,0.30)",
                  borderRadius: 6, padding: "3px 12px",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                }}>
                  PAID
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ padding: "28px 40px 20px", display: "flex", gap: 48 }}>
          <div>
            <div className="mono label-text" style={{
              fontSize: 9, letterSpacing: "0.15em", color: "#7a7060", marginBottom: 6,
            }}>
              BILL TO
            </div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{order.customer_name || "—"}</div>
            {order.customer_email && (
              <div className="mono" style={{ fontSize: 11, color: "#9a9080", marginTop: 3 }}>
                {order.customer_email}
              </div>
            )}
          </div>
          <div>
            <div className="mono label-text" style={{
              fontSize: 9, letterSpacing: "0.15em", color: "#7a7060", marginBottom: 6,
            }}>
              ORDER STATUS
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, textTransform: "capitalize" }}>
              {order.status?.replace(/_/g, " ") || "—"}
            </div>
            {order.tracking_number && (
              <div className="mono" style={{ fontSize: 11, color: "#9a9080", marginTop: 3 }}>
                Tracking: {order.tracking_number}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="divider" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0 40px" }} />

        {/* Line items */}
        <div style={{ padding: "20px 40px" }}>
          {/* Table header */}
          <div className="mono label-text" style={{
            display: "grid",
            gridTemplateColumns: "1fr 80px 90px 90px",
            fontSize: 9, letterSpacing: "0.14em", color: "#7a7060",
            paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <span>DESCRIPTION</span>
            <span style={{ textAlign: "center" }}>QTY</span>
            <span style={{ textAlign: "right" }}>UNIT PRICE</span>
            <span style={{ textAlign: "right" }}>TOTAL</span>
          </div>

          {items.length === 0 && (
            <div className="mono" style={{ fontSize: 12, color: "#7a7060", padding: "16px 0" }}>No items</div>
          )}

          {items.map((item: any, i: number) => {
            const qty = item.qty || 1;
            const unitPrice = item.price || 0;
            const lineTotal = unitPrice * qty;
            const grams = (item.grams || 0) * qty;
            return (
              <div key={i} className="line-row" style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 90px 90px",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {item.name || item.description || `Custom 3D Print`}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "#9a9080", marginTop: 3 }}>
                    {item.material && <span style={{ color: "#ffb547" }}>{item.material}</span>}
                    {item.material && grams > 0 && <span style={{ color: "#6a6050" }}> · </span>}
                    {grams > 0 && <span>{grams.toFixed(0)}g filament</span>}
                    {item.print_hours || item.hours ? (
                      <span style={{ color: "#6a6050" }}> · {((item.print_hours || item.hours || 0) * qty).toFixed(1)}h print time</span>
                    ) : null}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 13, textAlign: "center", alignSelf: "center" }}>{qty}</div>
                <div className="mono" style={{ fontSize: 13, textAlign: "right", alignSelf: "center" }}>{fc(unitPrice)}</div>
                <div className="mono" style={{ fontSize: 13, textAlign: "right", alignSelf: "center", fontWeight: 700 }}>{fc(lineTotal)}</div>
              </div>
            );
          })}

          {/* Shipping box line if present */}
          {selectedBox && (
            <div className="line-row" style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 90px 90px",
              padding: "12px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
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
        </div>

        {/* Totals */}
        <div style={{ padding: "0 40px 28px", marginTop: "auto" }}>
          <div style={{ maxWidth: 300, marginLeft: "auto" }}>
            {[
              { label: "Subtotal", value: fc(subtotal), color: "#e8dfd0" },
              { label: "KY Sales Tax (6%)", value: fc(tax), color: "#9a9080" },
              { label: `Shipping`, value: shipping > 0 ? fc(shipping) : "—", color: "#9a9080" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <span className="mono label-text" style={{ fontSize: 11, color: "#7a7060" }}>{label}</span>
                <span className="mono" style={{ fontSize: 12, color }}>{value}</span>
              </div>
            ))}
            {/* Grand total */}
            <div className="total-row" style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 10px", marginTop: 4,
              background: "rgba(255,181,71,0.07)",
              borderRadius: 8, border: "1px solid rgba(255,181,71,0.20)",
            }}>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11, letterSpacing: "0.12em", color: "#7a7060",
              }}>TOTAL</span>
              <span className="amber" style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 800, fontSize: 22, color: "#ffb547",
              }}>{fc(total)}</span>
            </div>
            {isPaid && (
              <div className="mono" style={{
                textAlign: "right", fontSize: 10, color: "#4ade80", marginTop: 6,
                letterSpacing: "0.06em",
              }}>
                ✓ Payment received online
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{ padding: "0 40px 24px" }}>
            <div className="note-box" style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, padding: "14px 16px",
            }}>
              <div className="mono label-text" style={{
                fontSize: 9, letterSpacing: "0.14em", color: "#7a7060", marginBottom: 6,
              }}>NOTES</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>{order.notes}</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="footer-bg" style={{
          background: "rgba(255,181,71,0.03)",
          borderTop: "1px solid rgba(255,181,71,0.10)",
          padding: "20px 40px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
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
    </>
  );
}
