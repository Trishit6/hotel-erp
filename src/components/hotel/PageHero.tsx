import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { SectionEyebrow } from "./HotelUi";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  accent?: string;
  intro: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
  children?: ReactNode;
}

export function PageHero({ eyebrow, title, accent, intro, image, imageAlt, imagePosition = "center", children }: PageHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-4 md:px-7 md:pt-6">
      <div className="relative grid overflow-hidden rounded-[1.9rem] bg-[var(--surface-2)] lg:min-h-[560px] lg:grid-cols-[1.02fr_0.98fr]">
        <div className="relative z-10 flex flex-col justify-center px-7 pb-10 pt-12 sm:px-12 lg:px-14 lg:py-16 xl:px-20">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <SectionEyebrow>{eyebrow}</SectionEyebrow>
          </motion.div>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-[680px] font-display text-[clamp(3rem,5.8vw,5.4rem)] leading-[0.96] tracking-[-0.035em] text-[var(--ink)]"
          >
            {title}
            {accent && (
              <>
                <br />
                <em className="text-[var(--sage)]">{accent}</em>
              </>
            )}
          </motion.h1>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-6 max-w-[500px] text-sm leading-7 text-[var(--muted)] md:text-[15px]"
          >
            {intro}
          </motion.p>
          {children && (
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.26 }} className="mt-8">
              {children}
            </motion.div>
          )}
        </div>
        <div className="relative min-h-[320px] overflow-hidden bg-[var(--deep)] sm:min-h-[420px] lg:min-h-0">
          <motion.img
            initial={reduceMotion ? false : { scale: 1.06 }}
            animate={reduceMotion ? undefined : { scale: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover"
            style={{ objectPosition: imagePosition }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep)]/55 via-[var(--deep)]/5 to-transparent" />
        </div>
      </div>
    </section>
  );
}
