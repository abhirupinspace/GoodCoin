import Link from "next/link";
import { MonumentalFlame, Sunburst } from "@/components/art";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden">
      <Sunburst className="absolute inset-0 h-full w-full" color="#f2efe9" opacity={0.12} />
      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <MonumentalFlame animated={false} className="mx-auto h-40 opacity-40 grayscale" />
        <p className="eyebrow mt-8 text-burnt">Error 404</p>
        <h1 className="display misprint mt-3 text-7xl sm:text-9xl">This fire went out.</h1>
        <p className="mt-6 font-serif text-lg text-ink/80">Nothing lives at this address. The movement is still burning elsewhere.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/app" className="display inline-flex h-14 items-center bg-ember px-6 text-2xl text-charcoal hover:bg-red">See this week&apos;s fire</Link>
          <Link href="/" className="display inline-flex h-14 items-center border-2 border-line px-6 text-2xl hover:bg-charcoal hover:text-ink">Back home</Link>
        </div>
      </div>
    </main>
  );
}
