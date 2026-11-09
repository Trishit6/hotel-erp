import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useLocation } from "@tanstack/react-router";

const INTERACTIVE = "a, button, [role='button'], input, select, textarea, [data-cursor]";

/**
 * Decorative follower only. The native cursor stays visible and fully
 * functional; this is disabled on coarse pointers, reduced motion, and the
 * dense staff workspace.
 */
export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [label, setLabel] = useState("");
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 320, damping: 30, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 320, damping: 30, mass: 0.5 });

  const isWorkspace = ["/admin", "/manager", "/reception", "/housekeeping", "/staff"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    setEnabled(finePointer.matches);
    const onChange = (event: MediaQueryListEvent) => setEnabled(event.matches);
    finePointer.addEventListener("change", onChange);
    return () => finePointer.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!enabled || reduceMotion || isWorkspace) return;

    const onMove = (event: MouseEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setVisible(true);
    };
    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest(INTERACTIVE) as HTMLElement | null;
      setHovering(Boolean(interactive));
      const customLabel = interactive?.dataset.cursor;
      setLabel(customLabel && customLabel !== "true" ? customLabel : "");
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [enabled, reduceMotion, isWorkspace, x, y]);

  if (!enabled || reduceMotion || isWorkspace) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] hidden [@media(pointer:fine)]:block">
      <motion.span
        className="cursor-dot no-print"
        style={{ x, y, opacity: visible ? 1 : 0 }}
        transition={{ opacity: { duration: 0.2 } }}
      />
      <motion.span
        className="cursor-ring no-print"
        data-hover={hovering}
        style={{ x: ringX, y: ringY, opacity: visible ? 1 : 0 }}
        transition={{ opacity: { duration: 0.2 } }}
      >
        <span className="cursor-label">{label}</span>
      </motion.span>
    </div>
  );
}
