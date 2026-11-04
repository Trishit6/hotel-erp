import { useState } from "react";
import { ArrowUpRight, BedDouble, SlidersHorizontal } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BookingSearch } from "../components/hotel/BookingSearch";
import { PageHero } from "../components/hotel/PageHero";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { Reveal } from "../components/hotel/Reveal";
import { RoomTypeCard } from "../components/hotel/RoomTypeCard";
import { SectionEyebrow } from "../components/hotel/HotelUi";
import { defaultStaySearch } from "../lib/hotel-data";
import { useHotel } from "../lib/hotel-store";

type RoomFilter = "all" | "two" | "family";

const filters: { id: RoomFilter; label: string }[] = [
  { id: "all", label: "All rooms" },
  { id: "two", label: "Sleeps 2" },
  { id: "family", label: "Sleeps 3+" },
];

export default function RoomsPage() {
  const { roomTypes } = useHotel();
  const [filter, setFilter] = useState<RoomFilter>("all");
  const filtered = roomTypes.filter((type) => (filter === "all" ? true : filter === "two" ? type.capacity <= 2 : type.capacity >= 3));

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <PublicHeader />
      <main>
        <PageHero
          eyebrow="Rooms & suites"
          title="Find your room,"
          accent="then make it yours."
          intro="Five room styles, one considered approach. Browse the collection in INR, then check live availability for your dates."
          image="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=90"
          imageAlt="A considered guest room at RIVR"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/booking" search={defaultStaySearch} className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
              Check live availability <ArrowUpRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
              <BedDouble className="h-4 w-4 text-[var(--sage)]" /> {roomTypes.length} room styles
            </span>
          </div>
        </PageHero>

        <section className="relative z-20 mx-auto -mt-8 max-w-[1180px] px-2 md:-mt-10">
          <BookingSearch compact initialCheckIn={defaultStaySearch.checkIn} initialCheckOut={defaultStaySearch.checkOut} initialAdults={defaultStaySearch.adults} initialChildren={defaultStaySearch.children} initialRooms={defaultStaySearch.rooms} />
          <p className="mt-2 px-3 text-center text-[11px] text-[var(--faint)] md:text-left">Search dates above to see which specific rooms are available.</p>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-24">
          <Reveal className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <SectionEyebrow>The collection</SectionEyebrow>
              <h2 className="mt-5 font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Rooms with a point of view.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">Every rate is per room, per night, and shown in Indian rupees. Taxes are calculated at checkout.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[var(--sage)]" />
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-colors ${filter === item.id ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]" : "border-[var(--line-2)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </Reveal>

          <p className="mt-8 text-xs text-[var(--faint)]" aria-live="polite">{filtered.length} {filtered.length === 1 ? "room style" : "room styles"}</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((type, index) => (
              <Reveal key={type.id} delay={Math.min(index * 0.05, 0.2)}>
                <RoomTypeCard type={type} search={defaultStaySearch} />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-16 md:px-10 md:py-20">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <SectionEyebrow>Live inventory</SectionEyebrow>
              <h2 className="mt-4 max-w-xl font-display text-[clamp(2.2rem,3.6vw,3.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">The collection is a starting point. Availability is live.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Choose your dates and party size to see the specific rooms that can welcome you.</p>
            </div>
            <Link to="/booking" search={defaultStaySearch} className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
              Check availability <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
