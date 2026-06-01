import JSZip from "jszip";
import * as THREE from "three";

export async function parse3MF(buffer: ArrayBuffer): Promise<THREE.BufferGeometry> {
  const zip = await JSZip.loadAsync(buffer);
  let modelContent: string | null = null;
  for (const p of ["3D/3dmodel.model", "3d/3dmodel.model"]) {
    const f = zip.file(p);
    if (f) { modelContent = await f.async("text"); break; }
  }
  if (!modelContent) {
    for (const name of Object.keys(zip.files)) {
      if (name.endsWith(".model")) { modelContent = await zip.files[name].async("text"); break; }
    }
  }
  if (!modelContent) throw new Error("No model file found in 3MF");
  const doc = new DOMParser().parseFromString(modelContent, "text/xml");
  const rawVerts: number[] = [];
  doc.querySelectorAll("vertex").forEach(v => {
    rawVerts.push(parseFloat(v.getAttribute("x") ?? "0"), parseFloat(v.getAttribute("y") ?? "0"), parseFloat(v.getAttribute("z") ?? "0"));
  });
  const positions: number[] = [];
  doc.querySelectorAll("triangle").forEach(t => {
    for (const attr of ["v1", "v2", "v3"] as const) {
      const idx = parseInt(t.getAttribute(attr) ?? "0") * 3;
      positions.push(rawVerts[idx], rawVerts[idx + 1], rawVerts[idx + 2]);
    }
  });
  if (positions.length === 0) throw new Error("3MF contains no geometry");
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}
