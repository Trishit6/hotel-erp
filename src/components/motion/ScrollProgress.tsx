import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useLocation } from "@tanstack/react-router";

/** A 2px champagne progress line on guest pages only. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 32, mass: 0.4 });
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();
  const isWorkspace = ["/admin", "/manager", "/reception", "/housekeeping", "/staff"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (reduceMotion || isWorkspace) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="scroll-progress no-print"
      style={{ scaleX }}
    />
  );
}
