import { useEffect, useMemo } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

interface AnimatedNumberProps {
  value: string | number;
  className?: string;
}

function parseValue(raw: string | number) {
  const text = String(raw);
  const match = text.match(/^([^0-9-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/s);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const numeric = Number(digits.replaceAll(",", ""));
  if (!Number.isFinite(numeric)) return null;
  const indianGrouping = prefix.includes("₹") || digits.includes(",");
  const decimals = digits.includes(".") ? (digits.split(".")[1]?.length ?? 0) : 0;
  return { prefix, suffix, numeric, indianGrouping, decimals };
}

/**
 * Animates only when the underlying real value changes. Formatting happens in
 * a derived motion value so the component does not re-render on every frame.
 */
export function AnimatedNumber({ value, className = "" }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const parsed = useMemo(() => parseValue(value), [value]);
  const motionValue = useMotionValue(0);

  const formatted = useTransform(motionValue, (latest) => {
    if (!parsed) return String(value);
    const formatter = new Intl.NumberFormat(parsed.indianGrouping ? "en-IN" : "en-US", {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals,
    });
    return `${parsed.prefix}${formatter.format(latest)}${parsed.suffix}`;
  });

  useEffect(() => {
    if (!parsed || reduceMotion) {
      motionValue.set(parsed?.numeric ?? 0);
      return;
    }
    const controls = animate(motionValue, parsed.numeric, {
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [motionValue, parsed, reduceMotion]);

  if (!parsed) return <span className={className}>{value}</span>;

  return <motion.span className={`tabular-nums ${className}`}>{formatted}</motion.span>;
}
