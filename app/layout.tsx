import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
export const metadata: Metadata = { title:{ default:"Dragline 3D | Custom Additive Manufacturing", template:"%s | Dragline 3D" }, description:"Custom FDM additive manufacturing for functional parts, prototypes, replacement parts, fixtures, and short production runs in Louisville, Kentucky.", metadataBase:new URL("https://dragline3d.com"), icons:{icon:"/favicon.svg"}, openGraph:{title:"Dragline 3D | Custom Additive Manufacturing",description:"Functional parts, prototypes, replacement parts, and short production runs.",url:"https://dragline3d.com",siteName:"Dragline 3D",locale:"en_US",type:"website"} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><Nav/><main className="min-h-screen">{children}</main><Footer/></body></html>; }
