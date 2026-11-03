# RIVR Hotel ERP

RIVR is a premium hotel website and operations workspace built with React, TypeScript, Tailwind CSS v4, TanStack Router, Motion, Lucide, and Zod.

## Guest website

- Luxury hotel homepage with room search widget.
- Search by check-in, check-out, adults, children, and rooms.
- Date-aware room availability and overlap prevention.
- Reservation checkout with validated guest details.
- Confirmation lookup by booking reference or guest email.
- Featured rooms, amenities, offers, reviews, and contact sections.

## Admin ERP

Enter at `/admin/login` and choose a demo role:

- Super Admin
- Hotel Manager
- Receptionist
- Housekeeping Staff
- Accountant
- Restaurant Staff

Included modules:

- Overview dashboard with live KPIs, revenue and occupancy visuals.
- Reservations, room assignment, status updates, and double-booking prevention.
- Rooms and room types with inventory status management.
- Guest CRM profiles and stay history.
- Front desk arrivals, departures, check-in, and check-out workflows.
- Housekeeping board with assignment and inspection status.
- Staff directory and attendance.
- Payments, partial balances, invoices, and CSV export.
- Expenses with approval workflow.
- Inventory stock alerts and quantity adjustments.
- Restaurant and room-service orders.
- Reports, CSV export, browser print, settings, and activity logs.

## Development data layer

The original workspace contained only a Vite client—there was no server, authentication service, Drizzle schema, MariaDB connection, or existing API to preserve. The current implementation uses a typed, Zod-validated local adapter with browser persistence so the workflows are usable end-to-end in development. All domain state is centralized in `src/lib/hotel-store.tsx`, making it the replacement point for a server repository.

The role selector and route guard are development UX only. Production deployment still needs server-side authentication, authorization, MariaDB/Drizzle persistence, payment gateway credentials, secure cookies, and API integration.

## Run and verify

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```
