import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Mail, MapPin, Phone, Send } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHero } from "../components/hotel/PageHero";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { Reveal } from "../components/hotel/Reveal";
import { SectionEyebrow } from "../components/hotel/HotelUi";
import { defaultStaySearch, hotelInfo, isIndianPhone } from "../lib/hotel-data";

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const initialForm: ContactForm = { name: "", email: "", phone: "", subject: "Stay enquiry", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [sent, setSent] = useState(false);

  const update = (key: keyof ContactForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSent(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ContactForm, string>> = {};
    if (form.name.trim().length < 2) nextErrors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (form.phone.trim() && !isIndianPhone(form.phone)) nextErrors.phone = "Enter a valid Indian mobile number, or leave this blank.";
    if (form.message.trim().length < 10) nextErrors.message = "Tell us a little more so we can help.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const body = [`Name: ${form.name}`, `Email: ${form.email}`, `Phone: ${form.phone || "Not provided"}`, "", form.message].join("\n");
    window.location.href = `mailto:${hotelInfo.email}?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <PublicHeader />
      <main>
        <PageHero
          eyebrow="Contact"
          title="We are here"
          accent="when you need us."
          intro="Questions about a stay, an arrival, or something a little more particular? Speak with the team directly. We will help you find the right room and the right way to arrive."
          image="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=90"
          imageAlt="The pool and terrace at RIVR"
        >
          <div className="flex flex-wrap items-center gap-3">
            <a href={`tel:${hotelInfo.phoneHref}`} className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
              <Phone className="h-4 w-4" /> Call the front desk
            </a>
            <a href={`mailto:${hotelInfo.email}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]">
              <Mail className="h-4 w-4" /> Email us
            </a>
          </div>
        </PageHero>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <SectionEyebrow>Reach us</SectionEyebrow>
            <h2 className="mt-5 max-w-md font-display text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">A real person, on the other end.</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-[var(--muted)]">For reservations, arrival questions, or help planning something particular, start here. The team will point you in the right direction.</p>

            <div className="mt-8 grid gap-3">
              <a href={`tel:${hotelInfo.phoneHref}`} className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--sage-soft)] text-[var(--sage-deep)]"><Phone className="h-4 w-4" /></span>
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">Front desk</span>
                  <span className="mt-1 block text-sm font-semibold text-[var(--ink)]">{hotelInfo.phone}</span>
                  <span className="mt-1 block text-[11px] text-[var(--faint)]">Daily · IST</span>
                </span>
              </a>
              <a href={`mailto:${hotelInfo.email}`} className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--info-soft)] text-[var(--info)]"><Mail className="h-4 w-4" /></span>
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">Email</span>
                  <span className="mt-1 block break-all text-sm font-semibold text-[var(--ink)]">{hotelInfo.email}</span>
                  <span className="mt-1 block text-[11px] text-[var(--faint)]">We reply during hotel hours.</span>
                </span>
              </a>
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]"><MapPin className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">Address</span>
                  <span className="mt-1 block text-sm font-semibold leading-6 text-[var(--ink)]">{hotelInfo.address}</span>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(hotelInfo.mapQuery)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--sage)]">
                    Open in maps <ArrowUpRight className="h-3 w-3" />
                  </a>
                </span>
              </div>
            </div>
            {hotelInfo.isPlaceholder && <p className="mt-4 text-[11px] leading-5 text-[var(--faint)]">{hotelInfo.notice}</p>}
          </Reveal>

          <Reveal delay={0.08} className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_10px_35px_rgba(23,43,73,0.05)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">Send an enquiry</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">This opens your email app with the message ready to send. No form data is stored on this site.</p>
              </div>
              <Send className="h-5 w-5 shrink-0 text-[var(--sage)]" />
            </div>

            <form onSubmit={submit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">Name</span>
                <input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" placeholder="Your name" className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]" />
                {errors.name && <span className="mt-1 block text-[11px] text-[var(--danger)]">{errors.name}</span>}
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">Email</span>
                <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" placeholder="you@example.com" className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]" />
                {errors.email && <span className="mt-1 block text-[11px] text-[var(--danger)]">{errors.email}</span>}
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">Phone <span className="font-normal text-[var(--faint)]">(optional)</span></span>
                <input value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" placeholder="+91 98765 43210" className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]" />
                {errors.phone && <span className="mt-1 block text-[11px] text-[var(--danger)]">{errors.phone}</span>}
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">Subject</span>
                <select value={form.subject} onChange={(event) => update("subject", event.target.value)} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--sage)]">
                  <option>Stay enquiry</option>
                  <option>Existing reservation</option>
                  <option>Group or event</option>
                  <option>Something else</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">Message</span>
                <textarea value={form.message} onChange={(event) => update("message", event.target.value)} rows={5} placeholder="Tell us what you need help with." className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]" />
                {errors.message && <span className="mt-1 block text-[11px] text-[var(--danger)]">{errors.message}</span>}
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] sm:w-auto sm:px-6">
                  <Send className="h-4 w-4" /> Compose email
                </button>
                {sent && (
                  <p role="status" className="mt-3 flex items-center gap-2 text-xs text-[var(--success)]">
                    <CheckCircle2 className="h-4 w-4" /> Your email app should open with the message ready to send.
                  </p>
                )}
              </div>
            </form>
          </Reveal>
        </section>

        <section className="border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-14 md:px-10 md:py-16">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <SectionEyebrow>Ready to book?</SectionEyebrow>
              <h2 className="mt-3 max-w-xl font-display text-[clamp(2.2rem,3.6vw,3.4rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Check live availability in a few clicks.</h2>
            </div>
            <Link to="/booking" search={defaultStaySearch} className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
              Book your stay <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
