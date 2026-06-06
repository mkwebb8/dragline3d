import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dragline 3D · Layer by layer.",
  description:
    "Industrial-grade FDM 3D printing out of Louisville, Kentucky. Quoted in minutes. Layer by layer.",
  metadataBase: new URL("https://dragline3d.com"),
  icons: {
    icon: '/favicon.svg',
  },
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
      <body className={`${archivo.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
        <Nav />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
