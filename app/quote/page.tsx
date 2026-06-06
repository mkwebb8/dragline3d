// ─── ADD THIS inside QuotePage(), replacing the existing localStorage useEffect ───
// This goes right after the existing `useEffect` that reads dragline_cart

useEffect(() => {
  try {
    const saved = localStorage.getItem("dragline_cart");
    if (!saved) return;
    const items = JSON.parse(saved);

    // Check if there are reorder files cached in sessionStorage
    const reorderRaw = sessionStorage.getItem("dragline_reorder_files");
    const reorderFiles: Record<string, { base64: string; mimeType: string }> = reorderRaw
      ? JSON.parse(reorderRaw)
      : {};

    const hydrated = items.map((i: any) => {
      let file: File | null = null;
      if (reorderFiles[i.fileName]) {
        const { base64, mimeType } = reorderFiles[i.fileName];
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        file = new File([bytes], i.fileName, { type: mimeType });
      }
      return { ...i, file, geometry: null };
    });

    setCartItems(hydrated);

    // Clean up after hydration so a page refresh doesn't re-use stale files
    sessionStorage.removeItem("dragline_reorder_files");
  } catch {}
}, []);

// ─── REMOVE the old version of this useEffect that looks like: ───────────────
// useEffect(() => {
//   try {
//     const saved = localStorage.getItem("dragline_cart");
//     if (saved) {
//       const items = JSON.parse(saved);
//       setCartItems(items.map((i: any) => ({ ...i, file: null, geometry: null })));
//     }
//   } catch {}
// }, []);
