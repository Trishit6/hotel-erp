import { ArrowRight, ArrowUpRight, BedDouble, Coffee, Sparkles, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BookingSearch } from "../components/hotel/BookingSearch";
import { PageAtmosphere, SectionDivider } from "../components/hotel/Cinematic";
import { PageHero } from "../components/hotel/PageHero";
import { GsapImage } from "../components/motion/GsapImage";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { Reveal } from "../components/hotel/Reveal";
import { RoomTypeCard } from "../components/hotel/RoomTypeCard";
import { FeatureLine, SectionEyebrow } from "../components/hotel/HotelUi";
import { defaultStaySearch, formatCurrency } from "../lib/hotel-data";
import { useHotel } from "../lib/hotel-store";

const stayFeatures = [
  { icon: BedDouble, title: "Rooms with room to breathe", copy: "Considered layouts, generous light, and the quiet details that make a stay feel settled." },
  { icon: Coffee, title: "Breakfast, unhurried", copy: "Start slowly with a breakfast served until late morning, in the dining room or in your room." },
  { icon: Sparkles, title: "Care that feels personal", copy: "Tell us how you like to arrive, rest, and linger. We will take it from there." },
  { icon: Users, title: "Made for company", copy: "Suites for families, quiet corners for solo stays, and space for the people you travel with." },
];

export default function StayPage() {
  const { roomTypes } = useHotel();
  const minRate = roomTypes.length ? Math.min(...roomTypes.map((type) => type.rate)) : 0;
  return (
    <div className="relative min-h-screen text-[var(--text)]">
      <PageAtmosphere />
      <PublicHeader />
      <main>
        <PageHero
          eyebrow="Stay with us"
          title="A slower stay,"
          accent="with more room to breathe."
          intro="Thoughtful rooms and suites for the way you actually like to travel — close to the city, close to the water, and far enough from the noise."
          image="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=90"
          imageAlt="A warmly lit guest room at RIVR"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/booking" search={defaultStaySearch} className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
              Check availability <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/rooms" className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]">
              Explore rooms <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </PageHero>

        <section className="relative z-20 mx-auto -mt-8 max-w-[1180px] px-2 md:-mt-10">
          <BookingSearch initialCheckIn={defaultStaySearch.checkIn} initialCheckOut={defaultStaySearch.checkOut} initialAdults={defaultStaySearch.adults} initialChildren={defaultStaySearch.children} initialRooms={defaultStaySearch.rooms} />
          <p className="mt-2 px-3 text-center text-[11px] text-[var(--faint)] md:text-left">Rates are per room, per night. Each reservation secures one room.</p>
        </section>

        <section className="section-atmosphere mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <Reveal className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <SectionEyebrow>Ways to stay</SectionEyebrow>
              <h2 className="mt-5 max-w-xl font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">A room for the way you travel.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">From a quiet studio to a penthouse with the city at your feet. Every room is a little different, and every rate is shown in INR.</p>
            </div>
            <Link to="/rooms" className="group flex w-fit items-center gap-3 text-sm font-semibold text-[var(--ink)]">
              View all rooms
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-3)] transition-transform group-hover:translate-x-1">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {roomTypes.map((type, index) => (
              <Reveal key={type.id} delay={Math.min(index * 0.05, 0.2)}>
                <RoomTypeCard type={type} search={defaultStaySearch} />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section-atmosphere border-y border-[var(--line)] bg-[var(--surface)] px-5 py-20 md:px-10 md:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <SectionEyebrow>The RIVR stay</SectionEyebrow>
              <h2 className="mt-5 max-w-md font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">The details are the stay.</h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[var(--muted)]">A stay here is made of small things: a breakfast that runs late, a room that feels lived-in rather than staged, and a team that remembers how you take your coffee.</p>
              <ul className="mt-7 grid gap-2.5">
                <FeatureLine>Rates from {formatCurrency(minRate)} per night</FeatureLine>
                <FeatureLine>Direct reservations with no online payment; settle at the hotel</FeatureLine>
                <FeatureLine>Concierge help before and during your stay</FeatureLine>
              </ul>
            </Reveal>
            <Reveal delay={0.08} className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr] sm:items-end">
              <div className="group relative h-[360px] overflow-hidden rounded-[1.5rem] sm:h-[470px]">
                <GsapImage
                  src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=88"
                  alt="The RIVR dining room set for service"
                  className="h-full w-full rounded-[1.5rem] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--deep)]/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-[var(--deep)]/75 px-3 py-2 text-xs text-white backdrop-blur">
                    Dining worth lingering over
                  </div>
                </GsapImage>
              </div>
              <div className="grid gap-4">
                <div className="group relative h-44 overflow-hidden rounded-[1.5rem]">
                  <GsapImage
                    src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=88"
                    alt="A quiet spa treatment room at RIVR"
                    className="h-full w-full rounded-[1.5rem] transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-3)] p-4">
                  <Sparkles className="h-5 w-5 text-[var(--accent-strong)]" />
                  <span className="text-sm font-semibold text-[var(--ink)]">Personal, not prescribed.</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <SectionDivider className="py-6" />

        <section className="section-atmosphere mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stayFeatures.map(({ icon: Icon, title, copy }, index) => (
              <Reveal key={title} delay={index * 0.05}>
                <div className="flex h-full flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                  <Icon className="h-5 w-5 text-[var(--sage)]" />
                  <h3 className="mt-6 text-base font-semibold text-[var(--ink)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="bg-[var(--deep)] px-5 py-16 text-white md:px-10 md:py-20">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sage-on-dark)]">Ready when you are</p>
              <h2 className="mt-3 font-display text-[clamp(2.4rem,4vw,3.8rem)] leading-[1.02] tracking-[-0.03em]">Find your room at RIVR.</h2>
            </div>
            <Link to="/booking" search={defaultStaySearch} className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3.5 text-xs font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90">
              Book your stay <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
