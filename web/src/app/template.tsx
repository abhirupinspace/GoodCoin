"use client";
import { motion, useReducedMotion } from "motion/react";

/** Page entrance: each route opens like a new chapter, a paper mask lifting from the top. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0.6 }} animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }} transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}>
      {children}
    </motion.div>
  );
}
