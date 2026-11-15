import { ArrowRight, Compass, Home, Search } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { PageAtmosphere } from "../components/hotel/Cinematic";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { SectionEyebrow } from "../components/hotel/HotelUi";
import { defaultStaySearch } from "../lib/hotel-data";

const helpfulLinks = [
  { to: "/stay", label: "Stay With Us", copy: "Rooms, suites and the RIVR stay" },
  { to: "/rooms", label: "Explore Rooms", copy: "Browse every room style and rate" },
  { to: "/my-bookings", label: "My Bookings", copy: "Find a reservation securely" },
  { to: "/contact", label: "Contact", copy: "Speak with the front desk" },
] as const;

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const attempted = pathname.length > 80 ? `${pathname.slice(0, 80)}…` : pathname;

  return (
    <div className="relative min-h-screen text-[var(--text)]">
      <PageAtmosphere />
      <PublicHeader />
      <main id="main" className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-5 py-14 md:px-10 md:py-20">
        <div className="grid gap-10 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)] md:grid-cols-[1.15fr_0.85fr] md:items-center md:p-12">
          <div>
            <SectionEyebrow>404 · Off the map</SectionEyebrow>
            <h1 className="mt-5 max-w-xl font-display text-[clamp(2.8rem,6vw,5rem)] leading-[0.98] tracking-[-0.035em] text-[var(--ink)]">
              This page has checked out.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--muted)]">
              We couldn’t find <span className="break-all font-medium text-[var(--text)]">{attempted || "that address"}</span>.
              The link may be out of date, or the page may have moved. Everything
              else at RIVR is still here.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/"
                className="btn-sheen inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                <Home className="h-4 w-4" /> Return home
              </Link>
              <Link
                to="/booking"
                search={defaultStaySearch}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]"
              >
                <Search className="h-4 w-4" /> Check availability
              </Link>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-2)] p-5 md:p-6">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
              <Compass className="h-3.5 w-3.5 text-[var(--accent-strong)]" /> A few ways back
            </div>
            <nav aria-label="Helpful pages" className="mt-4 grid gap-1">
              {helpfulLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--surface-3)]"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[var(--ink)]">{link.label}</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{link.copy}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-strong)]" />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
