// ─── Geometry helpers ───────────────────────────────────────────────
import * as THREE from "three";

export function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const view = new DataView(buffer);
  // Try binary STL first
  const numTriangles = view.getUint32(80, true);
  if (buffer.byteLength === 84 + numTriangles * 50) {
    const positions: number[] = [];
    let offset = 84;
    for (let i = 0; i < numTriangles; i++) {
      offset += 12; // skip normal
      for (let v = 0; v < 3; v++) {
        positions.push(
          view.getFloat32(offset, true),
          view.getFloat32(offset + 4, true),
          view.getFloat32(offset + 8, true)
        );
        offset += 12;
      }
      offset += 2; // attribute byte count
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }
  // ASCII STL fallback
  const text = new TextDecoder().decode(buffer);
  const positions: number[] = [];
  const vertexRe = /vertex\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = vertexRe.exec(text)) !== null) {
    positions.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function computeVolume(geo: THREE.BufferGeometry): number {
  const pos = geo.attributes.position;
  let vol = 0;
  for (let i = 0; i < pos.count; i += 3) {
    const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
    const bx = pos.getX(i+1), by = pos.getY(i+1), bz = pos.getZ(i+1);
    const cx = pos.getX(i+2), cy = pos.getY(i+2), cz = pos.getZ(i+2);
    vol += (ax*(by*cz - bz*cy) + bx*(cy*az - cz*ay) + cx*(ay*bz - az*by)) / 6;
  }
  return Math.abs(vol);
}

// ─── Materials ──────────────────────────────────────────────────────
export const MATERIALS = {
  PLA:         { label: "PLA",        desc: "General purpose, biodegradable",              costPerKg: 16,    swatch: "#e8e6e1", density: 1.24 },
  PCTG:        { label: "Pro PCTG",   desc: "Up to 20x tougher than PETG, UV stable",      costPerKg: 29.95, swatch: "#c8d4d1", density: 1.27 },
  TPU:         { label: "TPU",        desc: "Flexible, gaskets and grips",                 costPerKg: 24,    swatch: "#3a3a3c", density: 1.21 },
  ABS:         { label: "ABS",        desc: "High temp, impact resistant",                 costPerKg: 24,    swatch: "#5a5a5e", density: 1.04 },
  ASA:         { label: "ASA",        desc: "UV-stable, outdoor parts",                    costPerKg: 22,    swatch: "#7a7a7e", density: 1.07 },
  "PET-GF15":  { label: "PET-GF15",  desc: "Glass-fiber PET, precision jigs and fixtures", costPerKg: 30,    swatch: "#a8c4b0", density: 1.45 },
  "PETG-ESD":  { label: "PETG-ESD",  desc: "Electrostatic dissipative, electronics use",  costPerKg: 66,    swatch: "#4a90d9", density: 1.27 },
  PA:          { label: "PA (Nylon)", desc: "Wear-resistant, gears and load-bearing",      costPerKg: 35,    swatch: "#d4cfb5", density: 1.14 },
  "ASA-CF":    { label: "ASA-CF",    desc: "Carbon-reinforced ASA, UV stable",             costPerKg: 40,    swatch: "#1a1a1c", density: 1.11 },
  "PETG-CF":   { label: "PETG-CF",   desc: "Carbon-reinforced PETG (Fiberon)",             costPerKg: 40,    swatch: "#1a1a1c", density: 1.31 },
  "PA-CF":     { label: "PA-CF",     desc: "Carbon-reinforced nylon (Fiberon)",            costPerKg: 80,    swatch: "#1a1a1c", density: 1.18 },
} as const;

export type MaterialKey = keyof typeof MATERIALS;

// ─── Colors per material ─────────────────────────────────────────────
const NEUTRAL: { name: string; hex: string }[] = [
  { name: "Midnight Black", hex: "#1a1a1c" },
  { name: "Snow White",     hex: "#f0ede8" },
  { name: "Charcoal Gray",  hex: "#4a4a4e" },
  { name: "Natural",        hex: "#e8dcc8" },
];

const STANDARD_COLORS: { name: string; hex: string }[] = [
  ...NEUTRAL,
  { name: "Red",    hex: "#c0392b" },
  { name: "Blue",   hex: "#2471a3" },
  { name: "Yellow", hex: "#d4ac0d" },
  { name: "Orange", hex: "#ca6f1e" },
  { name: "Green",  hex: "#1e8449" },
];

const BLACK_ONLY: { name: string; hex: string }[] = [
  { name: "Midnight Black", hex: "#1a1a1c" },
];

export const MATERIAL_COLORS: Record<MaterialKey, { name: string; hex: string }[]> = {
  PLA:        STANDARD_COLORS,
  PCTG:       STANDARD_COLORS,
  TPU:        STANDARD_COLORS,
  ABS:        STANDARD_COLORS,
  ASA:        STANDARD_COLORS,
  "PET-GF15": NEUTRAL,
  "PETG-ESD": BLACK_ONLY,
  PA:         NEUTRAL,
  "ASA-CF":   BLACK_ONLY,
  "PETG-CF":  BLACK_ONLY,
  "PA-CF":    BLACK_ONLY,
};

// ─── Qualities ──────────────────────────────────────────────────────
export const QUALITIES = {
  draft:    { label: "0.28", desc: "Draft",    layerHeight: 0.28, mult: 0.7  },
  fast:     { label: "0.24", desc: "Fast",     layerHeight: 0.24, mult: 0.85 },
  standard: { label: "0.20", desc: "Standard", layerHeight: 0.20, mult: 1.0  },
  fine:     { label: "0.12", desc: "Fine",     layerHeight: 0.12, mult: 1.6  },
} as const;

export type QualityKey = keyof typeof QUALITIES;

// ─── Pricing ────────────────────────────────────────────────────────
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
  const setupCost   = 12;
  const price = Math.max(8, Math.round((matCost + machineCost + setupCost) * 100) / 100);
  return { grams: Math.round(grams * 10) / 10, hours: Math.round(hours * 10) / 10, price, fromSlicer: false, breakdown: { material: matCost, machine: machineCost, setup: setupCost } };
}
