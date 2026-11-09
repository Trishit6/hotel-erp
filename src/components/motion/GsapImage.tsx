import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGsap } from "./gsap";

interface GsapImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  position?: string;
  priority?: boolean;
  parallax?: boolean;
  reveal?: boolean;
  children?: ReactNode;
}

/**
 * Cinematic image treatment: a clip-path reveal on entry and a slow
 * scroll-linked drift. Both are transform/clip-path only, and GSAP reverts
 * them on unmount or when reduced motion is requested.
 */
export function GsapImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  position = "center",
  priority = false,
  parallax = true,
  reveal = true,
  children,
}: GsapImageProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useGsap(
    () => {
      const frame = frameRef.current;
      const image = imageRef.current;
      if (!frame || !image) return;

      if (reveal) {
        gsap.set(frame, { clipPath: "inset(0 0 100% 0)" });
        gsap.to(frame, {
          clipPath: "inset(0 0 0% 0)",
          duration: 1.25,
          ease: "power3.inOut",
          scrollTrigger: { trigger: frame, start: "top 88%", once: true },
        });
      }

      if (parallax) {
        gsap.fromTo(
          image,
          { yPercent: -4, scale: 1.1 },
          {
            yPercent: 4,
            scale: 1.1,
            ease: "none",
            scrollTrigger: {
              trigger: frame,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      }
    },
    [src, parallax, reveal],
    frameRef,
  );

  return (
    <div ref={frameRef} className={`relative overflow-hidden ${className}`}>
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        style={{ objectPosition: position }}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
      {children}
    </div>
  );
}
