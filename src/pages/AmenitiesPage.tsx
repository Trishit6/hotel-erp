import type { ComponentType } from "react";
import { ArrowUpRight, CarFront, Coffee, Dumbbell, HeartHandshake, ParkingCircle, Sparkles, Utensils, Waves, Wifi } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageAtmosphere, SectionDivider } from "../components/hotel/Cinematic";
import { PageHero } from "../components/hotel/PageHero";
import { GsapImage } from "../components/motion/GsapImage";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { Reveal } from "../components/hotel/Reveal";
import { FeatureLine, SectionEyebrow } from "../components/hotel/HotelUi";
import { defaultStaySearch } from "../lib/hotel-data";

const amenities: { icon: ComponentType<{ className?: string }>; label: string; detail: string; copy: string }[] = [
  { icon: Waves, label: "Pool", detail: "A quiet morning swim", copy: "A calm place to start the day or let the afternoon slow down." },
  { icon: Utensils, label: "Restaurant", detail: "Seasonal, considered dining", copy: "A dining room built around long breakfasts and easy evenings." },
  { icon: Sparkles, label: "Spa", detail: "Time to slow down", copy: "Treatments shaped around rest, not a schedule." },
  { icon: Dumbbell, label: "Gym", detail: "Room to move", copy: "The equipment you need, without the crowd." },
  { icon: Coffee, label: "Room service", detail: "Whenever you need it", copy: "A late coffee, an early dinner, or something in between." },
  { icon: ParkingCircle, label: "Parking", detail: "Arrive without fuss", copy: "On-site parking for guests arriving by car." },
  { icon: Wifi, label: "Wi-Fi", detail: "Throughout the house", copy: "Fast, reliable connectivity across the property." },
  { icon: CarFront, label: "Transfers", detail: "A calm arrival", copy: "Ask the concierge to help arrange your airport transfer." },
];

export default function AmenitiesPage() {
  return (
    <div className="relative min-h-screen text-[var(--text)]">
      <PageAtmosphere />
      <PublicHeader />
      <main>
        <PageHero
          eyebrow="Amenities"
          title="Everything you need,"
          accent="nothing you don't."
          intro="The essentials, looked after with care. A pool for slow mornings, a table for long breakfasts, and a team that knows when to be close by."
          image="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=90"
          imageAlt="A quiet spa treatment room at RIVR"
        >
          <Link to="/booking" search={defaultStaySearch} className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
            Plan your stay <ArrowUpRight className="h-4 w-4" />
          </Link>
        </PageHero>

        <section className="section-atmosphere mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <Reveal className="max-w-2xl">
            <SectionEyebrow>Around the house</SectionEyebrow>
            <h2 className="mt-5 font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">A little more of what makes a stay.</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">The details are deliberately simple. Use what you need, skip what you don't, and let the day unfold at its own pace.</p>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {amenities.map(({ icon: Icon, label, detail, copy }, index) => (
              <Reveal key={label} delay={Math.min(index * 0.03, 0.2)}>
                <div className="flex h-full flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
                  <Icon className="h-5 w-5 text-[var(--sage)]" />
                  <h3 className="mt-6 text-sm font-semibold text-[var(--ink)]">{label}</h3>
                  <p className="mt-1 text-[11px] font-medium text-[var(--sage)]">{detail}</p>
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section-atmosphere border-y border-[var(--line)] bg-[var(--surface)] px-5 py-20 md:px-10 md:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <Reveal className="grid gap-4 sm:grid-cols-2">
              <div className="group relative h-[320px] overflow-hidden rounded-[1.5rem] sm:h-[420px]">
                <GsapImage
                  src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1100&q=88"
                  alt="The RIVR dining room"
                  className="h-full w-full rounded-[1.5rem] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--deep)]/55 via-transparent to-transparent" />
                </GsapImage>
              </div>
              <div className="group relative h-[320px] overflow-hidden rounded-[1.5rem] sm:mt-12 sm:h-[420px]">
                <GsapImage
                  src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1100&q=88"
                  alt="The pool and terrace at RIVR"
                  className="h-full w-full rounded-[1.5rem] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--deep)]/55 via-transparent to-transparent" />
                </GsapImage>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <SectionEyebrow>Dining &amp; wellness</SectionEyebrow>
              <h2 className="mt-5 max-w-md font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Make a day of doing very little.</h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[var(--muted)]">Breakfast that runs late, a swim before the city wakes up, and a treatment that ends with nowhere else to be. The best days here are the ones without a plan.</p>
              <ul className="mt-7 grid gap-2.5">
                <FeatureLine>Breakfast served until late morning</FeatureLine>
                <FeatureLine>Pool, spa, and gym for guests</FeatureLine>
                <FeatureLine>Room service when you need it</FeatureLine>
                <FeatureLine>Concierge help with transfers and plans</FeatureLine>
              </ul>
              <Link to="/contact" className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]">
                Ask the concierge <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>

        <SectionDivider className="py-6" />

        <section className="section-atmosphere mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-24">
          <Reveal className="text-center">
            <SectionEyebrow>Good to know</SectionEyebrow>
            <h2 className="mx-auto mt-5 max-w-xl font-display text-[clamp(2.4rem,4vw,3.6rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Small things, taken care of.</h2>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <HeartHandshake className="h-5 w-5 text-[var(--sage)]" />
                <h3 className="mt-5 text-sm font-semibold text-[var(--ink)]">Direct reservations</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Book directly with the hotel and keep the conversation simple.</p>
              </div>
            </Reveal>
            <Reveal delay={0.04}>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <Sparkles className="h-5 w-5 text-[var(--sage)]" />
                <h3 className="mt-5 text-sm font-semibold text-[var(--ink)]">Indian rupees</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Every rate, total, and invoice is displayed in INR.</p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <Wifi className="h-5 w-5 text-[var(--sage)]" />
                <h3 className="mt-5 text-sm font-semibold text-[var(--ink)]">Stay connected</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Wi-Fi is available throughout the property.</p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <CarFront className="h-5 w-5 text-[var(--sage)]" />
                <h3 className="mt-5 text-sm font-semibold text-[var(--ink)]">Arrival help</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Ask us to help arrange a transfer before you arrive.</p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
