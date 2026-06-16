import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import Busboy from "busboy";
const execFileAsync = promisify(execFile);
const PORT = process.env.PORT || 3100;
const ORCA_BIN = process.env.ORCA_BIN || "/opt/orca-slicer/orca-slicer";
const WORKER_SECRET = process.env.WORKER_SECRET || "";
const ORCA_RESOURCES = process.env.ORCA_RESOURCES || "/opt/orca-slicer/resources";
const PROFILES_ROOT = path.join(ORCA_RESOURCES, "profiles");
const SHELLY_IP = process.env.SHELLY_IP || "192.168.68.83";
const ELECTRICITY_RATE_KWH = parseFloat(process.env.ELECTRICITY_RATE || "0.12");
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const FILES_ROOT = process.env.FILES_ROOT || "/mnt/media/orders";
const MACHINE_PROFILE = "Creality/machine/Creality K2 Plus 0.4 nozzle.json";
const FILAMENT_PROFILES = {
  PLA: "Creality/filament/Creality Generic PLA @K2-all.json",
  PETG: "Creality/filament/Creality Generic PETG @K2-all.json",
  ABS: "Creality/filament/Creality Generic ABS @K2-all.json",
  ASA: "Creality/filament/Creality Generic ASA @K2-all.json",
  TPU: "Creality/filament/Creality Generic TPU @K2-all.json",
  PC: "Creality/filament/Creality Generic PLA @K2-all.json",
  PA: "Creality/filament/Creality Generic PLA @K2-all.json",
  "PLA-CF": "Creality/filament/Creality Generic PLA-CF @K2-all.json",
  "PETG-CF": "Creality/filament/Creality Generic PA-CF @K2-all.json",
  "PA-CF": "Creality/filament/Creality Generic PA-CF @K2-all.json",
  "PET-GF15": "Creality/filament/Creality Generic PETG @K2-all.json",
  "PETG-ESD": "Creality/filament/Creality Generic PETG @K2-all.json",
  "ASA-CF": "Creality/filament/Creality Generic ASA @K2-all.json",
};
const FILAMENT_FALLBACKS = {
  PLA: "OrcaFilamentLibrary/filament/Generic PLA.json",
  PETG: "OrcaFilamentLibrary/filament/Generic PETG.json",
  ABS: "OrcaFilamentLibrary/filament/Generic ABS.json",
  ASA: "OrcaFilamentLibrary/filament/Generic ASA.json",
  TPU: "OrcaFilamentLibrary/filament/Generic TPU.json",
  PC: "OrcaFilamentLibrary/filament/Generic PC.json",
  PA: "OrcaFilamentLibrary/filament/Generic PA.json",
  "PLA-CF": "OrcaFilamentLibrary/filament/Generic PLA-CF.json",
  "PETG-CF": "OrcaFilamentLibrary/filament/Generic PETG-CF.json",
  "PA-CF": "OrcaFilamentLibrary/filament/Generic PA-CF.json",
};
const PROCESS_PROFILES = {
  draft: "Creality/process/0.28mm SuperDraft @Creality K2 Plus 0.4 nozzle.json",
  fast: "Creality/process/0.24mm Draft @Creality K2 Plus 0.4 nozzle.json",
  standard: "Creality/process/0.20mm Standard @Creality K2 Plus 0.4 nozzle.json",
  fine: "Creality/process/0.12mm Detail @Creality K2 Plus 0.4 nozzle.json",
};
const QUALITY_LAYER = { draft: "0.28", fast: "0.24", standard: "0.20", fine: "0.12" };
const MATERIALS = {
  PLA: { costPerKg: 16 }, PCTG: { costPerKg: 40 }, TPU: { costPerKg: 24 }, ABS: { costPerKg: 20 },
  ASA: { costPerKg: 22 }, "PET-GF15": { costPerKg: 30 }, "PETG-ESD": { costPerKg: 66 },
  PA: { costPerKg: 35 }, "ASA-CF": { costPerKg: 40 }, "PETG-CF": { costPerKg: 40 }, "PA-CF": { costPerKg: 80 },
};
function computePrice(grams, minutes, material, overrideCostPerKg) {
  const mat = MATERIALS[material];
  const hours = minutes / 60;
  const costKg = overrideCostPerKg || mat?.costPerKg || 16;
  const materialCost = (grams / 1000) * costKg * 2.5;
  const machineCost = hours * 0.50;
  const setup = 12;
  const subtotal = materialCost + machineCost + setup;
  return {
    price: Math.max(8, Math.round(subtotal * 100) / 100),
    breakdown: {
      material: Math.round(materialCost * 100) / 100,
      machine: Math.round(machineCost * 100) / 100,
      setup,
    },
  };
}
function resolveProfile(rel) {
  const full = path.join(PROFILES_ROOT, rel);
  return fs.existsSync(full) ? full : null;
}
function resolveFilamentProfile(material) {
  const p = resolveProfile(FILAMENT_PROFILES[material]);
  if (p) return p;
  const f = resolveProfile(FILAMENT_FALLBACKS[material]);
  if (f) return f;
  throw new Error(`No filament profile found for ${material}`);
}
function parseGcode(gcodePath) {
  const text = fs.readFileSync(gcodePath, "utf8");
  const gramsMatch = text.match(/; filament used \[g\] = ([\d.]+)/);
  let grams = gramsMatch ? parseFloat(gramsMatch[1]) : null;
  if (!grams) {
    const lenMatch = text.match(/; filament used \[mm\] = ([\d.]+)/);
    if (lenMatch) grams = parseFloat(lenMatch[1]) * 1.75 * 1.75 * Math.PI / 4 * 1.24 / 1000;
  }
  const m73Match = text.match(/M73 P0 R(\d+)/);
  let minutes = m73Match ? parseInt(m73Match[1]) : null;
  const timeMatch = !minutes && text.match(/; estimated printing time \(normal mode\) = (.+)/);
  if (timeMatch) {
    const t = timeMatch[1];
    const h = t.match(/(\d+)h/); const m = t.match(/(\d+)m/); const s = t.match(/(\d+)s/);
    minutes = Math.round((h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0) + (s ? parseInt(s[1]) / 60 : 0));
  }
  return { grams, minutes };
}
async function convertStepToStl(stepPath, workDir) {
  const stlOut = path.join(workDir, "converted.stl");
  const pyScript = path.join(workDir, "convert_step.py");
  const pyCode = `
import sys
import os
sys.path.append("/usr/lib/freecad-python3/lib")
sys.path.append("/usr/lib/x86_64-linux-gnu/freecad-python3/lib")
import FreeCAD
import Part
import Mesh
step_path = sys.argv[1]
stl_path = sys.argv[2]
doc = FreeCAD.newDocument("conversion")
Part.insert(step_path, doc.Name)
doc.recompute()
shapes = [obj for obj in doc.Objects if hasattr(obj, "Shape")]
if not shapes:
    raise Exception("No shapes found in STEP file")
compound = Part.makeCompound([obj.Shape for obj in shapes])
mesh = Mesh.Mesh()
Mesh.export([doc.Objects[0]], stl_path)
if not os.path.exists(stl_path):
    mesh_data = compound.tessellate(0.1)
    verts, tris = mesh_data
    with open(stl_path, "w") as f:
        f.write("solid converted\\n")
        for tri in tris:
            f.write("  facet normal 0 0 0\\n    outer loop\\n")
            for vi in tri:
                v = verts[vi]
                f.write(f"      vertex {v[0]} {v[1]} {v[2]}\\n")
            f.write("    endloop\\n  endfacet\\n")
        f.write("endsolid converted\\n")
print(f"Converted: {stl_path}")
`;
  await fsp.writeFile(pyScript, pyCode);
  try {
    const result = await execFileAsync("python3", [pyScript, stepPath, stlOut], {
      timeout: 120000,
      env: { ...process.env, FREECAD_USER_HOME: workDir },
    });
    console.log("[step] output:", result.stdout);
  } catch (e) {
    console.error("[step] error:", e.stderr || e.message);
    if (!fs.existsSync(stlOut)) {
      throw new Error("STEP conversion failed — " + (e.stderr || e.message).slice(0, 300));
    }
  }
  if (!fs.existsSync(stlOut)) throw new Error("STEP conversion failed — no STL output");
  console.log(`[step] converted to STL: ${stlOut}`);
  return stlOut;
}
async function runSlice(stlPath, material, quality, infill, workDir) {
  const machinePro = resolveProfile(MACHINE_PROFILE);
  if (!machinePro) throw new Error("K2 Plus machine profile not found");
  const filamentPro = resolveFilamentProfile(material);
  const processPro = resolveProfile(PROCESS_PROFILES[quality]);
  if (!processPro) throw new Error(`Process profile for '${quality}' not found`);
  const gcodeOut = path.join(workDir, "plate_1.gcode");
  const walls = Math.round(infill / 10); // 20%→2, 40%→4, 60%→6, 80%→8, 100%→10
  const args = [
    "--slice", "0",
    "--arrange", "1",
    "--load-settings", `${machinePro};${processPro}`,
    "--load-filaments", filamentPro,
    "--allow-newer-file",
    "--outputdir", workDir,
    `--sparse-infill-density=${infill}%`,
    "--sparse-infill-pattern=grid",
    `--layer-height=${QUALITY_LAYER[quality]}`,
    `--wall-loops=${walls}`,
    "--enable-support=1",
    "--support-type=tree(auto)",
    "--support-on-build-plate-only=1",
    "--support-top-z-distance=0.26",
    "--support-interface-top-layers=2",
    stlPath,
  ];
  await execFileAsync(ORCA_BIN, args, { timeout: 120000 }).catch(e => {
    console.log("[orca] exited with error (may still have output):", e.message?.slice(0, 100));
  });
  const allFiles = fs.readdirSync(workDir);
  console.log("[workdir files]", allFiles);
  try {
    const rj = fs.readFileSync(path.join(workDir, "result.json"), "utf8");
    console.log("[result.json full]", rj);
    const rjParsed = JSON.parse(rj);
    if (rjParsed.return_code === -50) {
      const e = Object.assign(new Error("Part could not be auto-oriented for slicing. It may need to be repositioned manually."), { needsOrientation: true });
      throw e;
    }
    const gc = fs.readFileSync(path.join(workDir, "plate_1.gcode"), "utf8");
    console.log("[gcode tail]", gc.slice(-800));
  } catch(e) { if (e.needsOrientation) throw e; console.log("[read error]", e.message); }
  return gcodeOut;
}
async function preOrient(inputPath, workDir) {
  const orientedPath = path.join(workDir, 'oriented.stl');
  return new Promise((resolve, reject) => {
    require('child_process').execFile('python3', ['/app/preprocess.py', inputPath, orientedPath], (err, stdout, stderr) => {
      console.log('[preOrient] err:', err?.message, 'stdout:', stdout, 'stderr:', stderr?.slice(0,200));
      try {
        const r = JSON.parse((stdout||'').trim());
        if (!r.ok) {
          if (r.tooLarge) { const e = Object.assign(new Error(r.error), {tooLarge:true, dims:r.dims}); reject(e); }
          else resolve(inputPath);
        } else resolve(orientedPath);
      } catch { resolve(inputPath); }
    });
  });
}
async function handleConvertStep(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "dragline-step-"));
  try {
    const fields = await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: req.headers, limits: { fileSize: 100 * 1024 * 1024 } });
      const data = {};
      let savedPath = null, origName = "input.step";
      bb.on("file", (_name, stream, info) => {
        origName = info.filename || "input.step";
        savedPath = path.join(workDir, "input.step");
        stream.pipe(fs.createWriteStream(savedPath));
      });
      bb.on("field", (n, v) => { data[n] = v; });
      bb.on("finish", () => setTimeout(() => {
        if (!savedPath) reject(new Error("No file received"));
        else resolve({ ...data, savedPath, origName });
      }, 500));
      bb.on("error", reject);
      req.pipe(bb);
    });
    console.log(`[convert-step] converting ${fields.origName}`);
    const stlPath = await convertStepToStl(fields.savedPath, workDir);
    const stlBuffer = fs.readFileSync(stlPath);
    const stlBase64 = stlBuffer.toString("base64");
    console.log(`[convert-step] done — ${stlBuffer.length} bytes`);
    send(res, 200, { ok: true, stl: stlBase64 });
  } catch (err) {
    console.error("[convert-step] error:", err.message);
    send(res, 500, { error: err.message || "STEP conversion failed" });
  } finally {
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

// ── Async job store ───────────────────────────────────────────────────────────
const jobs = new Map();
let _seq = 0;
function newJobId() { return `j${Date.now()}_${++_seq}`; }
// Expire jobs after 15 minutes
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [id, j] of jobs) if (j.ts < cutoff) jobs.delete(id);
}, 60_000).unref();

async function handleSliceAsync(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "dragline-"));
  let fields;
  try {
    fields = await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: req.headers, limits: { fileSize: 100 * 1024 * 1024 } });
      const data = {};
      let savedPath = null, origName = "input.stl";
      bb.on("file", (_name, stream, info) => {
        origName = info.filename || "input.stl";
        const ext = path.extname(origName).toLowerCase();
        console.log(`[slice-async] origName=${origName} ext=${ext}`);
        const saveName = ["stl","3mf","step","stp"].includes(ext.slice(1)) ? `input${ext}` : "input.stl";
        savedPath = path.join(workDir, saveName);
        stream.pipe(fs.createWriteStream(savedPath));
      });
      bb.on("field", (n, v) => { data[n] = v; });
      bb.on("finish", () => setTimeout(() => {
        if (!savedPath) reject(new Error("No file received"));
        else resolve({ ...data, savedPath, origName });
      }, 500));
      bb.on("error", reject);
      req.pipe(bb);
    });
  } catch (e) {
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
    return send(res, 400, { error: e.message });
  }
  const { material, quality } = fields;
  const infill = parseInt(fields.infill, 10);
  if (!MATERIALS[material]) { fsp.rm(workDir, { recursive: true, force: true }).catch(() => {}); return send(res, 400, { error: "Invalid material" }); }
  if (!QUALITY_LAYER[quality]) { fsp.rm(workDir, { recursive: true, force: true }).catch(() => {}); return send(res, 400, { error: "Invalid quality" }); }
  if (isNaN(infill) || infill < 5 || infill > 100) { fsp.rm(workDir, { recursive: true, force: true }).catch(() => {}); return send(res, 400, { error: "Invalid infill" }); }
  const jobId = newJobId();
  jobs.set(jobId, { status: "pending", ts: Date.now() });
  send(res, 202, { jobId });
  // Process in background
  processSliceJob(jobId, fields, workDir).catch(e => {
    console.error("[slice-async] unhandled:", e.message);
    if (jobs.get(jobId)?.status === "pending") {
      jobs.set(jobId, { status: "error", error: "Unexpected error", ts: Date.now() });
    }
  });
}

async function processSliceJob(jobId, fields, workDir) {
  const { material, quality, savedPath, origName } = fields;
  const infill = parseInt(fields.infill, 10);
  try {
    const ext = path.extname(origName).toLowerCase();
    let slicePath = savedPath;
    if (ext === ".step" || ext === ".stp") {
      console.log(`[slice-async] converting STEP to STL: ${origName}`);
      slicePath = await convertStepToStl(savedPath, workDir);
    }
    console.log(`[slice-async] ${material} ${quality} ${infill}% — ${origName}`);
    let finalPath = slicePath;
    try { finalPath = await preOrient(slicePath, workDir); }
    catch(e) {
      if (e.tooLarge) {
        jobs.set(jobId, { status: "error", error: e.message, tooLarge: true, dims: e.dims, ts: Date.now() });
        return;
      }
      // other preOrient errors — proceed without orientation
    }
    const gcodeOut = await runSlice(finalPath, material, quality, infill, workDir);
    const { grams, minutes } = parseGcode(gcodeOut);
    if (!grams || !minutes) {
      jobs.set(jobId, { status: "error", error: "Could not parse slicer output", ts: Date.now() });
      return;
    }
    const costPerKg = fields.costPerKg ? parseFloat(fields.costPerKg) : undefined;
    console.log(`[price] material=${material} costPerKg=${costPerKg}`);
    const { price, breakdown } = computePrice(grams, minutes, material, costPerKg);
    const hours = Math.round((minutes / 60) * 10) / 10;
    console.log(`[slice-async] done — ${grams}g ${minutes}min $${price}`);
    let convertedStlBase64 = null;
    const convertedStlPath = path.join(workDir, "converted.stl");
    if ((ext === ".step" || ext === ".stp") && fs.existsSync(convertedStlPath)) {
      convertedStlBase64 = fs.readFileSync(convertedStlPath).toString("base64");
    }
    jobs.set(jobId, {
      status: "done", ts: Date.now(),
      grams: Math.round(grams * 10) / 10, minutes, hours, price, breakdown,
      convertedStl: convertedStlBase64,
    });
  } catch (err) {
    if (err.needsOrientation) {
      jobs.set(jobId, { status: "error", error: err.message, needsOrientation: true, ts: Date.now() });
    } else {
      console.error("[slice-async] error:", err.message);
      jobs.set(jobId, { status: "error", error: err.message || "Slice failed", ts: Date.now() });
    }
  } finally {
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function handleSliceStatus(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  const u = new URL(req.url, "http://localhost");
  const jobId = u.searchParams.get("jobId");
  if (!jobId) return send(res, 400, { error: "jobId required" });
  const job = jobs.get(jobId);
  if (!job) return send(res, 404, { error: "Job not found or expired" });
  send(res, 200, job);
}

async function handleSlice(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "dragline-"));
  try {
    const fields = await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: req.headers, limits: { fileSize: 100 * 1024 * 1024 } });
      const data = {};
      let savedPath = null;
      let origName = "input.stl";
      bb.on("file", (_name, stream, info) => {
        origName = info.filename || "input.stl";
        const ext = path.extname(origName).toLowerCase();
        console.log(`[slice] origName=${origName} ext=${ext}`);
        const saveName = ["stl", "3mf", "step", "stp"].includes(ext.slice(1)) ? `input${ext}` : "input.stl";
        savedPath = path.join(workDir, saveName);
        const ws = fs.createWriteStream(savedPath);
        stream.pipe(ws);
        ws.on("error", reject);
      });
      bb.on("field", (name, val) => { data[name] = val; });
      bb.on("finish", () => {
        setTimeout(() => {
          if (!savedPath) reject(new Error("No file received"));
          else resolve({ ...data, savedPath, origName });
        }, 500);
      });
      bb.on("error", reject);
      req.pipe(bb);
    });
    const { material, quality, savedPath, origName } = fields;
    const infill = parseInt(fields.infill, 10);
    if (!MATERIALS[material]) return send(res, 400, { error: "Invalid material" });
    if (!QUALITY_LAYER[quality]) return send(res, 400, { error: "Invalid quality" });
    if (isNaN(infill) || infill < 5 || infill > 100) return send(res, 400, { error: "Invalid infill" });
    const ext = path.extname(origName).toLowerCase();
    let slicePath = savedPath;
    if (ext === ".step" || ext === ".stp") {
      console.log(`[slice] converting STEP to STL: ${origName}`);
      slicePath = await convertStepToStl(savedPath, workDir);
    }
    console.log(`[slice] ${material} ${quality} ${infill}% — ${origName}`);
    let finalPath = slicePath;
    try { finalPath = await preOrient(slicePath, workDir); }
    catch(e) { if(e.tooLarge) return send(res, 422, {error:e.message, tooLarge:true, dims:e.dims}); }
    const gcodeOut = await runSlice(finalPath, material, quality, infill, workDir);
    const { grams, minutes } = parseGcode(gcodeOut);
    if (!grams || !minutes) return send(res, 500, { error: "Could not parse slicer output" });
    const costPerKg = fields.costPerKg ? parseFloat(fields.costPerKg) : undefined;
    console.log(`[price] material=${material} costPerKg=${costPerKg} fields.costPerKg=${fields.costPerKg}`);
    const { price, breakdown } = computePrice(grams, minutes, material, costPerKg);
    const hours = Math.round((minutes / 60) * 10) / 10;
    console.log(`[slice] done — ${grams}g ${minutes}min $${price}`);
    let convertedStlBase64 = null;
    const convertedStlPath = path.join(workDir, "converted.stl");
    if ((ext === ".step" || ext === ".stp") && fs.existsSync(convertedStlPath)) {
      convertedStlBase64 = fs.readFileSync(convertedStlPath).toString("base64");
    }
    send(res, 200, { grams: Math.round(grams * 10) / 10, minutes, hours, price, breakdown, convertedStl: convertedStlBase64 });
  } catch (err) {
    if (err.needsOrientation) return send(res, 422, { error: err.message, needsOrientation: true });
    console.error("[slice] error:", err.message);
    send(res, 500, { error: err.message || "Slice failed" });
  } finally {
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
async function handleSaveFiles(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const fields = await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: req.headers, limits: { fileSize: 100 * 1024 * 1024 } });
      const data = { files: [] };
      bb.on("field", (name, val) => { data[name] = val; });
      bb.on("file", (name, stream, info) => {
        const chunks = [];
        stream.on("data", chunk => chunks.push(chunk));
        stream.on("end", () => { data.files.push({ name: info.filename, buffer: Buffer.concat(chunks) }); });
      });
      bb.on("finish", () => resolve(data));
      bb.on("error", reject);
      req.pipe(bb);
    });
    const { orderId, customerName, files } = fields;
    if (!orderId || !customerName || !files?.length) return send(res, 400, { error: "orderId, customerName and files required" });
    const nameParts = customerName.trim().split(" ");
    const lastName = nameParts.slice(-1)[0] || "Unknown";
    const firstName = nameParts.slice(0, -1).join("_") || "Unknown";
    const folderName = `${lastName}_${firstName}`;
    const orderDir = path.join(FILES_ROOT, folderName, orderId);
    await fsp.mkdir(orderDir, { recursive: true });
    const saved = [];
    for (const file of files) {
      const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
      const dest = path.join(orderDir, safeName);
      await fsp.writeFile(dest, file.buffer);
      saved.push(safeName);
      console.log(`[save-files] saved ${dest}`);
    }
    if (fields.items) {
      try {
        const items = JSON.parse(fields.items);
        for (const item of items) {
          if (item.thumbnail && item.id) {
            const safeId = item.id.replace(/[^A-Za-z0-9\-]/g, "");
            const thumbPath = path.join(orderDir, `thumb_${safeId}.jpg`);
            const base64Data = item.thumbnail.replace(/^data:image\/\w+;base64,/, "");
            await fsp.writeFile(thumbPath, Buffer.from(base64Data, "base64"));
            console.log(`[save-files] saved thumb ${thumbPath}`);
          }
        }
      } catch (e) {
        console.warn("[save-files] thumbnail save error:", e.message);
      }
    }
    send(res, 200, { ok: true, path: orderDir, saved });
  } catch (err) {
    console.error("[save-files] error:", err.message);
    send(res, 500, { error: err.message || "Save failed" });
  }
}
async function handleGetFile(req, res) {
  const secret = req.headers["x-worker-secret"];
  if (WORKER_SECRET && secret !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  const u = new URL(req.url, "http://localhost");
  const orderId = u.searchParams.get("orderId");
  const fileName = u.searchParams.get("fileName");
  if (!orderId || !fileName) return send(res, 400, { error: "orderId and fileName required" });
  const safeFileName = path.basename(fileName);
  const safeOrderId = orderId.replace(/[^A-Za-z0-9\-]/g, "");
  try {
    const entries = fs.readdirSync(FILES_ROOT);
    let filePath = null;
    for (const customerDir of entries) {
      const candidate = path.join(FILES_ROOT, customerDir, safeOrderId, safeFileName);
      if (fs.existsSync(candidate)) { filePath = candidate; break; }
    }
    if (!filePath) return send(res, 404, { error: "File not found" });
    const ext = path.extname(safeFileName).toLowerCase();
    const mime = ext === ".3mf" ? "model/3mf" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime, "Content-Disposition": `attachment; filename="${safeFileName}"` });
    fs.createReadStream(filePath).pipe(res);
  } catch(e) {
    return send(res, 500, { error: "Internal server error" });
  }
}
async function handleGetThumb(req, res) {
  const secret = req.headers["x-worker-secret"];
  if (WORKER_SECRET && secret !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  const u = new URL(req.url, "http://localhost");
  const orderId = u.searchParams.get("orderId");
  const itemId = u.searchParams.get("itemId");
  if (!orderId || !itemId) return send(res, 400, { error: "orderId and itemId required" });
  const safeOrderId = orderId.replace(/[^A-Za-z0-9\-]/g, "");
  const safeItemId = itemId.replace(/[^A-Za-z0-9\-]/g, "");
  try {
    const entries = fs.readdirSync(FILES_ROOT);
    let thumbPath = null;
    for (const customerDir of entries) {
      const candidate = path.join(FILES_ROOT, customerDir, safeOrderId, `thumb_${safeItemId}.jpg`);
      if (fs.existsSync(candidate)) { thumbPath = candidate; break; }
    }
    if (!thumbPath) return send(res, 404, { error: "Thumbnail not found" });
    res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" });
    fs.createReadStream(thumbPath).pipe(res);
  } catch(e) {
    return send(res, 500, { error: "Internal server error" });
  }
}
// ── Shelly power monitoring ────────────────────────────────────────────────
// Always-on: polls every 30s regardless of session state so live watts are
// available in the admin UI at all times. Session tracking is optional on top.
let shellySession = null; // { sessionId, orderId, lastWhReading, whAccumulated, lowWattCount }
let shellyLiveWatts = null;  // last known wattage, for /shelly/power responses
let shellyLiveWh = 0;        // last known total Wh counter
let shellyLastPollOk = null; // timestamp (ms) of last successful poll, null if never succeeded
let shellyLastError = null;  // last poll error message

async function getShellyStatus() {
  const r = await fetch(`http://${SHELLY_IP}/rpc/Switch.GetStatus?id=0`, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`Shelly HTTP ${r.status}`);
  return r.json();
}

async function supabasePatch(table, id, data) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
}

async function pollShelly() {
  try {
    const data = await getShellyStatus();
    const currentWh = data.aenergy?.total ?? 0;
    const watts = typeof data.apower === "number" ? data.apower : null;
    shellyLiveWatts = watts;
    shellyLiveWh = currentWh;
    shellyLastPollOk = Date.now();
    shellyLastError = null;

    if (!shellySession) return; // no session — just update live readings and stop

    // Accumulate session Wh (handle counter reset)
    const delta = currentWh >= shellySession.lastWhReading
      ? currentWh - shellySession.lastWhReading
      : currentWh;
    shellySession.whAccumulated += delta;
    shellySession.lastWhReading = currentWh;
    const cost = (shellySession.whAccumulated / 1000) * ELECTRICITY_RATE_KWH;

    // Require 3 consecutive low-watt reads before auto-ending (avoids heater-cycle false stops)
    if (watts !== null && watts < 20 && shellySession.whAccumulated > 5) {
      shellySession.lowWattCount = (shellySession.lowWattCount || 0) + 1;
    } else {
      shellySession.lowWattCount = 0;
    }
    const autoEnd = shellySession.lowWattCount >= 3;
    await supabasePatch("print_sessions", shellySession.sessionId, {
      wh_accumulated: Math.round(shellySession.whAccumulated * 100) / 100,
      electricity_cost: Math.round(cost * 10000) / 10000,
      ...(autoEnd ? { status: "completed", ended_at: new Date().toISOString() } : {}),
    });
    if (autoEnd) {
      console.log(`[shelly] auto-ended session ${shellySession.sessionId} — ${shellySession.whAccumulated.toFixed(1)}Wh $${cost.toFixed(4)}`);
      shellySession = null;
    }
  } catch (e) {
    shellyLastError = e.message;
    console.error("[shelly] poll error:", e.message);
  }
}

// Start always-on poll at server boot
setInterval(pollShelly, 30_000);
pollShelly(); // immediate first read

// ── Moonraker print state watcher ─────────────────────────────────────────────
// Polls every 15s. On print_start → auto-start Shelly session linked to the
// most recent order with status="printing". On complete/cancelled/error → auto-stop.
// NOTE: Prints started from the K2 Plus touchscreen bypass Moonraker's print_stats
// and won't be detected here. Use the manual Start button for touchscreen prints.
const MOONRAKER_URL = process.env.MOONRAKER_URL || "http://192.168.68.51:7125";
let moonrakerPrintState = null; // last known print_stats.state

async function pollMoonraker() {
  try {
    const r = await fetch(`${MOONRAKER_URL}/printer/objects/query?print_stats`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return;
    const data = await r.json();
    const stats = data.result?.status?.print_stats;
    if (!stats) return;

    const newState = stats.state; // standby | printing | complete | cancelled | error | paused
    if (moonrakerPrintState === newState) return; // no change

    const prevState = moonrakerPrintState;
    moonrakerPrintState = newState;
    console.log(`[moonraker] state: ${prevState ?? "unknown"} → ${newState} (${stats.filename || ""})`);

    // Print started (not a resume from pause)
    if (newState === "printing" && prevState !== "paused") {
      await autoStartShellySession(stats.filename || "");
    }
    // Print ended
    if (["complete", "cancelled", "error"].includes(newState) && shellySession) {
      await autoStopShellySession(newState);
    }
  } catch (e) {
    // Printer off or unreachable — suppress
  }
}

async function autoStartShellySession(filename) {
  if (shellySession) return; // session already active (manual or previous auto)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    // Find the most recently updated order with status = "printing"
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?status=eq.printing&order=updated_at.desc&limit=1&select=id`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const orders = await r.json();
    if (!orders?.length) {
      console.log("[moonraker] print started — no order with status=printing found, skipping auto-start");
      return;
    }
    const orderId = orders[0].id;

    // Create a new print_session record
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/print_sessions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        order_id: orderId,
        status: "active",
        started_at: new Date().toISOString(),
        wh_accumulated: 0,
        electricity_cost: 0,
      }),
    });
    const rows = await ins.json();
    const session = rows?.[0];
    if (!session?.id) { console.error("[moonraker] failed to create print_session"); return; }

    shellySession = { sessionId: session.id, orderId, lastWhReading: shellyLiveWh, whAccumulated: 0, lowWattCount: 0 };
    console.log(`[moonraker] auto-started Shelly session ${session.id} for order ${orderId} (${filename})`);
  } catch (e) {
    console.error("[moonraker] auto-start error:", e.message);
  }
}

async function autoStopShellySession(reason) {
  if (!shellySession) return;
  const wh = shellySession.whAccumulated;
  const cost = (wh / 1000) * ELECTRICITY_RATE_KWH;
  await supabasePatch("print_sessions", shellySession.sessionId, {
    wh_accumulated: Math.round(wh * 100) / 100,
    electricity_cost: Math.round(cost * 10000) / 10000,
    status: "completed",
    ended_at: new Date().toISOString(),
  });
  console.log(`[moonraker] auto-stopped Shelly session (${reason}) — ${wh.toFixed(1)}Wh $${cost.toFixed(4)}`);
  shellySession = null;
}

setInterval(pollMoonraker, 15_000);
pollMoonraker(); // immediate first read
// ─────────────────────────────────────────────────────────────────────────────

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => { raw += c; });
    req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    req.on("error", reject);
  });
}

async function handleShellyPower(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  // Return cached values from always-on poll — no live fetch needed here
  // watts/apower are null when polls are failing (distinct from genuine 0W standby)
  const pollAgeSec = shellyLastPollOk ? Math.round((Date.now() - shellyLastPollOk) / 1000) : null;
  return send(res, 200, {
    apower: shellyLiveWatts,
    watts: shellyLiveWatts,     // null = poll failing; 0 = genuine standby
    wh_total: shellyLiveWh,
    active_session: shellySession ? { sessionId: shellySession.sessionId, orderId: shellySession.orderId, wh_accumulated: shellySession.whAccumulated, electricity_cost: Math.round((shellySession.whAccumulated / 1000) * ELECTRICITY_RATE_KWH * 10000) / 10000 } : null,
    poll_ok: shellyLastError === null && shellyLastPollOk !== null,
    poll_error: shellyLastError,
    poll_age_sec: pollAgeSec,
  });
}

async function handleShellySessionStart(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  const { sessionId, orderId } = await readJsonBody(req);
  if (!sessionId || !orderId) return send(res, 400, { error: "sessionId and orderId required" });
  // clear any existing session (global poll keeps running)
  shellySession = null;
  try {
    const startWh = shellyLiveWh; // use cached value — no extra fetch needed
    shellySession = { sessionId, orderId, lastWhReading: startWh, whAccumulated: 0, lowWattCount: 0 };
    console.log(`[shelly] session started — order ${orderId} session ${sessionId} startWh=${startWh}`);
    return send(res, 200, { ok: true, startWh, watts: shellyLiveWatts ?? 0 });
  } catch (e) {
    return send(res, 503, { error: "Shelly unreachable", detail: e.message });
  }
}

async function handleShellySessionStop(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  if (!shellySession) return send(res, 200, { ok: true, wh_accumulated: 0, electricity_cost: 0, message: "No active session" });
  const wh = shellySession.whAccumulated;
  const cost = (wh / 1000) * ELECTRICITY_RATE_KWH;
  const stoppedSessionId = shellySession.sessionId;
  await supabasePatch("print_sessions", stoppedSessionId, {
    wh_accumulated: Math.round(wh * 100) / 100,
    electricity_cost: Math.round(cost * 10000) / 10000,
    status: "completed",
    ended_at: new Date().toISOString(),
  });
  console.log(`[shelly] session stopped — ${wh.toFixed(1)}Wh $${cost.toFixed(4)}`);
  shellySession = null;
  return send(res, 200, { ok: true, wh_accumulated: Math.round(wh * 100) / 100, electricity_cost: Math.round(cost * 10000) / 10000 });
}

async function handleShellySessionStatus(req, res) {
  if (WORKER_SECRET && req.headers["x-worker-secret"] !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
  if (!shellySession) return send(res, 200, { active: false });
  let watts = 0;
  try { const d = await getShellyStatus(); watts = d.apower ?? 0; } catch {}
  const wh = shellySession.whAccumulated;
  return send(res, 200, {
    active: true,
    sessionId: shellySession.sessionId,
    orderId: shellySession.orderId,
    wh_accumulated: Math.round(wh * 100) / 100,
    electricity_cost: Math.round((wh / 1000) * ELECTRICITY_RATE_KWH * 10000) / 10000,
    watts,
  });
}
// ────────────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") return send(res, 200, { status: "ok", ts: Date.now() });
  if (req.url === "/printer" && req.method === "GET") {
    const secret = req.headers["x-worker-secret"];
    if (WORKER_SECRET && secret !== WORKER_SECRET) return send(res, 401, { error: "Unauthorized" });
    try {
      const r = await fetch(`${MOONRAKER_URL}/printer/objects/query?print_stats&virtual_sdcard&heater_bed&extruder`);
      const data = await r.json();
      return send(res, 200, data.result?.status || {});
    } catch(e) { return send(res, 503, { error: "Printer unreachable" }); }
  }
  if (req.url === "/convert-step" && req.method === "POST") return handleConvertStep(req, res);
  if (req.url === "/slice" && req.method === "POST") return handleSlice(req, res);
  if (req.url === "/slice-async" && req.method === "POST") return handleSliceAsync(req, res);
  if (req.url.startsWith("/slice-status") && req.method === "GET") return handleSliceStatus(req, res);
  if (req.url === "/save-files") return handleSaveFiles(req, res);
  if (req.url.startsWith("/get-file") && req.method === "GET") return handleGetFile(req, res);
  if (req.url.startsWith("/get-thumb") && req.method === "GET") return handleGetThumb(req, res);
  if (req.url === "/shelly/power" && req.method === "GET") return handleShellyPower(req, res);
  if (req.url === "/shelly/session/start" && req.method === "POST") return handleShellySessionStart(req, res);
  if (req.url === "/shelly/session/stop" && req.method === "POST") return handleShellySessionStop(req, res);
  if (req.url === "/shelly/session/status" && req.method === "GET") return handleShellySessionStatus(req, res);
  return send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => console.log(`Dragline slicer worker on :${PORT}`));
