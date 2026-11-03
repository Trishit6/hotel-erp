# RIVR — Hotel Management & ERP System

<p align="center">
  <strong>A Modern Hospitality Management & Guest Experience Platform</strong>
</p>

<p align="center">
  A premium hotel booking experience combined with an integrated hotel operations workspace.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Motion-12-FF4154?logo=framer&logoColor=white" />
  <img src="https://img.shields.io/badge/License-Proprietary-lightgrey" />
</p>

---

## Overview

**RIVR** is a modern Hotel Management and Enterprise Resource Planning (ERP) project designed to bring guest-facing hotel services and internal hotel operations into one unified platform.

The project combines a premium hotel website with an operations workspace designed for hotel administrators and staff.

RIVR aims to simplify hotel management through organized workflows for reservations, room management, guest information, housekeeping, front desk operations, payments, inventory and reporting.

The platform focuses on three major objectives:

- **Guest Experience:** Provide an elegant and convenient hotel booking experience.
- **Operational Efficiency:** Simplify everyday hotel management operations.
- **Centralized Management:** Organize hotel information and operational workflows in one place.

## Key Features

### 1. Guest Website

A premium hospitality-focused website designed to provide a smooth guest experience.

- Luxury-inspired homepage.
- Featured room listings.
- Room search and availability interface.
- Check-in and check-out selection.
- Adult, child and room selection.
- Reservation checkout.
- Guest information validation.
- Booking confirmation lookup.
- Amenities and hotel information.
- Offers and reviews sections.
- Contact information and inquiry section.

### 2. Hotel Administration & ERP

The ERP workspace includes modules for managing different hotel operations.

| Module | Functionality |
|---|---|
| Dashboard | Operational overview, KPIs, revenue and occupancy visuals |
| Reservations | Booking management, room assignment and reservation statuses |
| Room Management | Room types, room details and inventory status |
| Guest Management | Guest profiles and stay history |
| Front Desk | Arrivals, departures, check-in and check-out |
| Housekeeping | Cleaning assignments and room inspection status |
| Staff Management | Staff directory and attendance |
| Payments | Payments, outstanding balances and invoices |
| Expenses | Expense records and approval workflows |
| Inventory | Stock management and low-stock alerts |
| Restaurant | Restaurant and room-service orders |
| Reports | Operational reports and CSV exports |
| Activity Logs | Records of application activities |
| Settings | Application configuration |

### 3. Role-Based Workspace

The development interface includes role selection for:

- Super Administrator
- Hotel Manager
- Receptionist
- Housekeeping Staff
- Accountant
- Restaurant Staff

Note: Current role selection and route guards are development functionality, not production-grade authorization.

## Technology Stack

| Technology | Purpose |
|---|---|
| React 19 | Frontend development |
| TypeScript | Type safety |
| Vite | Development server and build tool |
| Tailwind CSS 4 | Styling |
| TanStack Router | Application routing |
| Motion | Animations and interactions |
| Lucide React | Icons |
| Zod | Schema validation |
| pnpm | Package management |

## Project Architecture

The current implementation is a frontend-focused application.

Its domain state and development data operations are centralized in:

`src/lib/hotel-store.tsx`

The application uses a typed, Zod-validated local data adapter with browser persistence.

This architecture supports the current development workflows and provides a potential integration point for a future backend.

**Current implementation limitations:**

- No production backend API.
- No MariaDB database integration.
- No server-side authentication.
- No production authorization system.
- No configured payment gateway integration.
- No production-grade secure session management.

These capabilities are part of the planned production architecture.

## Project Structure

```text
hotel-erp/
│
├── src/
│   ├── components/
│   ├── routes/
│   ├── lib/
│   │   └── hotel-store.tsx
│   ├── assets/
│   └── ...
│
├── public/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The structure above is a simplified overview. Refer to the actual source directory for the complete component and route organization.

## Getting Started

Follow these instructions to run the project locally.

### Prerequisites

- Node.js (compatible with the installed Vite version)
- pnpm
- Git
- Visual Studio Code (recommended)

### 1. Clone the repository

```bash
git clone https://github.com/Trishit6/hotel-erp.git
```

### 2. Navigate to the project

```bash
cd hotel-erp
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Start the development server

```bash
pnpm dev
```

### 5. Open the application

Visit:

```text
http://localhost:5173
```

## Available Commands

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start development server |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm build` | Build the production frontend |
| `pnpm preview` | Preview the production build |

## Development Roadmap

The following areas are intended for future development and production readiness.

- [ ] Production backend architecture.
- [ ] MariaDB database integration.
- [ ] Server-side authentication and authorization.
- [ ] Secure role-based access control.
- [ ] Production reservation and availability APIs.
- [ ] Payment gateway integration.
- [ ] Invoice and billing integration.
- [ ] Indian localization and INR currency support.
- [ ] Production deployment and environment configuration.
- [ ] Automated testing and security validation.

## Future Technology Direction

The planned production architecture includes:

- **Backend:** Laravel or another selected backend framework.
- **Database:** MariaDB.
- **Authentication:** Secure server-side authentication.
- **API:** RESTful API integration.
- **Payments:** Configurable payment gateway.
- **Deployment:** Production frontend, backend and database hosting.

These technologies are proposed architectural directions, not currently integrated components.

## Project Goals

RIVR aims to develop into a comprehensive hotel management solution that connects guest services with hotel operations.

The long-term objective is to create a reliable, maintainable and scalable platform that improves the experience of both hotel guests and hotel staff.

## Contributing

Contributions, suggestions and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your implementation.
5. Submit a pull request.

Please ensure that existing functionality is preserved.

## License

This project currently has no declared open-source license. All rights remain with the respective copyright holders unless a license is added.

---

<p align="center">
  <strong>RIVR — Thoughtful Hospitality. Smarter Operations.</strong>
</p>