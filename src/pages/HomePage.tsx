import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, type ComponentType } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, CarFront, Coffee, Dumbbell, HeartHandshake, MapPin, ParkingCircle, Phone, ShieldCheck, Sparkles, Star, Utensils, Waves, Wifi } from "lucide-react";
import { BookingSearch } from "../components/hotel/BookingSearch";
import { BookingPill, PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { Reveal } from "../components/hotel/Reveal";
import { RoomCard } from "../components/hotel/RoomCard";
import { FeatureLine, SectionEyebrow } from "../components/hotel/HotelUi";
import { dateAt, defaultStaySearch, formatCurrency, formatDate, hotelInfo, offers, reviews } from "../lib/hotel-data";
import { useHotel } from "../lib/hotel-store";

const featuredSearch = defaultStaySearch;

const amenities: { icon: ComponentType<{ className?: string }>; label: string; detail: string }[] = [
  { icon: Waves, label: "Pool", detail: "A quiet morning swim" },
  { icon: Utensils, label: "Restaurant", detail: "Seasonal, considered dining" },
  { icon: Sparkles, label: "Spa", detail: "Time to slow down" },
  { icon: Dumbbell, label: "Gym", detail: "Room to move" },
  { icon: Coffee, label: "Room service", detail: "Whenever you need it" },
  { icon: ParkingCircle, label: "Parking", detail: "Arrive without fuss" },
  { icon: Wifi, label: "Wi-Fi", detail: "Throughout the house" },
  { icon: CarFront, label: "Transfers", detail: "A calm arrival" },
];

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const heroRef = useRef<HTMLElement | null>(null);
  const { getAvailableRooms, roomTypes, rooms, status } = useHotel();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const featuredRooms = getAvailableRooms(featuredSearch.checkIn, featuredSearch.checkOut, 2).slice(0, 3);
  const availableTonight = getAvailableRooms(dateAt(0), dateAt(1), 2).length;
  const minRate = roomTypes.length ? Math.min(...roomTypes.map((type) => type.rate)) : 0;

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;
    const timer = window.setTimeout(() => {
      const section = document.getElementById(id);
      if (section) window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 92, behavior: reduceMotion ? "auto" : "smooth" });
    }, 90);
    return () => window.clearTimeout(timer);
  }, [location.hash, reduceMotion]);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <PublicHeader />
      <main>
        <section ref={heroRef} className="mx-auto max-w-[1440px] px-4 pt-4 md:px-7 md:pt-6">
          <div className="relative grid overflow-hidden rounded-[1.9rem] bg-[var(--surface-2)] lg:min-h-[660px] lg:grid-cols-[1.02fr_0.98fr]">
            <div className="relative z-10 flex flex-col justify-center px-7 pb-10 pt-12 sm:px-12 lg:px-14 lg:pb-32 lg:pt-20 xl:px-20">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="flex flex-wrap items-center gap-3"
              >
                <BookingPill>{hotelInfo.city} · {hotelInfo.state}</BookingPill>
                <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--faint)] sm:inline">Boutique hotel &amp; residences</span>
              </motion.div>

              <motion.h1
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 max-w-[660px] font-display text-[clamp(3.1rem,6vw,5.6rem)] leading-[0.95] tracking-[-0.035em] text-[var(--ink)]"
              >
                A quieter kind of luxury,
                <br />
                <em className="text-[var(--sage)]">by the water.</em>
              </motion.h1>

              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
                className="mt-6 max-w-[500px] text-sm leading-7 text-[var(--muted)] md:text-[15px]"
              >
                Considered rooms, generous service, and a little more room to breathe. Stay with us on the edge of the city and close to the water.
              </motion.p>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.26 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link
                  to="/rooms"
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]"
                >
                  Explore rooms <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]">
                  Discover RIVR <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={reduceMotion ? undefined : { opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.38 }}
                className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-[var(--muted)]"
              >
                <span className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-[var(--accent-strong)]" /> Thoughtful hospitality
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--accent-strong)]" /> Secure direct reservations
                </span>
              </motion.div>
            </div>

            <div className="relative min-h-[380px] overflow-hidden bg-[var(--deep)] lg:min-h-0">
              <motion.div style={reduceMotion ? undefined : { y: imageY }} className="absolute inset-x-0 -top-[6%] h-[112%]">
                <motion.img
                  initial={reduceMotion ? false : { scale: 1.08 }}
                  animate={reduceMotion ? undefined : { scale: [1.08, 1.16, 1.08] }}
                  transition={reduceMotion ? undefined : { duration: 30, repeat: Infinity, ease: "easeInOut" }}
                  src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=90"
                  alt="A warmly lit guest room at RIVR with a view toward the harbor"
                  className="h-full w-full object-cover object-center"
                />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep)]/75 via-[var(--deep)]/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--deep)]/20 via-transparent to-transparent" />

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="glass absolute left-5 top-5 max-w-[220px] rounded-2xl p-4 text-[var(--on-glass)] sm:left-7 sm:top-7"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sage)]">Tonight at RIVR</p>
                <p className="mt-1 font-display text-xl leading-snug">
                  {status === "loading" ? "Loading availability" : availableTonight > 0 ? `${availableTonight} rooms available` : "Live availability"}
                </p>
                <p className="mt-1 text-[11px] leading-4 opacity-70">Rates from {minRate ? formatCurrency(minRate) : "the hotel"} per night.</p>
              </motion.div>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.62 }}
                className="glass-strong absolute bottom-20 left-5 right-5 hidden rounded-2xl p-4 text-[var(--on-glass)] sm:bottom-24 sm:left-7 sm:right-auto sm:max-w-[290px] lg:block"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--sage)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> A room to return to
                </div>
                <p className="mt-2 font-display text-2xl leading-tight">Quietly considered. Warmly kept.</p>
                <p className="mt-2 text-[11px] leading-5 opacity-70">A stay shaped around how you like to arrive, rest, and linger.</p>
                <a href={`tel:${hotelInfo.phoneHref}`} className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold">
                  <Phone className="h-3.5 w-3.5 text-[var(--accent-strong)]" /> {hotelInfo.phone}
                </a>
              </motion.div>
            </div>
          </div>

          <div className="relative z-20 mx-auto -mt-11 max-w-[1180px] px-2 md:-mt-12">
            <BookingSearch initialCheckIn={featuredSearch.checkIn} initialCheckOut={featuredSearch.checkOut} initialAdults={featuredSearch.adults} initialChildren={featuredSearch.children} initialRooms={featuredSearch.rooms} />
            <p className="mt-2 px-3 text-center text-[11px] text-[var(--faint)] md:text-left">Rates are per room, per night. Each reservation secures one room.</p>
          </div>
        </section>

        <section id="about" className="section-anchor mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <Reveal>
            <SectionEyebrow>Welcome to RIVR</SectionEyebrow>
            <h2 className="mt-5 max-w-xl font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">A place to slow down and feel at home.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[var(--muted)]">
              On the edge of the city and close to the water, RIVR makes room for the kind of stay that stays with you. Come for the room. Return for the feeling.
            </p>
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
            <Link to="/rooms" className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              Find your room
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] transition-transform group-hover:translate-x-1">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>

          <Reveal delay={0.08} className="relative h-[360px] overflow-hidden rounded-[1.6rem] sm:h-[470px] lg:h-[560px]">
            <img
              src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=90"
              alt="RIVR hotel exterior with a pool overlooking the water"
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep)]/40 via-transparent to-transparent" />
            <div className="glass absolute bottom-5 right-5 rounded-xl px-4 py-3 text-right text-[var(--on-glass)]">
              <p className="font-display text-2xl">By the water</p>
              <p className="text-[10px] uppercase tracking-[0.15em] opacity-70">{hotelInfo.city}</p>
            </div>
          </Reveal>
        </section>

        <section id="stay" className="section-anchor bg-[var(--surface)] px-5 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <SectionEyebrow>Featured rooms</SectionEyebrow>
                <h2 className="mt-5 font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Stay in your element.</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">A handful of rooms available for {formatDate(featuredSearch.checkIn)} — {formatDate(featuredSearch.checkOut)}. Every room is a little different.</p>
              </div>
              <Link to="/rooms" className="group flex w-fit items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                View all rooms
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-3)] transition-transform group-hover:translate-x-1">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            </Reveal>

            {featuredRooms.length > 0 ? (
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredRooms.map((room, index) => (
                  <Reveal key={room.id} delay={index * 0.06}>
                    <RoomCard room={room} search={featuredSearch} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] p-10 text-center">
                <h3 className="text-lg font-semibold text-[var(--ink)]">No rooms fit those dates.</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">Try another date range and we will show what is available.</p>
                <Link to="/booking" search={featuredSearch} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sage)]">
                  Search availability <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <Reveal>
              <SectionEyebrow>The experience</SectionEyebrow>
              <h2 className="mt-5 max-w-md font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">The city outside. A world within.</h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[var(--muted)]">
                Every part of RIVR is an invitation to settle in. A late breakfast, a quiet swim, a room-service dinner that turns into an early night.
              </p>
              <ul className="mt-7 grid gap-2.5">
                <FeatureLine>Breakfast served until late morning</FeatureLine>
                <FeatureLine>Pool, spa, and gym for guests</FeatureLine>
                <FeatureLine>Room service when you need it</FeatureLine>
              </ul>
            </Reveal>

            <Reveal delay={0.08} className="grid gap-4 sm:grid-cols-[1.25fr_0.75fr] sm:items-end">
              <div className="relative h-[350px] overflow-hidden rounded-[1.5rem] sm:h-[430px]">
                <img src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85" alt="The RIVR dining room set for service" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                <div className="absolute bottom-4 left-4 rounded-lg bg-[var(--deep)]/85 px-3 py-2 text-xs text-white">Dining worth lingering over</div>
              </div>
              <div className="grid gap-4">
                <div className="relative h-44 overflow-hidden rounded-[1.5rem]">
                  <img src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=85" alt="A quiet spa treatment room at RIVR" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                </div>
                <div className="flex items-center gap-3 rounded-[1.5rem] bg-[var(--surface-3)] p-4">
                  <Sparkles className="h-5 w-5 text-[var(--accent-strong)]" />
                  <span className="text-sm font-semibold text-[var(--ink)]">Personal, not prescribed.</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="amenities" className="section-anchor border-y border-[var(--line)] bg-[var(--surface-2)] px-5 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal className="text-center">
              <SectionEyebrow>Designed around you</SectionEyebrow>
              <h2 className="mx-auto mt-5 max-w-xl font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">A little more of what makes a stay.</h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">The essentials, looked after with care — so the day can unfold at its own pace.</p>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
              {amenities.map(({ icon: Icon, label, detail }, index) => (
                <Reveal key={label} delay={index * 0.03}>
                  <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-center transition-colors hover:border-[var(--accent)]">
                    <Icon className="h-5 w-5 text-[var(--sage)]" />
                    <span className="text-xs font-semibold text-[var(--text)]">{label}</span>
                    <span className="text-[10px] leading-4 text-[var(--faint)]">{detail}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--deep)] px-5 py-20 text-white md:px-10 md:py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal className="max-w-xl">
              <SectionEyebrow>Why choose RIVR</SectionEyebrow>
              <h2 className="mt-5 font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em]">Good hospitality is in the details.</h2>
            </Reveal>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Why icon={HeartHandshake} title="Thoughtful hospitality" text="A human touch, from first hello to last coffee." />
              <Why icon={Sparkles} title="Beautifully designed spaces" text="Rooms with warmth, light, and room to breathe." />
              <Why icon={ShieldCheck} title="Effortless reservations" text="Clear rates and simple direct booking, always." />
              <Why icon={Star} title="Personal guest experience" text="Tell us what makes your stay feel like yours." />
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface-3)] px-5 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal className="flex items-end justify-between">
              <div>
                <SectionEyebrow>Special offers</SectionEyebrow>
                <h2 className="mt-5 font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Stay for the good part.</h2>
              </div>
              <ArrowUpRight className="hidden h-8 w-8 text-[var(--sage)] md:block" />
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {offers.map((offer, index) => (
                <Reveal key={offer.id} delay={index * 0.06}>
                  <article className="group relative min-h-[330px] overflow-hidden rounded-[1.5rem]">
                    <img src={offer.image} alt={offer.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep)]/85 via-[var(--deep)]/10 to-transparent" />
                    <div className="relative flex h-full flex-col justify-end p-6 text-white md:p-8">
                      <span className="w-fit rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">{offer.discount}</span>
                      <h3 className="mt-4 font-display text-3xl">{offer.title}</h3>
                      <p className="mt-2 max-w-sm text-sm text-white/70">{offer.description}</p>
                      <Link to="/booking" search={featuredSearch} className="mt-5 flex w-fit items-center gap-2 text-xs font-semibold text-white transition-colors hover:text-white/80">
                        Check dates <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <Reveal className="max-w-xl">
            <SectionEyebrow>Guest notes</SectionEyebrow>
            <h2 className="mt-5 font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Leave feeling looked after.</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">A few words from guests who have stayed with us.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {reviews.map((review, index) => (
              <Reveal key={review.id} delay={index * 0.05}>
                <figure className="flex h-full flex-col rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_8px_28px_rgba(31,43,60,0.04)]">
                  <div className="flex text-[var(--accent)]" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: review.rating }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-6 flex-1 font-display text-xl leading-7 text-[var(--text)]">“{review.comment}”</blockquote>
                  <figcaption className="mt-7 flex items-end justify-between gap-3 text-xs">
                    <span className="font-semibold text-[var(--ink)]">{review.guest}</span>
                    <span className="text-[var(--faint)]">{review.date}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="contact" className="section-anchor border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-16 md:px-10 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <Reveal>
              <SectionEyebrow>Find us by the water</SectionEyebrow>
              <h2 className="mt-5 font-display text-[clamp(2.4rem,4vw,3.6rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">We are here when you need us.</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">Questions about a stay, an arrival, or something a little more particular? Speak with the team directly.</p>
            </Reveal>
            <Reveal delay={0.06} className="grid gap-3 sm:grid-cols-2">
              <a href={`tel:${hotelInfo.phoneHref}`} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
                <Phone className="h-4 w-4 text-[var(--sage)]" />
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">Front desk</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{hotelInfo.phone}</p>
              </a>
              <a href={`mailto:${hotelInfo.email}`} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
                <MailIcon />
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">Email</p>
                <p className="mt-1 break-all text-sm font-semibold text-[var(--ink)]">{hotelInfo.email}</p>
              </a>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sage)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">Address</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{hotelInfo.address}</p>
                  </div>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(hotelInfo.mapQuery)}`} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3 py-2 text-[11px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]">
                    Open in maps <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function Why({ icon: Icon, title, text }: { icon: ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10">
      <Icon className="h-5 w-5 text-[var(--accent)]" />
      <h3 className="mt-7 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-white/55">{text}</p>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[var(--sage)]" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
