import { useLayoutEffect, type DependencyList, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

function ensurePlugins() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

/**
 * Runs GSAP inside a scoped context so every timeline and ScrollTrigger is
 * reverted when the component unmounts or its dependencies change. Setup is
 * skipped entirely when the visitor prefers reduced motion.
 */
export function useGsap(
  setup: () => void,
  deps: DependencyList,
  scope: RefObject<HTMLElement | null>,
) {
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const element = scope.current;
    if (!element || reduceMotion) return;
    ensurePlugins();

    const context = gsap.context(setup, element);
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 220);

    return () => {
      window.clearTimeout(refresh);
      context.revert();
    };
    // The caller owns the dependency list; this hook intentionally forwards it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, ...deps]);
}
