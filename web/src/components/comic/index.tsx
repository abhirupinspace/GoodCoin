"use client";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { MASTER, SHOTS, type Shot, type ShotName } from "./art";

/* ------------------------------------------------------------------ panels */

/** A comic panel with a hand-inked border. `tone` sets the ground. */
export function ComicPanel({ children, className = "", tone = "paper", shadow = true, thin = false }: {
  children: ReactNode; className?: string; tone?: "paper" | "parchment" | "dark" | "ember"; shadow?: boolean; thin?: boolean;
}) {
  const ground = { paper: "bg-paper", parchment: "bg-parchment", dark: "paper-dark", ember: "bg-ember" }[tone];
  return (
    <div className={`ink-panel ${thin ? "ink-panel-thin" : ""} ${ground} ${shadow ? (tone === "dark" ? "ink-shadow-ember" : "ink-shadow") : ""} ${className}`}>
      {children}
    </div>
  );
}

/** Narration caption (the yellow box of a graphic novel). */
export function NarrationBox({ children, className = "", tone = "mustard" }: { children: ReactNode; className?: string; tone?: "mustard" | "paper" }) {
  return <p className={`narration ${tone === "paper" ? "narration-paper" : ""} text-lg sm:text-xl ${className}`}>{children}</p>;
}

/** Small hand-lettered label above a heading ("Chapter two", "Scene 3"). */
export function SectionCaption({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`lettering text-lg ${light ? "text-mustard" : "text-burnt"}`}>{children}</p>;
}

/** Hand-drawn wavy ink rule. */
export function HandDrawnDivider({ className = "", color = "#24221e" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 600 16" preserveAspectRatio="none" aria-hidden className={`h-4 w-full ${className}`}>
      <path d="M2 9 C 60 3, 110 13, 170 8 S 290 4, 350 9 S 470 13, 530 7 S 590 9, 598 8" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ filter: "url(#ink-rough)" }} />
    </svg>
  );
}

/* ------------------------------------------------------------------ art */

/** A cinematic crop of the master artwork, inside an inked frame. Decorative unless `alt` is given. */
export function ArtPanel({ shot, aspect = "4/3", className = "", alt = "", children, frame = true, priority = false }: {
  shot: ShotName | Shot; aspect?: string; className?: string; alt?: string; children?: ReactNode; frame?: boolean; priority?: boolean;
}) {
  const s = typeof shot === "string" ? SHOTS[shot] : shot;
  return (
    <div className={`${frame ? "ink-panel ink-shadow" : ""} relative overflow-hidden bg-parchment ${className}`} style={{ aspectRatio: aspect }}>
      <div className="halftone absolute inset-0 opacity-30" aria-hidden />
      <Image
        src={MASTER.src}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="object-cover"
        style={{ objectPosition: `${s.x}% ${s.y}%`, transform: `scale(${s.zoom})`, transformOrigin: `${s.x}% ${s.y}%` }}
      />
      {children && <div className="absolute inset-x-3 bottom-3 z-[3]">{children}</div>}
    </div>
  );
}

/** A small glowing ember: one person's contribution. */
export function Spark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full bg-ember/40 blur-[6px]" />
      <span className="absolute inset-[22%] rounded-full bg-ember" />
      <span className="absolute inset-[38%] rounded-full bg-mustard" />
    </span>
  );
}

/* ------------------------------------------------------------------ motion */

/** Reveal on scroll: a panel clips in from below. Honours reduced motion. */
export function Reveal({ children, delay = 0, className = "", as = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 28, clipPath: "inset(0 0 18% 0)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.75, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Mask reveal for illustrations: a rectangle wipes open left to right. */
export function MaskReveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      whileInView={{ clipPath: "inset(0 0% 0 0)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1.1, delay, ease: [0.65, 0, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** The ember trail: an ember travels down an ink line as the reader scrolls a chapter (desktop only). */
export function EmberTrail() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start center", "end center"] });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], ["0%", "100%"]), { stiffness: 80, damping: 20 });
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 2.2]);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-y-0 left-6 hidden w-6 xl:block">
      <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-ink/25" />
      {!reduce && (
        <motion.div className="absolute left-1/2 -translate-x-1/2" style={{ top: y }}>
          <motion.div style={{ scale }}><Spark size={20} /></motion.div>
        </motion.div>
      )}
    </div>
  );
}
