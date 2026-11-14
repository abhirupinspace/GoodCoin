import type { Metadata, Viewport } from "next";
import { Anton, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "GOODCOIN · Make good contagious", template: "%s · GOODCOIN" },
  description:
    "Memecoins coordinate millions of people to buy. GOODCOIN coordinates them to give together. One cause, one community, one fire every week, on NEAR.",
  openGraph: { title: "GOODCOIN · Make good contagious", description: "One cause. One community. One fire every week.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#090909" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${grotesk.variable} ${plexMono.variable}`}>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
