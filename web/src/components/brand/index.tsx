"use client";
/**
 * GOODCOIN brand system: image plates, motion primitives, labels and the hero family.
 * Every page is composed from these, so the whole site reads as one campaign.
 */
import Image from "next/image";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Children, useRef, type CSSProperties, type ReactNode } from "react";
import { FlameMark } from "@/components/art";
import { ASSETS, SHOTS, type ShotName } from "./assets";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Positioned unless the caller already positions it (Tailwind's `relative` would otherwise win over `absolute`). */
const pos = (cls: string) => (/\b(absolute|fixed|sticky)\b/.test(cls) ? "" : "relative");

/* ================================================================== images */

export type Treatment = "fire" | "mono" | "red" | "colour";

/**
 * A cinematic crop of an asset. `fire` (the signature) prints the image in monochrome and keeps only
 * the flame in colour; `red` is a deep red duotone; `mono` is pure black and white.
 * The plate is sized in container units so the focal point stays centred at any frame aspect.
 */
export function Plate({ shot, treatment = "fire", className = "", style, priority = false, sizes = "(min-width: 1024px) 60vw, 100vw" }: {
  shot: ShotName; treatment?: Treatment; className?: string; style?: CSSProperties; priority?: boolean; sizes?: string;
}) {
  const s = SHOTS[shot];
  const a = ASSETS[s.asset];
  const ratio = a.width / a.height;
  const f = "flame" in a ? a.flame : undefined;
  const plate: CSSProperties = {
    position: "absolute", left: "50%", top: "50%",
    width: `max(${s.zoom * 100}cqw, ${s.zoom * ratio * 100}cqh)`, aspectRatio: `${a.width} / ${a.height}`,
    transform: `translate(-${s.x}%, -${s.y}%)`,
  };
  const base = treatment === "colour" ? "saturate(1.05)" : "grayscale(1) contrast(1.35) brightness(0.82)";
  return (
    <div className={`${pos(className)} overflow-hidden ${className}`} style={{ containerType: "size", ...style }} aria-hidden>
      <div style={plate}>
        <Image src={a.src} alt="" fill preload={priority} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} sizes={sizes} style={{ filter: base }} />
        {treatment === "fire" && f && (
          <Image src={a.src} alt="" fill loading={priority ? "eager" : "lazy"} sizes={sizes} style={{
            filter: "saturate(1.25) contrast(1.1)",
            maskImage: `radial-gradient(ellipse ${f.rx}% ${f.ry}% at ${f.x}% ${f.y}%, #000 45%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(ellipse ${f.rx}% ${f.ry}% at ${f.x}% ${f.y}%, #000 45%, transparent 100%)`,
          }} />
        )}
      </div>
      {treatment === "red" && <div className="absolute inset-0 bg-red mix-blend-multiply" />}
      {treatment === "red" && <div className="absolute inset-0 bg-blood/40 mix-blend-screen" />}
    </div>
  );
}

/** A plate that reveals through a clipping mask when scrolled into view and settles from a slight zoom. */
export function ImageReveal({ shot, treatment, className = "", delay = 0, priority = false }: { shot: ShotName; treatment?: Treatment; className?: string; delay?: number; /** Above the fold: load eagerly. */ priority?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Observe the unclipped wrapper; a fully clipped element never reports an intersection.
  const seen = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  if (reduce) return <Plate shot={shot} treatment={treatment} className={className} priority={priority} />;
  return (
    <div ref={ref} className={`${pos(className)} overflow-hidden ${className}`}>
      <motion.div className="absolute inset-0" initial={{ clipPath: "inset(100% 0 0 0)" }} animate={seen ? { clipPath: "inset(0% 0 0 0)" } : undefined} transition={{ duration: 1.1, delay, ease: EASE }}>
        <motion.div className="absolute inset-0" initial={{ scale: 1.18 }} animate={seen ? { scale: 1 } : undefined} transition={{ duration: 1.6, delay, ease: EASE }}>
          <Plate shot={shot} treatment={treatment} className="absolute inset-0" priority={priority} />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ================================================================== motion */

/** Content that rises in when scrolled into view. */
export function Reveal({ children, delay = 0, className = "", as = "div", mount = false }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" | "section" | "article"; /** Play on mount (heroes), not on scroll. */ mount?: boolean }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp className={className} initial={{ opacity: 0, y: 28 }} {...(mount ? { animate: { opacity: 1, y: 0 } } : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-8% 0px" } })} transition={{ duration: 0.9, delay, ease: EASE }}>
      {children}
    </Comp>
  );
}

/** Children rise in one after another. */
export function Stagger({ children, className = "", step = 0.08 }: { children: ReactNode; className?: string; step?: number }) {
  return <div className={className}>{Children.map(children, (c, i) => <Reveal delay={i * step}>{c}</Reveal>)}</div>;
}

/** Headline whose lines slide up out of a mask, staggered. `inView` waits for scroll; otherwise it plays on mount. */
export function Lines({ lines, className = "", as = "h2", inView = false, delay = 0 }: { lines: ReactNode[]; className?: string; as?: "h1" | "h2" | "p"; inView?: boolean; delay?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  // Observe the heading itself: the moving spans sit inside their own masks and never intersect.
  const seen = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const show = !inView || seen;
  const Tag = as;
  return (
    <Tag ref={ref} className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.04em]">
          {reduce ? <span className="block">{l}</span> : (
            <motion.span className="block" initial={{ y: "105%" }} animate={{ y: show ? "0%" : "105%" }} transition={{ duration: 1, delay: delay + i * 0.09, ease: EASE }}>
              {l}
            </motion.span>
          )}
        </span>
      ))}
    </Tag>
  );
}

/** Slow rising embers. Pure CSS; reduced motion stops them. */
export function EmberField({ count = 16, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="absolute bottom-0 block animate-rise rounded-full bg-ember"
          style={{ left: `${(i * 37 + 11) % 100}%`, width: i % 3 ? 3 : 5, height: i % 3 ? 3 : 5, animationDelay: `${(i * 0.61) % 9}s`, animationDuration: `${7 + (i % 5)}s`, opacity: 0, boxShadow: "0 0 8px #e45a24" }} />
      ))}
    </div>
  );
}

/* ================================================================== type */

/** Section label / chapter marker: "03 / The Hearth". */
export function Label({ no, children, className = "" }: { no?: string; children: ReactNode; className?: string }) {
  return (
    <p className={`meta flex items-center gap-3 text-mute ${className}`}>
      {no && <span className="text-red">{no}</span>}
      {no && <span className="h-px w-8 bg-line" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

/** The flame symbol, the one recurring mark. */
export function Flame({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <FlameMark width={size * 0.8} height={size} className={`origin-bottom animate-flicker ${className}`} />;
}

/** A content section on the shared grid and rhythm. */
export function Section({ id, children, className = "", tone = "paper", bleed = false }: { id?: string; children: ReactNode; className?: string; tone?: "paper" | "dark" | "raised" | "red"; bleed?: boolean }) {
  const bg = { paper: "bg-paper", dark: "bg-parchment", raised: "bg-raised", red: "bg-blood" }[tone];
  return (
    <section id={id} className={`relative scroll-mt-20 border-t border-line ${bg} ${className}`}>
      {bleed ? children : <div className="shell py-24 md:py-36">{children}</div>}
    </section>
  );
}

/** Arrow link with an underline reveal. */
export function TextLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} className={`meta inline-flex items-center gap-2 text-ink ${className}`}><span className="tlink">{children}</span><span className="arrow" aria-hidden>→</span></a>;
}

/* ================================================================== heroes */

export type HeroVariant = "cinematic" | "split" | "red" | "editorial" | "poster" | "minimal";

/**
 * The brutalist hero family. Every route opens with one. Same type, colour and motion; different composition.
 * - cinematic: full-bleed image, oversized type bottom-left (home, about)
 * - split: asymmetric type / image (how it works)
 * - red: full-bleed red duotone image (good wall)
 * - editorial: type plus a numbered metadata grid (tokenomics, docs, fire detail)
 * - poster: giant type with a single flame symbol (faq)
 * - minimal: technical, small mark, ruled metadata (security, legal)
 */
export function Hero({ variant, marker, lines, lede, actions, shot, meta, children, h1Class, treatment, full = false }: {
  variant: HeroVariant; marker: ReactNode; lines: ReactNode[]; lede?: ReactNode; actions?: ReactNode;
  shot?: ShotName; meta?: [ReactNode, ReactNode][]; children?: ReactNode; h1Class?: string;
  /** Override the image treatment. */ treatment?: Treatment;
  /** Cinematic only: the image spans the full width instead of the right side. */ full?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0.25]);
  const big = h1Class ?? "mega";

  const Copy = (
    <>
      <Reveal mount><div className="meta text-mute">{marker}</div></Reveal>
      <Lines as="h1" lines={lines} className={`${big} mt-6 text-ink`} delay={0.1} />
      {lede && <Reveal mount delay={0.35}><div className="mt-8 max-w-md text-lg leading-relaxed text-mute sm:text-xl">{lede}</div></Reveal>}
      {actions && <Reveal mount delay={0.45}><div className="mt-10 flex flex-wrap gap-3">{actions}</div></Reveal>}
      {children && <Reveal mount delay={0.5}><div className="mt-10">{children}</div></Reveal>}
    </>
  );

  const MetaGrid = meta && (
    <Reveal mount delay={0.4}>
      <dl className="grid grid-cols-2 border-t border-line md:grid-cols-4">
        {meta.map(([k, v], i) => (
          <div key={i} className={`border-b border-line py-5 pr-4 ${i % 4 ? "md:border-l md:pl-5" : ""} ${i % 2 ? "border-l pl-5 md:pl-5" : ""}`}>
            <dt className="meta text-mute">{k}</dt>
            <dd className="display num mt-2 text-3xl text-ink sm:text-4xl">{v}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );

  if (variant === "cinematic" || variant === "red") {
    return (
      <section ref={ref} className={`relative flex min-h-[min(calc(100svh-4rem),60rem)] items-end overflow-hidden ${variant === "red" ? "bg-blood" : "bg-paper"}`}>
        {shot && (
          <motion.div className="absolute inset-0" style={reduce ? undefined : { scale, opacity: fade }}>
            <Plate shot={shot} treatment={treatment ?? (variant === "red" ? "red" : "fire")} priority className={`absolute inset-0 ${full ? "" : "md:left-[40%]"}`} sizes="100vw" />
          </motion.div>
        )}
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-paper via-paper/50 to-transparent md:bg-gradient-to-r md:from-paper ${full ? "md:via-paper/80 md:to-paper/0" : "md:via-paper/60 md:to-transparent"}`} aria-hidden />
        {full && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" aria-hidden />}
        {variant === "cinematic" && <EmberField />}
        <div className="shell relative z-10 pb-14 pt-32 md:pb-20">{Copy}{MetaGrid && <div className="mt-16">{MetaGrid}</div>}</div>
      </section>
    );
  }

  if (variant === "split") {
    return (
      <section ref={ref} className="relative grid min-h-[min(calc(92svh-4rem),56rem)] border-b border-line md:grid-cols-[1.1fr_0.9fr]">
        <div className="shell flex flex-col justify-end py-16 md:py-24 md:pr-12">{Copy}</div>
        {shot && (
          <div className="relative min-h-[min(60svh,40rem)] border-t border-line md:border-l md:border-t-0">
            <ImageReveal shot={shot} treatment="fire" className="absolute inset-0" priority />
            <div className="meta absolute bottom-5 left-5 z-10 text-ink/70">Fig. 01</div>
          </div>
        )}
      </section>
    );
  }

  if (variant === "poster") {
    return (
      <section ref={ref} className="relative overflow-hidden border-b border-line">
        <div className="halftone-ember absolute -right-24 top-0 h-full w-1/2 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden />
        <div className="shell relative grid min-h-[min(calc(80svh-4rem),48rem)] items-end gap-12 py-20 md:grid-cols-[1fr_auto] md:py-28">
          <div>{Copy}</div>
          <Reveal delay={0.3} className="hidden md:block"><Flame size={220} /></Reveal>
        </div>
      </section>
    );
  }

  // editorial + minimal
  return (
    <section ref={ref} className="relative overflow-hidden border-b border-line">
      {variant === "editorial" && shot && (
        <div className="absolute inset-y-0 right-0 hidden w-[42%] opacity-60 lg:block [mask-image:linear-gradient(to_left,black_30%,transparent)]">
          <Plate shot={shot} treatment="fire" className="absolute inset-0" />
        </div>
      )}
      <div className={`shell relative ${variant === "minimal" ? "py-20 md:py-28" : "pb-0 pt-20 md:pt-28"}`}>
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-5xl">{Copy}</div>
          {variant === "minimal" && <Reveal delay={0.3} className="hidden pt-2 md:block"><Flame size={56} /></Reveal>}
        </div>
        {MetaGrid && <div className="mt-20">{MetaGrid}</div>}
      </div>
    </section>
  );
}

/** Compact header for application routes: same language, a third of the height. */
export function AppHero({ marker, title, lede, aside }: { marker: ReactNode; title: ReactNode; lede?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="relative mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
      <div className="max-w-3xl">
        <p className="meta text-mute">{marker}</p>
        <Lines as="h1" lines={[title]} className="display mt-4 text-5xl text-ink sm:text-7xl" />
        {lede && <Reveal delay={0.2}><div className="mt-4 max-w-xl text-base leading-relaxed text-mute">{lede}</div></Reveal>}
      </div>
      {aside}
    </header>
  );
}

/** Closing campaign band: deep red, giant type, one action. */
export function FinalCall({ lines, lede, actions }: { lines: ReactNode[]; lede?: ReactNode; actions: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-blood">
      <div className="halftone absolute inset-0 opacity-40" aria-hidden />
      <EmberField count={10} />
      <div className="shell relative py-28 md:py-40 [&_a.bg-red]:bg-ink [&_a.bg-red]:text-paper [&_a.bg-red:hover]:bg-ember [&_a.border-line]:border-ink/50">
        <Lines lines={lines} inView className="mega text-ink" />
        {lede && <Reveal delay={0.2}><p className="mt-8 max-w-md text-lg text-ink/80">{lede}</p></Reveal>}
        <Reveal delay={0.3}><div className="mt-10 flex flex-wrap gap-3">{actions}</div></Reveal>
      </div>
    </section>
  );
}
