import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useSearch } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { BrandMark } from "../components/hotel/HotelUi";
import { ThemeToggle } from "../components/hotel/ThemeToggle";
import { hotelInfo, isIndianPhone, roleHome } from "../lib/hotel-data";
import { useHotel } from "../lib/hotel-store";
import { ApiError, api } from "../lib/api";

const inputClass =
  "w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]";
const labelClass =
  "mb-2 block text-xs font-semibold text-[var(--muted-strong)]";

function AuthShell({
  eyebrow,
  title,
  subtitle,
  image,
  imageAlt,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 md:px-10">
        <BrandMark />
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)] sm:flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to hotel
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto grid max-w-[1320px] gap-5 px-4 pb-10 md:px-7 lg:min-h-[calc(100vh-92px)] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden min-h-[640px] overflow-hidden rounded-[1.9rem] bg-[var(--deep)] lg:block">
          <motion.img
            initial={reduceMotion ? false : { scale: 1.06 }}
            animate={reduceMotion ? undefined : { scale: 1 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep)]/90 via-[var(--deep)]/25 to-[var(--deep)]/10" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sage-on-dark)]">
              RIVR · {hotelInfo.city}
            </p>
            <h1 className="mt-4 max-w-md font-display text-[clamp(2.8rem,4vw,4.4rem)] leading-[0.98] tracking-[-0.03em]">
              A quieter kind of arrival.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              One account for guests and staff. Your access is determined by the
              role on your RIVR account.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[11px] text-white/55">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--sage-on-dark)]" />{" "}
              Sessions are HTTP-only and expire automatically.
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center py-6 lg:py-10">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[500px]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sage)]">
              {eyebrow}
            </p>
            <h2 className="mt-4 font-display text-[clamp(2.4rem,4vw,3.8rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {subtitle}
            </p>
            <div className="mt-7 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_14px_45px_rgba(23,43,73,0.07)] md:p-7">
              {children}
            </div>
            {footer && (
              <div className="mt-5 text-center text-xs text-[var(--muted)]">
                {footer}
              </div>
            )}
          </motion.div>
        </section>
      </main>
    </div>
  );
}

function Status({
  tone,
  children,
}: {
  tone: "info" | "error" | "success";
  children: ReactNode;
}) {
  const styles = {
    info: "border-[var(--info)]/25 bg-[var(--info-soft)] text-[var(--info)]",
    error:
      "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]",
    success:
      "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]",
  };
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mt-4 rounded-xl border px-3.5 py-3 text-xs leading-5 ${styles[tone]}`}
    >
      {children}
    </p>
  );
}

function PasswordField({
  value,
  onChange,
  label = "Password",
  autoComplete = "current-password",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
        <LockKeyhole className="h-4 w-4 text-[var(--faint)]" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
          placeholder="Enter your password"
        />
        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          className="text-[var(--faint)] transition-colors hover:text-[var(--ink)]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function passwordScore(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

export function LoginPage() {
  const { login } = useHotel();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      nextErrors.email = "Enter the email address on your account.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    setStatus("");
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    // Full navigation so every provider reloads against the new session.
    window.location.assign(result.redirect ?? roleHome("customer"));
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back."
      subtitle="Guests and hotel staff use the same sign in. Your dashboard is chosen from the role stored on your account."
      image="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=90"
      imageAlt="A warm guest room at RIVR"
      footer={
        <>
          <span>New to RIVR? </span>
          <Link
            to="/register"
            className="font-semibold text-[var(--ink)] underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <label>
          <span className={labelClass}>Email address</span>
          <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
            <Mail className="h-4 w-4 text-[var(--faint)]" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
            />
          </span>
          {errors.email && (
            <span className="mt-1 block text-[11px] text-[var(--danger)]">
              {errors.email}
            </span>
          )}
        </label>
        <PasswordField value={password} onChange={setPassword} />
        {errors.password && (
          <span className="-mt-2 text-[11px] text-[var(--danger)]">
            {errors.password}
          </span>
        )}
        <div className="flex items-center justify-end text-xs">
          <Link
            to="/forgot-password"
            className="font-semibold text-[var(--sage)] underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
        {status && <Status tone="error">{status}</Status>}
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useHotel();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const score = useMemo(() => passwordScore(form.password), [form.password]);
  const strengthLabel = ["Too short", "Weak", "Fair", "Good", "Strong"][score];

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setStatus("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.fullName.trim().length < 2)
      nextErrors.fullName = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      nextErrors.email = "Enter a valid email address.";
    if (!isIndianPhone(form.phone))
      nextErrors.phone = "Enter a valid Indian mobile number.";
    if (form.password.length < 8)
      nextErrors.password = "Use at least 8 characters.";
    if (form.confirmPassword !== form.password)
      nextErrors.confirmPassword = "Passwords do not match.";
    if (!form.terms) nextErrors.terms = "Please accept the terms to continue.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    const result = await register({
      name: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
    });
    setSubmitting(false);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    window.location.assign(result.redirect ?? "/guest/dashboard");
  };

  return (
    <AuthShell
      eyebrow="Create an account"
      title="Make RIVR yours."
      subtitle="Create a guest account to keep your reservations, invoices and preferences in one place. Public signup always creates a customer account."
      image="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=90"
      imageAlt="The RIVR pool and terrace"
      footer={
        <>
          <span>Already have an account? </span>
          <Link
            to="/login"
            className="font-semibold text-[var(--ink)] underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <label>
          <span className={labelClass}>Full name</span>
          <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
            <UserRound className="h-4 w-4 text-[var(--faint)]" />
            <input
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              autoComplete="name"
              placeholder="Your full name"
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
            />
          </span>
          {errors.fullName && (
            <span className="mt-1 block text-[11px] text-[var(--danger)]">
              {errors.fullName}
            </span>
          )}
        </label>
        <label>
          <span className={labelClass}>Email</span>
          <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
            <Mail className="h-4 w-4 text-[var(--faint)]" />
            <input
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
            />
          </span>
          {errors.email && (
            <span className="mt-1 block text-[11px] text-[var(--danger)]">
              {errors.email}
            </span>
          )}
        </label>
        <label>
          <span className={labelClass}>Indian mobile number</span>
          <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
            <span className="text-xs font-semibold text-[var(--faint)]">
              +91
            </span>
            <input
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              autoComplete="tel"
              placeholder="98765 43210"
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
            />
          </span>
          {errors.phone && (
            <span className="mt-1 block text-[11px] text-[var(--danger)]">
              {errors.phone}
            </span>
          )}
        </label>
        <PasswordField
          value={form.password}
          onChange={(value) => update("password", value)}
          label="Password"
          autoComplete="new-password"
        />
        {form.password && (
          <div className="-mt-1">
            <div className="flex items-center justify-between text-[11px] text-[var(--faint)]">
              <span>Password strength</span>
              <span>{strengthLabel}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 rounded-full ${score >= step ? "bg-[var(--sage)]" : "bg-[var(--line-2)]"}`}
                />
              ))}
            </div>
          </div>
        )}
        {errors.password && (
          <span className="-mt-2 text-[11px] text-[var(--danger)]">
            {errors.password}
          </span>
        )}
        <PasswordField
          value={form.confirmPassword}
          onChange={(value) => update("confirmPassword", value)}
          label="Confirm password"
          autoComplete="new-password"
        />
        {errors.confirmPassword && (
          <span className="-mt-2 text-[11px] text-[var(--danger)]">
            {errors.confirmPassword}
          </span>
        )}
        <label className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
          <input
            type="checkbox"
            checked={form.terms}
            onChange={(event) => update("terms", event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--line-2)] accent-[var(--primary)]"
          />
          I agree to the booking terms and privacy policy.
        </label>
        {errors.terms && (
          <span className="-mt-2 text-[11px] text-[var(--danger)]">
            {errors.terms}
          </span>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create account"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
        {status && <Status tone="error">{status}</Status>}
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter the email address on your account.");
      setStatus("");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await api.post<{ message: string; resetToken?: string }>(
        "/auth/forgot-password",
        { email: email.trim() },
      );
      setStatus(result.message);
      setResetToken(result.resetToken ?? "");
    } catch (caught) {
      setStatus(
        caught instanceof ApiError
          ? caught.message
          : "Could not request a password reset.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account help"
      title="Reset your password."
      subtitle="Enter your account email. If it matches an active account we will issue a single-use reset link."
      image="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=90"
      imageAlt="The RIVR dining room"
      footer={
        <Link
          to="/login"
          className="font-semibold text-[var(--ink)] underline underline-offset-4"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <label>
          <span className={labelClass}>Account email</span>
          <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
            <Mail className="h-4 w-4 text-[var(--faint)]" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
            />
          </span>
          {error && (
            <span className="mt-1 block text-[11px] text-[var(--danger)]">
              {error}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send reset instructions"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
        {status && <Status tone="success">{status}</Status>}
        {resetToken && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5 text-xs leading-5 text-[var(--muted)]">
            <p className="font-semibold text-[var(--ink)]">
              Development reset link
            </p>
            <p className="mt-1">
              No email provider is configured, so the token is shown here in
              development only.
            </p>
            <Link
              to="/reset-password"
              search={{ token: resetToken }}
              className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[var(--sage)]"
            >
              Choose a new password <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const search = useSearch({ from: "/reset-password" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasToken = Boolean(search.token);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { password?: string; confirmPassword?: string } = {};
    if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (confirmPassword !== password)
      nextErrors.confirmPassword = "Passwords do not match.";
    setErrors(nextErrors);
    setStatus("");
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token: search.token,
        password,
      });
      setDone(true);
    } catch (caught) {
      setStatus(
        caught instanceof ApiError
          ? caught.message
          : "The password could not be reset.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account help"
      title="Choose a new password."
      subtitle={
        hasToken
          ? "Your reset link is valid for one use. Signing in again will require the new password."
          : "This reset link is incomplete. Request a new link from the sign in page."
      }
      image="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=90"
      imageAlt="A quiet spa treatment room at RIVR"
      footer={
        <Link
          to="/login"
          className="font-semibold text-[var(--ink)] underline underline-offset-4"
        >
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="flex flex-col items-center py-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--sage-deep)]">
            <Check className="h-6 w-6" />
          </span>
          <h3 className="mt-5 font-display text-2xl text-[var(--ink)]">
            Password updated.
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
            All other sessions for this account have been signed out.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <PasswordField
            value={password}
            onChange={setPassword}
            label="New password"
            autoComplete="new-password"
          />
          {errors.password && (
            <span className="-mt-2 text-[11px] text-[var(--danger)]">
              {errors.password}
            </span>
          )}
          <PasswordField
            value={confirmPassword}
            onChange={setConfirmPassword}
            label="Confirm new password"
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <span className="-mt-2 text-[11px] text-[var(--danger)]">
              {errors.confirmPassword}
            </span>
          )}
          <button
            type="submit"
            disabled={!hasToken || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Updating..." : "Update password"}{" "}
            <ArrowRight className="h-4 w-4" />
          </button>
          {status && <Status tone="error">{status}</Status>}
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="Email verification"
      title="Check your inbox."
      subtitle="Email verification is not enabled for this build, so no verification message is sent."
      image="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=90"
      imageAlt="A warm guest room at RIVR"
      footer={
        <Link
          to="/login"
          className="font-semibold text-[var(--ink)] underline underline-offset-4"
        >
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col items-center py-3 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--sage-deep)]">
          <KeyRound className="h-6 w-6" />
        </span>
        <h3 className="mt-5 font-display text-2xl text-[var(--ink)]">
          Verification is not available.
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
          No email provider is configured. Accounts are created immediately and
          can be deactivated by a hotel administrator.
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--muted)]">
          <Check className="h-3.5 w-3.5 text-[var(--sage)]" /> No email was sent.
        </div>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]"
        >
          Return to sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </AuthShell>
  );
}
