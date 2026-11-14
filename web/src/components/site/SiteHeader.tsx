"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, Logo } from "@/components/ui";

const NAV = [
  { href: "/how-it-works", label: "How it works", no: "02" },
  { href: "/tokenomics", label: "Tokenomics", no: "03" },
  { href: "/good-wall", label: "Good Wall", no: "04" },
  { href: "/fires", label: "All fires", no: "05" },
  { href: "/about", label: "About", no: "06" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-10 md:flex" aria-label="Main">
          {NAV.map((n) => {
            const on = path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className={`meta relative py-2 transition-colors ${on ? "text-ink" : "text-mute hover:text-ink"}`}>
                {n.label}
                {on && <motion.span layoutId="nav-active" className="absolute -bottom-[1px] left-0 right-0 h-px bg-red" />}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:block"><Button href="/app">This week&apos;s fire <span className="arrow">→</span></Button></div>
        <button className="meta md:hidden" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-menu" aria-label="Mobile"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col bg-paper px-4 pb-8 md:hidden">
            {[{ href: "/", label: "The movement", no: "01" }, ...NAV].map((n, i) => (
              <motion.div key={n.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.4 }}>
                <Link href={n.href} onClick={() => setOpen(false)} className="flex items-baseline gap-4 border-b border-line py-4">
                  <span className="meta text-red">{n.no}</span><span className="display text-5xl text-ink">{n.label}</span>
                </Link>
              </motion.div>
            ))}
            <Button href="/app" size="lg" className="mt-auto w-full">Join this week&apos;s fire <span className="arrow">→</span></Button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
