// ─── lib/stl.ts — REPLACE quoteFromGeometry with this version ───
// This removes the flat $12 setup fee from the per-part estimate.
// Setup & Handling is now computed at the CART level (see cart page changes).

export function quoteFromGeometry(
  volumeMm3: number,
  material: MaterialKey,
  quality: QualityKey,
  infill: number
): { grams: number; hours: number; price: number; fromSlicer: boolean; breakdown: { material: number; machine: number; setup: number } } {
  const mat = MATERIALS[material];
  const q   = QUALITIES[quality];
  const grams = (volumeMm3 / 1000) * mat.density * (0.12 + (1 - 0.12) * (infill / 100));
  const hours = (grams / 10) * q.mult;
  const matCost     = (grams / 1000) * mat.costPerKg * 2.5;
  const machineCost = hours * 0.50;
  const price = Math.max(4, Math.round((matCost + machineCost) * 100) / 100);
  return { grams: Math.round(grams * 10) / 10, hours: Math.round(hours * 10) / 10, price, fromSlicer: false, breakdown: { material: matCost, machine: machineCost, setup: 0 } };
}

// ─── ADD this new exported helper — cart-wide Setup & Handling calculator ───
// Used by both the customer quote page and the admin quote builder.

export const JOB_SETUP_FEE = 12;      // first unit in the cart
export const HANDLING_FEE_PER_UNIT = 4; // every additional unit, including qty>1 of the same part

export function computeSetupAndHandling(totalUnits: number): {
  setupFee: number;
  handlingFee: number;
  handlingUnits: number;
  total: number;
} {
  if (totalUnits <= 0) return { setupFee: 0, handlingFee: 0, handlingUnits: 0, total: 0 };
  const handlingUnits = Math.max(0, totalUnits - 1);
  const setupFee = JOB_SETUP_FEE;
  const handlingFee = handlingUnits * HANDLING_FEE_PER_UNIT;
  return { setupFee, handlingFee, handlingUnits, total: setupFee + handlingFee };
}
