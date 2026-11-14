"use client";
import { motion, useReducedMotion } from "motion/react";

/** Route transition: a dark veil lifts while the page settles up into place. Same timing everywhere. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <>
      <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[90] bg-paper" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </>
  );
}
