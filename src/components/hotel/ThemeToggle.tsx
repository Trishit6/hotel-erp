import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../lib/theme";

export function ThemeToggle({ className = "", subtle = false }: { className?: string; subtle?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
        subtle
          ? "border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
          : "border-[var(--line-2)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={reduceMotion ? false : { opacity: 0, rotate: -35, scale: 0.7 }}
          animate={reduceMotion ? undefined : { opacity: 1, rotate: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, rotate: 35, scale: 0.7 }}
          transition={{ duration: 0.22 }}
          className="grid place-items-center"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
