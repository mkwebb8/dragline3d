/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["three", "jspdf", "html2canvas", "jszip"],
};

module.exports = nextConfig;

// Dev: wire up @opennextjs/cloudflare bindings
if (process.env.NODE_ENV === "development") {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}
