import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ContractGate } from "@/components/ContractGate";
import { Nav } from "@/components/Nav";
import { ParamsBadge } from "@/components/ParamsBadge";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "GOODCOIN", template: "%s · GOODCOIN" },
  description: "A community memecoin minted only when the community collectively verifies enough good deeds each epoch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
            Skip to content
          </a>
          <div className="sticky top-0 z-30">
            <ParamsBadge />
          </div>
          <Nav />
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
            <ContractGate>{children}</ContractGate>
          </main>
          <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-fg">
            All figures are read live from the contract on NEAR testnet. Accounts are not people; see About for limitations.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
