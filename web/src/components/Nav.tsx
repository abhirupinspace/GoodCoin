"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AccountMenu } from "./AccountMenu";

const LINKS = [
  ["/", "Overview"],
  ["/challenges", "Challenges"],
  ["/submit", "Submit"],
  ["/verify", "Verify"],
  ["/treasury", "Treasury"],
  ["/epochs", "Epochs"],
  ["/activity", "Activity"],
  ["/leaderboard", "Leaderboard"],
  ["/about", "About"],
] as const;

export function Nav() {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold focus-visible:outline-2 focus-visible:outline-ring">
          <span aria-hidden className="grid size-7 place-items-center rounded-full bg-accent text-sm text-accent-fg">
            ✓
          </span>
          GOODCOIN
        </Link>
        <div className="ml-auto sm:order-last">
          <AccountMenu />
        </div>
        <nav aria-label="Main" className="-mx-1 w-full overflow-x-auto sm:w-auto sm:flex-1">
          {/* The current path is request-time data; the links render without highlighting until it streams in. */}
          <Suspense fallback={<NavLinks path={null} />}>
            <CurrentNavLinks />
          </Suspense>
        </nav>
      </div>
    </div>
  );
}

function CurrentNavLinks() {
  return <NavLinks path={usePathname()} />;
}

function NavLinks({ path }: { path: string | null }) {
  const active = (href: string) => path !== null && (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <ul className="flex gap-1 whitespace-nowrap">
      {LINKS.map(([href, label]) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className="inline-flex min-h-10 items-center rounded-md px-2.5 text-sm text-muted-fg hover:bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-fg"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
