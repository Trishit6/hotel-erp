import type { ReactNode } from "react";
import { GsapImage } from "../motion/GsapImage";

/**
 * Public-only atmospheric layer.
 *
 * Mounted per public page instead of globally so the internal ERP keeps its
 * own dark glass shell. All motion here is transform/opacity only, and the
 * layer sits behind the page content.
 */
export function PageAtmosphere() {
  return (
    <div className="page-atmosphere no-print" aria-hidden="true">
      <div className="page-atmosphere__base" />
      <div className="page-atmosphere__beam page-atmosphere__beam--a" />
      <div className="page-atmosphere__beam page-atmosphere__beam--b" />
      <div className="page-atmosphere__orb page-atmosphere__orb--gold" />
      <div className="page-atmosphere__orb page-atmosphere__orb--sage" />
      <svg
        className="page-atmosphere__lines"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M-120 690C220 520 430 800 760 640S1240 480 1560 620"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M-120 760C240 590 450 870 780 710S1260 550 1560 690"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.55"
        />
        <path
          d="M180 900C260 700 250 460 140 0"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.45"
        />
        <path
          d="M1280 900C1200 680 1220 430 1340 0"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.45"
        />
        <circle cx="1180" cy="190" r="210" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="1180" cy="190" r="300" stroke="currentColor" strokeWidth="1" opacity="0.16" />
      </svg>
      <div className="page-atmosphere__grain" />
      <div className="page-atmosphere__vignette" />
    </div>
  );
}

/** Fine champagne rule used to separate public editorial sections. */
export function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`section-divider ${className}`} aria-hidden="true">
      <span />
      <i />
      <span />
    </div>
  );
}

interface CinematicBandProps {
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  copy?: string;
  position?: string;
  children?: ReactNode;
}

/**
 * Full-bleed photographic band with a scroll-linked drift. Used sparingly
 * between sections so the page has breathing room and a change of scale.
 */
export function CinematicBand({
  image,
  alt,
  eyebrow,
  title,
  copy,
  position = "center",
  children,
}: CinematicBandProps) {
  return (
    <section className="cinematic-band relative flex min-h-[clamp(340px,44vw,560px)] items-end overflow-hidden">
      <div className="absolute inset-0">
        <GsapImage
          src={image}
          alt={alt}
          position={position}
          className="h-full w-full"
          imgClassName="scale-[1.02]"
        />
      </div>
      <div className="cinematic-band__scrim" aria-hidden="true" />
      <div className="cinematic-band__line" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-14 text-white md:px-10 md:py-20">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]" />
            {eyebrow}
          </div>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,4.6vw,4.4rem)] leading-[1.02] tracking-[-0.03em]">
            {title}
          </h2>
          {copy && (
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/68">
              {copy}
            </p>
          )}
          {children && <div className="mt-7">{children}</div>}
        </div>
      </div>
    </section>
  );
}
