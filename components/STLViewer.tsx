"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RotateCw } from "lucide-react";
import { computeVolume } from "@/lib/stl";

type Stats = {
  dims: { x: number; y: number; z: number };
  volumeMm3: number;
};

export function STLViewer({
  geometry,
  onStats,
}: {
  geometry: THREE.BufferGeometry;
  onStats: (s: Stats) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{ toggleRotate?: () => void }>({});

  useEffect(() => {
    if (!geometry || !mountRef.current) return;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x18181a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    const maxDim = Math.max(size.x, size.y, size.z);

    onStats({
      dims: { x: size.x, y: size.y, z: size.z },
      volumeMm3: computeVolume(geometry),
    });

    const material = new THREE.MeshStandardMaterial({
      color: 0xffb547,
      metalness: 0.15,
      roughness: 0.55,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(1, 1.5, 1);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffb547, 0.3);
    rim.position.set(-1, 0.5, -1);
    scene.add(rim);

    const grid = new THREE.GridHelper(maxDim * 2, 10, 0x3a3a3c, 0x2a2a2c);
    grid.position.y = -size.y / 2 - maxDim * 0.05;
    scene.add(grid);

    camera.position.set(maxDim * 1.4, maxDim * 1.1, maxDim * 1.4);
    camera.lookAt(0, 0, 0);

    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 3;
    let radius = maxDim * 2;
    let autoRotate = true;

    function updateCamera() {
      camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(0, 0, 0);
    }

    const onDown = (e: MouseEvent) => {
      isDragging = true;
      autoRotate = false;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      theta -= (e.clientX - prevX) * 0.01;
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - (e.clientY - prevY) * 0.01));
      prevX = e.clientX;
      prevY = e.clientY;
      updateCamera();
    };
    const onUp = () => {
      isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.max(
        maxDim * 0.5,
        Math.min(maxDim * 5, radius + e.deltaY * maxDim * 0.002)
      );
      updateCamera();
    };
    renderer.domElement.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    stateRef.current.toggleRotate = () => {
      autoRotate = !autoRotate;
    };

    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      if (autoRotate) {
        theta += 0.005;
        updateCamera();
      }
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      <button
        onClick={() => stateRef.current.toggleRotate?.()}
        className="absolute top-3 right-3 p-2 rounded-sm border border-ironworks3 bg-ironworks/85 text-bone hover:bg-ironworks transition-colors"
        title="Toggle auto-rotate"
      >
        <RotateCw size={14} />
      </button>
      <div className="absolute bottom-3 left-3 font-mono text-xs px-2 py-1 rounded-sm bg-ironworks/85 text-steel">
        drag to orbit · scroll to zoom
      </div>
    </div>
  );
}
