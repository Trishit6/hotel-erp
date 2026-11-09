import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useLayoutEffect } from "react";
import { CustomCursor } from "./components/motion/CustomCursor";
import { ScrollProgress } from "./components/motion/ScrollProgress";
import HomePage from "./pages/HomePage";
import { AdminLayout } from "./components/hotel/StaffChrome";

const StayPage = lazyRouteComponent(() => import("./pages/StayPage"));
const RoomsPage = lazyRouteComponent(() => import("./pages/RoomsPage"));
const AmenitiesPage = lazyRouteComponent(() => import("./pages/AmenitiesPage"));
const AboutPage = lazyRouteComponent(() => import("./pages/AboutPage"));
const ContactPage = lazyRouteComponent(() => import("./pages/ContactPage"));
const SearchPage = lazyRouteComponent(() => import("./pages/SearchPage"));
const BookingEntryPage = lazyRouteComponent(
  () => import("./pages/BookingEntryPage"),
);
const BookingPage = lazyRouteComponent(() => import("./pages/BookingPage"));
const BookingSuccessPage = lazyRouteComponent(
  () => import("./pages/BookingSuccessPage"),
);
const MyBookingsPage = lazyRouteComponent(
  () => import("./pages/MyBookingsPage"),
);
const ForgotPasswordPage = lazyRouteComponent(
  () => import("./pages/AuthPages"),
  "ForgotPasswordPage",
);
const LoginPage = lazyRouteComponent(
  () => import("./pages/AuthPages"),
  "LoginPage",
);
const RegisterPage = lazyRouteComponent(
  () => import("./pages/AuthPages"),
  "RegisterPage",
);
const ResetPasswordPage = lazyRouteComponent(
  () => import("./pages/AuthPages"),
  "ResetPasswordPage",
);
const VerifyEmailPage = lazyRouteComponent(
  () => import("./pages/AuthPages"),
  "VerifyEmailPage",
);
const AdminActivityPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminActivityPage",
);
const AdminDashboardPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminDashboardPage",
);
const AdminExpensesPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminExpensesPage",
);
const AdminFrontDeskPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminFrontDeskPage",
);
const AdminGuestsPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminGuestsPage",
);
const AdminHousekeepingPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminHousekeepingPage",
);
const AdminIndexPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminIndexPage",
);
const AdminInventoryPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminInventoryPage",
);
const AdminPaymentsPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminPaymentsPage",
);
const AdminReportsPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminReportsPage",
);
const AdminReservationsPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminReservationsPage",
);
const AdminRestaurantPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminRestaurantPage",
);
const AdminRoomsPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminRoomsPage",
);
const AdminSettingsPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminSettingsPage",
);
const AdminStaffPage = lazyRouteComponent(
  () => import("./pages/AdminPages"),
  "AdminStaffPage",
);
const HousekeepingDashboardPage = lazyRouteComponent(
  () => import("./pages/RoleDashboards"),
  "HousekeepingDashboardPage",
);
const ManagerDashboardPage = lazyRouteComponent(
  () => import("./pages/RoleDashboards"),
  "ManagerDashboardPage",
);
const ReceptionDashboardPage = lazyRouteComponent(
  () => import("./pages/RoleDashboards"),
  "ReceptionDashboardPage",
);
const StaffDashboardPage = lazyRouteComponent(
  () => import("./pages/RoleDashboards"),
  "StaffDashboardPage",
);
const GuestDashboardPage = lazyRouteComponent(
  () => import("./pages/GuestDashboardPage"),
  "GuestDashboardPage",
);
import { normalizeStaySearch } from "./lib/hotel-data";
import { useHotel } from "./lib/hotel-store";

const staySearch = (search: Record<string, unknown>) =>
  normalizeStaySearch(search);

function ApiOfflineBanner() {
  const { status, error, refresh } = useHotel();

  if (status !== "error") return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] px-4 py-3 text-xs text-[var(--danger)] shadow-[0_14px_45px_rgba(23,43,73,0.18)] sm:inset-x-auto sm:right-5 sm:bottom-5"
    >
      <span className="leading-5">
        {error ?? "The RIVR API is not reachable."}
      </span>
      <button
        type="button"
        onClick={() => void refresh()}
        className="shrink-0 rounded-full border border-[var(--danger)]/40 px-3 py-1.5 font-semibold transition-colors hover:bg-[var(--danger-soft)]"
      >
        Retry
      </button>
    </div>
  );
}

function RootComponent() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();
  const isStaffWorkspace = [
    "/admin",
    "/manager",
    "/reception",
    "/housekeeping",
    "/staff",
  ].some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  useLayoutEffect(() => {
    if (reduceMotion) {
      controls.set({ opacity: 1 });
      return;
    }
    controls.set({ opacity: 0.001 });
    controls.start({
      opacity: 1,
      transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    });
  }, [controls, location.pathname, reduceMotion]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0.001 }}
      animate={controls}
    >
      <ScrollProgress />
      <CustomCursor />
      <Outlet />
      {!isStaffWorkspace && <ApiOfflineBanner />}
    </motion.div>
  );
}

const successSearch = (_search: Record<string, unknown>) => ({});
const reservationSearch = (
  search: Record<string, unknown>,
): { q?: string } => ({
  q: typeof search.q === "string" ? search.q : undefined,
});
const resetSearch = (search: Record<string, unknown>) => ({
  token: typeof search.token === "string" ? search.token : "",
});
const rootRoute = createRootRoute({ component: RootComponent });
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const stayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stay",
  component: StayPage,
});
const roomsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms",
  component: RoomsPage,
});
const amenitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/amenities",
  component: AmenitiesPage,
});
const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});
const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/contact",
  component: ContactPage,
});
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  validateSearch: staySearch,
  component: SearchPage,
});
const bookingEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/booking",
  validateSearch: staySearch,
  component: BookingEntryPage,
});
const bookingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/book/$roomId",
  validateSearch: staySearch,
  component: BookingPage,
});
const bookingSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/booking/success",
  validateSearch: successSearch,
  component: BookingSuccessPage,
});
const myBookingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-bookings",
  validateSearch: reservationSearch,
  component: MyBookingsPage,
});
const lookupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/booking/lookup",
  validateSearch: reservationSearch,
  component: MyBookingsPage,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});
const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});
const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  validateSearch: resetSearch,
  component: ResetPasswordPage,
});
const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  component: VerifyEmailPage,
});
const managerDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manager/dashboard",
  component: ManagerDashboardPage,
});
const receptionDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reception/dashboard",
  component: ReceptionDashboardPage,
});
const housekeepingDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/housekeeping/dashboard",
  component: HousekeepingDashboardPage,
});
const staffDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff/dashboard",
  component: StaffDashboardPage,
});
const guestDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guest/dashboard",
  component: GuestDashboardPage,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminLayout,
});
const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: AdminIndexPage,
});
const adminDashboardRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/dashboard",
  component: AdminDashboardPage,
});
const adminReservationsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/reservations",
  validateSearch: reservationSearch,
  component: AdminReservationsPage,
});
const adminRoomsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/rooms",
  component: AdminRoomsPage,
});
const adminRoomTypesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/room-types",
  component: AdminRoomsPage,
});
const adminGuestsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/guests",
  component: AdminGuestsPage,
});
const adminFrontDeskRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/front-desk",
  component: AdminFrontDeskPage,
});
const adminCheckInRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/check-in",
  component: AdminFrontDeskPage,
});
const adminCheckOutRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/check-out",
  component: AdminFrontDeskPage,
});
const adminHousekeepingRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/housekeeping",
  component: AdminHousekeepingPage,
});
const adminStaffRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/staff",
  component: AdminStaffPage,
});
const adminAttendanceRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/attendance",
  component: AdminStaffPage,
});
const adminPaymentsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/payments",
  component: AdminPaymentsPage,
});
const adminInvoicesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/invoices",
  component: AdminPaymentsPage,
});
const adminExpensesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/expenses",
  component: AdminExpensesPage,
});
const adminInventoryRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/inventory",
  component: AdminInventoryPage,
});
const adminRestaurantRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/restaurant",
  component: AdminRestaurantPage,
});
const adminReportsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/reports",
  component: AdminReportsPage,
});
const adminSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/settings",
  component: AdminSettingsPage,
});
const adminActivityRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/activity-logs",
  component: AdminActivityPage,
});
const routeTree = rootRoute.addChildren([
  homeRoute,
  stayRoute,
  roomsRoute,
  amenitiesRoute,
  aboutRoute,
  contactRoute,
  searchRoute,
  bookingEntryRoute,
  bookingRoute,
  bookingSuccessRoute,
  myBookingsRoute,
  lookupRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  managerDashboardRoute,
  receptionDashboardRoute,
  housekeepingDashboardRoute,
  staffDashboardRoute,
  guestDashboardRoute,
  adminRoute.addChildren([
    adminIndexRoute,
    adminDashboardRoute,
    adminReservationsRoute,
    adminRoomsRoute,
    adminRoomTypesRoute,
    adminGuestsRoute,
    adminFrontDeskRoute,
    adminCheckInRoute,
    adminCheckOutRoute,
    adminHousekeepingRoute,
    adminStaffRoute,
    adminAttendanceRoute,
    adminPaymentsRoute,
    adminInvoicesRoute,
    adminExpensesRoute,
    adminInventoryRoute,
    adminRestaurantRoute,
    adminReportsRoute,
    adminSettingsRoute,
    adminActivityRoute,
  ]),
]);
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
