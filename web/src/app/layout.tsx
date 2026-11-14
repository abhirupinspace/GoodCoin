import type { Metadata, Viewport } from "next";
import { Archivo, Bebas_Neue, Libre_Baskerville, Patrick_Hand } from "next/font/google";
import { InkFilterDefs } from "@/components/comic/InkFilterDefs";
import { Providers } from "@/components/Providers";
import "./globals.css";

const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const patrick = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick", display: "swap" });
const baskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-baskerville", display: "swap" });

export const metadata: Metadata = {
  title: { default: "GOODCOIN · Make good contagious", template: "%s · GOODCOIN" },
  description:
    "Memecoins coordinate millions of people to buy. GOODCOIN coordinates them to give together. One cause, one community, one fire every week, on NEAR.",
  openGraph: { title: "GOODCOIN · Make good contagious", description: "One cause. One community. One fire every week.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#24221e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${archivo.variable} ${baskerville.variable} ${patrick.variable}`}>
      <body className="paper min-h-screen">
        <InkFilterDefs />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
