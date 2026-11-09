import { ArrowUpRight, HeartHandshake, Leaf, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageAtmosphere, SectionDivider } from "../components/hotel/Cinematic";
import { PageHero } from "../components/hotel/PageHero";
import { GsapImage } from "../components/motion/GsapImage";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { Reveal } from "../components/hotel/Reveal";
import { FeatureLine, SectionEyebrow } from "../components/hotel/HotelUi";
import { defaultStaySearch, hotelInfo } from "../lib/hotel-data";
import { useHotel } from "../lib/hotel-store";

const values = [
  { icon: HeartHandshake, title: "Hospitality, not theatre", copy: "A human welcome, a remembered preference, and the confidence to leave you to your stay." },
  { icon: Sparkles, title: "Considered, not crowded", copy: "Rooms with space to breathe, light where it matters, and details that earn their place." },
  { icon: Leaf, title: "A lighter footprint", copy: "Small operational choices that respect the city, the water, and the people who live here." },
  { icon: ShieldCheck, title: "Clear from the start", copy: "Direct rates, honest availability, and a booking experience without surprises." },
];

export default function AboutPage() {
  const { roomTypes, rooms } = useHotel();
  return (
    <div className="relative min-h-screen text-[var(--text)]">
      <PageAtmosphere />
      <PublicHeader />
      <main>
        <PageHero
          eyebrow="About RIVR"
          reverse
          title="A house built around"
          accent="the way you like to stay."
          intro="RIVR is a boutique hotel and residences in India, made for travellers who want a quieter kind of luxury — close to the city, close to the water, and easy to return to."
          image="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=90"
          imageAlt="The RIVR hotel exterior and pool"
        >
          <Link to="/stay" className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
            Discover the stay <ArrowUpRight className="h-4 w-4" />
          </Link>
        </PageHero>

        <section className="section-atmosphere mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <SectionEyebrow>Our story</SectionEyebrow>
            <h2 className="mt-5 max-w-xl font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">A place to slow down and feel at home.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[var(--muted)]">RIVR began with a simple idea: a hotel should feel like a house you are lucky enough to borrow. Not a stage, not a lobby, not a checklist. A place where the day can take its own shape.</p>
            <p className="mt-4 max-w-md text-sm leading-7 text-[var(--muted)]">The result is a small collection of rooms and suites, a dining room worth lingering in, and a team that pays attention without making a performance of it.</p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-4 border-y border-[var(--line)] py-5">
              <div>
                <p className="font-display text-3xl text-[var(--ink)]">{roomTypes.length}</p>
                <p className="mt-1 text-[11px] text-[var(--faint)]">room styles</p>
              </div>
              <div>
                <p className="font-display text-3xl text-[var(--ink)]">{rooms.length}</p>
                <p className="mt-1 text-[11px] text-[var(--faint)]">rooms &amp; suites</p>
              </div>
              <div>
                <p className="font-display text-3xl text-[var(--ink)]">{hotelInfo.city}</p>
                <p className="mt-1 text-[11px] text-[var(--faint)]">{hotelInfo.state}</p>
              </div>
            </div>
            <Link to="/booking" search={defaultStaySearch} className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              Find your room
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] transition-transform group-hover:translate-x-1">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>

          <Reveal delay={0.08} className="grid gap-4 sm:grid-cols-2">
            <div className="group relative h-[340px] overflow-hidden rounded-[1.5rem] sm:h-[460px]">
              <GsapImage
                src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1100&q=88"
                alt="A guest room at RIVR with warm lighting"
                className="h-full w-full rounded-[1.5rem] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--deep)]/55 via-transparent to-transparent" />
              </GsapImage>
            </div>
            <div className="group relative h-[340px] overflow-hidden rounded-[1.5rem] sm:mt-14 sm:h-[460px]">
              <GsapImage
                src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1100&q=88"
                alt="The RIVR dining room"
                className="h-full w-full rounded-[1.5rem] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--deep)]/55 via-transparent to-transparent" />
              </GsapImage>
            </div>
          </Reveal>
        </section>

        <SectionDivider className="py-6" />

        <section className="section-atmosphere border-y border-[var(--line)] bg-[var(--surface)] px-5 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal className="max-w-2xl">
              <SectionEyebrow>What we believe</SectionEyebrow>
              <h2 className="mt-5 font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Good hospitality is in the details.</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Not the loud ones. The ones you notice when you slow down.</p>
            </Reveal>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(({ icon: Icon, title, copy }, index) => (
                <Reveal key={title} delay={Math.min(index * 0.04, 0.2)}>
                  <div className="flex h-full flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5">
                    <Icon className="h-5 w-5 text-[var(--sage)]" />
                    <h3 className="mt-6 text-base font-semibold text-[var(--ink)]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="section-atmosphere mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <Reveal>
            <SectionEyebrow>Find us</SectionEyebrow>
            <h2 className="mt-5 max-w-xl font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">In the city. By the water.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[var(--muted)]">A quieter corner of {hotelInfo.city}, with the city within reach and the water close enough to change the mood of a morning.</p>
            <ul className="mt-7 grid gap-2.5">
              <FeatureLine>{hotelInfo.city}, {hotelInfo.state}</FeatureLine>
              <FeatureLine>Direct reservations and concierge support</FeatureLine>
              <FeatureLine>Rates shown in Indian rupees</FeatureLine>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={`https://maps.google.com/?q=${encodeURIComponent(hotelInfo.mapQuery)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]">
                <MapPin className="h-4 w-4 text-[var(--sage)]" /> Open in maps <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
                Contact the hotel <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            {hotelInfo.isPlaceholder && <p className="mt-4 max-w-md text-[11px] leading-5 text-[var(--faint)]">{hotelInfo.notice}</p>}
          </Reveal>
          <Reveal delay={0.08} className="group relative h-[360px] overflow-hidden rounded-[1.5rem] sm:h-[480px]">
            <GsapImage
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=88"
              alt="A calm poolside view at RIVR"
              className="h-full w-full rounded-[1.5rem] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--deep)]/65 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 rounded-xl border border-white/15 bg-[var(--glass-strong)] px-4 py-3 text-[var(--on-glass)] backdrop-blur">
                <p className="font-display text-2xl">{hotelInfo.city}</p>
                <p className="text-[10px] uppercase tracking-[0.15em] opacity-70">{hotelInfo.state}, India</p>
              </div>
            </GsapImage>
          </Reveal>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
