import * as THREE from "three";

export function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const view = new DataView(buffer);
  const isBinary = (() => {
    if (buffer.byteLength < 84) return false;
    const triCount = view.getUint32(80, true);
    return 80 + 4 + triCount * 50 === buffer.byteLength;
  })();

  const positions: number[] = [];
  const normals: number[] = [];

  if (isBinary) {
    const triCount = view.getUint32(80, true);
    let offset = 84;
    for (let i = 0; i < triCount; i++) {
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);
      offset += 12;
      for (let v = 0; v < 3; v++) {
        positions.push(
          view.getFloat32(offset, true),
          view.getFloat32(offset + 4, true),
          view.getFloat32(offset + 8, true)
        );
        normals.push(nx, ny, nz);
        offset += 12;
      }
      offset += 2;
    }
  } else {
    const text = new TextDecoder().decode(buffer);
    const vRe = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;
    const nRe = /facet normal\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;
    const nMatches = Array.from(text.matchAll(nRe));
    const vMatches = Array.from(text.matchAll(vRe));
    for (let i = 0; i < vMatches.length; i++) {
      const v = vMatches[i];
      positions.push(+v[1], +v[2], +v[3]);
      const n = nMatches[Math.floor(i / 3)];
      normals.push(+n[1], +n[2], +n[3]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  return geo;
}

export function computeVolume(geometry: THREE.BufferGeometry): number {
  const pos = geometry.attributes.position.array as Float32Array;
  let vol = 0;
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i], ay = pos[i + 1], az = pos[i + 2];
    const bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5];
    const cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
    vol +=
      (ax * (by * cz - bz * cy) +
        bx * (cy * az - cz * ay) +
        cx * (ay * bz - az * by)) /
      6;
  }
  return Math.abs(vol);
}

export const MATERIALS = {
  PLA:         { label: "PLA",        desc: "General purpose, biodegradable",              costPerKg: 16,  swatch: "#e8e6e1", density: 1.24 },
  PETG:        { label: "PETG",       desc: "Tough and weather-resistant",                 costPerKg: 18,  swatch: "#c8d4d1", density: 1.27 },
  TPU:         { label: "TPU",        desc: "Flexible, gaskets and grips",                 costPerKg: 24,  swatch: "#3a3a3c", density: 1.21 },
  ABS:         { label: "ABS",        desc: "High temp, impact resistant",                 costPerKg: 16,  swatch: "#5a5a5e", density: 1.04 },
  ASA:         { label: "ASA",        desc: "UV-stable, outdoor parts",                    costPerKg: 22,  swatch: "#7a7a7e", density: 1.07 },
  "PET-GF15":  { label: "PET-GF15",  desc: "Glass-fiber PET, precision jigs and fixtures", costPerKg: 30,  swatch: "#a8c4b0", density: 1.45 },
  "PETG-ESD":  { label: "PETG-ESD",  desc: "Electrostatic dissipative, electronics use",  costPerKg: 66,  swatch: "#4a90d9", density: 1.27 },
  PA:          { label: "PA (Nylon)", desc: "Wear-resistant, gears and load-bearing",      costPerKg: 35,  swatch: "#d4cfb5", density: 1.14 },
  "ASA-CF":    { label: "ASA-CF",    desc: "Carbon-reinforced ASA, UV stable",             costPerKg: 40,  swatch: "#1a1a1c", density: 1.11 },
  "PETG-CF":   { label: "PETG-CF",  desc: "Carbon-reinforced PETG (Fiberon)",              costPerKg: 40,  swatch: "#1a1a1c", density: 1.31 },
  "PA-CF":     { label: "PA-CF",    desc: "Carbon-reinforced nylon (Fiberon)",              costPerKg: 80,  swatch: "#1a1a1c", density: 1.18 },
} as const;

export type MaterialKey = keyof typeof MATERIALS;

export const QUALITIES = {
  draft: { label: "0.28", desc: "Fast", mult: 0.7 },
  standard: { label: "0.20", desc: "Standard", mult: 1.0 },
  fine: { label: "0.12", desc: "Fine", mult: 1.6 },
} as const;

export type QualityKey = keyof typeof QUALITIES;

export function quoteFromGeometry(
  volumeMm3: number,
  material: MaterialKey,
  quality: QualityKey,
  infill: number
) {
  const mat = MATERIALS[material];
  const shellFraction = 0.12;
  const effectiveFill = shellFraction + (1 - shellFraction) * (infill / 100);
  const volumeCm3 = volumeMm3 / 1000;
  const grams = volumeCm3 * mat.density * effectiveFill;
  const hours = (grams / 10) * QUALITIES[quality].mult;
  const materialCost = (grams / 1000) * mat.costPerKg * 2.5;
  const machineCost = hours * 0.20;
  const setup = 12;
  const subtotal = (materialCost + machineCost + setup) * 1.08;
  return {
    grams: Math.round(grams * 10) / 10,
    hours: Math.round(hours * 10) / 10,
    price: Math.max(8, Math.round(subtotal * 100) / 100),
    breakdown: {
      material: Math.round(materialCost * 100) / 100,
      machine: Math.round(machineCost * 100) / 100,
      setup,
    },
  };
}

