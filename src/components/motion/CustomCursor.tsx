import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useLocation } from "@tanstack/react-router";

const INTERACTIVE = "a, button, [role='button'], [data-cursor], summary";
const FIELD = "input, textarea, select, [contenteditable='true']";
const MEDIA = "img, picture, video, [data-cursor-media]";
const MAGNETIC = "[data-magnetic]";

type CursorMode = "idle" | "link" | "media" | "field";

/**
 * Decorative follower only. The native cursor stays visible and fully
 * functional; this is disabled on coarse pointers, reduced motion, and the
 * dense staff workspace. Text fields hand control back to the native caret.
 */
export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<CursorMode>("idle");
  const [label, setLabel] = useState("");
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const magnetRef = useRef<HTMLElement | null>(null);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 520, damping: 34, mass: 0.42 });
  const ringY = useSpring(y, { stiffness: 520, damping: 34, mass: 0.42 });

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

    const releaseMagnet = () => {
      if (magnetRef.current) {
        magnetRef.current.style.translate = "";
        magnetRef.current = null;
      }
    };

    const applyMagnet = (target: HTMLElement | null, clientX: number, clientY: number) => {
      const magnetic = target?.closest(MAGNETIC) as HTMLElement | null;
      if (!magnetic) {
        releaseMagnet();
        return;
      }
      const rect = magnetic.getBoundingClientRect();
      const dx = Math.max(-9, Math.min(9, (clientX - (rect.left + rect.width / 2)) * 0.14));
      const dy = Math.max(-7, Math.min(7, (clientY - (rect.top + rect.height / 2)) * 0.18));
      magnetic.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
      magnetRef.current = magnetic;
    };

    const onMove = (event: MouseEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setVisible(true);
      const target = event.target as HTMLElement | null;
      applyMagnet(target, event.clientX, event.clientY);
    };

    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(FIELD)) {
        setMode("field");
        setLabel("");
        return;
      }
      const interactive = target?.closest(INTERACTIVE) as HTMLElement | null;
      const overImage = Boolean(target?.closest(MEDIA));
      const customLabel = interactive?.dataset.cursor;
      setLabel(customLabel && customLabel !== "true" ? customLabel : "");
      // The large contextual ring belongs to photography; CTAs keep the
      // tighter label ring so actions still feel precise.
      if (interactive) {
        setMode(overImage ? "media" : "link");
        return;
      }
      setMode(overImage ? "media" : "idle");
    };

    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => {
      setVisible(false);
      releaseMagnet();
    };
    const onEnter = () => setVisible(true);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      releaseMagnet();
    };
  }, [enabled, reduceMotion, isWorkspace, x, y]);

  if (!enabled || reduceMotion || isWorkspace) return null;

  const showLabel = mode === "media" || (mode === "link" && label.length > 0);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] hidden [@media(pointer:fine)]:block">
      <motion.span
        className="cursor-dot no-print"
        data-pressed={pressed}
        style={{ x, y, opacity: visible ? 1 : 0 }}
        transition={{ opacity: { duration: 0.18 } }}
      />
      <motion.span
        className="cursor-ring no-print"
        data-mode={mode}
        data-pressed={pressed}
        style={{ x: ringX, y: ringY, opacity: visible ? 1 : 0 }}
        transition={{ opacity: { duration: 0.18 } }}
      >
        <span className="cursor-label">{showLabel ? label : ""}</span>
      </motion.span>
    </div>
  );
}
