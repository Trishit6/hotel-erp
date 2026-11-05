import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useLayoutEffect } from "react";
import HomePage from "./pages/HomePage";
import StayPage from "./pages/StayPage";
import RoomsPage from "./pages/RoomsPage";
import AmenitiesPage from "./pages/AmenitiesPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import SearchPage from "./pages/SearchPage";
import BookingEntryPage from "./pages/BookingEntryPage";
import BookingPage from "./pages/BookingPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "./pages/AuthPages";
import { AdminLayout } from "./components/hotel/StaffChrome";
import {
  AdminActivityPage,
  AdminDashboardPage,
  AdminExpensesPage,
  AdminFrontDeskPage,
  AdminGuestsPage,
  AdminHousekeepingPage,
  AdminIndexPage,
  AdminInventoryPage,
  AdminLoginPage,
  AdminPaymentsPage,
  AdminReportsPage,
  AdminReservationsPage,
  AdminRestaurantPage,
  AdminRoomsPage,
  AdminSettingsPage,
  AdminStaffPage,
} from "./pages/AdminPages";
import { normalizeStaySearch } from "./lib/hotel-data";

const staySearch = (search: Record<string, unknown>) =>
  normalizeStaySearch(search);
function RootComponent() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();

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
      <Outlet />
    </motion.div>
  );
}

const successSearch = (search: Record<string, unknown>) => ({
  bookingId: typeof search.bookingId === "string" ? search.bookingId : "",
});
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
const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/login",
  component: AdminLoginPage,
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
  adminLoginRoute,
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
