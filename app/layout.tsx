import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Dragline 3D · Layer by layer.",
  description:
    "Industrial-grade FDM 3D printing out of Louisville, Kentucky. Quoted in minutes. Layer by layer.",
  metadataBase: new URL("https://dragline3d.com"),
  openGraph: {
    title: "Dragline 3D · Layer by layer.",
    description: "Industrial-grade FDM 3D printing out of Louisville, Kentucky.",
    url: "https://dragline3d.com",
    siteName: "Dragline 3D",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
