"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, Logo } from "@/components/ui";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/good-wall", label: "Good Wall" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-double border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`eyebrow hover:text-burnt ${path.startsWith(n.href) ? "text-burnt" : ""}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="hidden md:block"><Button href="/app" tone="dark">Launch App ↗</Button></div>
        <button className="md:hidden display text-2xl" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <nav id="mobile-menu" className="border-t-2 border-ink bg-paper px-4 pb-6 md:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="display block border-b border-ink/20 py-3 text-4xl">{n.label}</Link>
          ))}
          <Button href="/app" tone="ember" className="mt-5 w-full">Launch App ↗</Button>
        </nav>
      )}
    </header>
  );
}
