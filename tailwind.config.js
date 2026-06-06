/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ironworks: "#0f0f10",
        ironworks2: "#18181a",
        ironworks3: "#2a2a2c",
        amber: {
          DEFAULT: "#ffb547",
          dark: "#d99535",
        },
        bone: "#e8e6e1",
        steel: "#5a5a5e",
      },
      fontFamily: {
        display: ["var(--font-archivo)", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};
