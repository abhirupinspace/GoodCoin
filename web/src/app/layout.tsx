import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GOODCOIN — Make good contagious", template: "%s · GOODCOIN" },
  description: "Give together. Get GOOD. Bring a friend. A memecoin on NEAR whose floor never goes down.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
