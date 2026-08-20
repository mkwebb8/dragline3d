/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: { ironworks: "#0b0c0d", ironworks2: "#111315", ironworks3: "#202427", amber: { DEFAULT: "#e9a23b", dark: "#c68127" }, bone: "#f1eee4", steel: "#73777a", success: "#5fc47c", warning: "#e9a23b", error: "#ed6a5e", info: "#6ca8d9" },
    fontFamily: { display: ["var(--font-display)"], sans: ["var(--font-body)"], mono: ["var(--font-mono)"] }, maxWidth: { content: "76rem" },
  } }, plugins: [],
};
