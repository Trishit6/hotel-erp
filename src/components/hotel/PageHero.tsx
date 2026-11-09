import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGsap } from "../motion/gsap";
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

/**
 * Editorial page opener used by every guest page. GSAP owns the entrance and
 * the image drift; no other library touches these properties.
 */
export function PageHero({
  eyebrow,
  title,
  accent,
  intro,
  image,
  imageAlt,
  imagePosition = "center",
  children,
}: PageHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useGsap(
    () => {
      const frame = frameRef.current;
      const image = imageRef.current;
      if (!frame || !image) return;

      gsap.set(frame, { clipPath: "inset(0 0 100% 0)" });
      gsap.set(image, { scale: 1.14 });

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from(".pagehero-eyebrow", { opacity: 0, y: 12, duration: 0.5 })
        .from(
          ".pagehero-line",
          { yPercent: 112, opacity: 0, duration: 0.95, stagger: 0.08 },
          "-=0.24",
        )
        .from(".pagehero-intro", { opacity: 0, y: 14, duration: 0.6 }, "-=0.62")
        .from(".pagehero-cta", { opacity: 0, y: 12, duration: 0.55 }, "-=0.42")
        .to(frame, { clipPath: "inset(0 0 0% 0)", duration: 1.25 }, 0.15)
        .to(image, { scale: 1, duration: 1.6 }, 0.15);

      gsap.to(image, {
        yPercent: 7,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    [title, image],
    sectionRef,
  );

  return (
    <section ref={sectionRef} className="mx-auto max-w-[1440px] px-4 pt-4 md:px-7 md:pt-6">
      <div className="relative grid overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface-2)] lg:min-h-[580px] lg:grid-cols-[1.02fr_0.98fr]">
        <span className="corner-mark corner-mark--tl" aria-hidden="true" />
        <div className="relative z-10 flex flex-col justify-center px-7 pb-12 pt-14 sm:px-12 lg:px-14 lg:py-16 xl:px-20">
          <div className="pagehero-eyebrow">
            <SectionEyebrow>{eyebrow}</SectionEyebrow>
          </div>
          <h1 className="mt-7 max-w-[680px] font-display text-[clamp(3rem,5.8vw,5.4rem)] leading-[0.95] tracking-[-0.035em] text-[var(--ink)]">
            <span className="block overflow-hidden pb-1">
              <span className="pagehero-line block">{title}</span>
            </span>{" "}
            {accent && (
              <span className="block overflow-hidden pb-2">
                <em className="pagehero-line block text-[var(--sage)]">{accent}</em>
              </span>
            )}
          </h1>
          <p className="pagehero-intro mt-6 max-w-[500px] text-sm leading-7 text-[var(--muted)] md:text-[15px]">
            {intro}
          </p>
          {children && <div className="pagehero-cta mt-8">{children}</div>}
        </div>
        <div className="relative min-h-[340px] overflow-hidden bg-[var(--deep)] sm:min-h-[440px] lg:min-h-0">
          <div ref={frameRef} className="image-frame absolute inset-0" data-cursor="RIVR">
            <img
              ref={imageRef}
              src={image}
              alt={imageAlt}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="h-full w-full object-cover"
              style={{ objectPosition: imagePosition }}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--deep)]/70 via-[var(--deep)]/5 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--deep)]/25 to-transparent" />
          <div className="pointer-events-none absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur md:flex">
            <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
            Hotel &amp; Residences
          </div>
        </div>
      </div>
    </section>
  );
}
