# RIVR — Hotel Management & Operations System

**A modern, full-stack Hotel ERP designed to simplify hotel operations, streamline workflows, and centralize property management.**

RIVR is a hotel management and operations platform that brings guest-facing services and internal hotel operations together in one system. It combines a modern React-based frontend with an Express.js API, MariaDB database, and Drizzle ORM.

The platform is designed to manage essential hotel workflows, including room management, reservations, guest records, payments, invoices, staff operations, housekeeping, inventory, expenses, and restaurant orders.

---

## Project Overview

| Attribute | Details |
|---|---|
| Project Name | RIVR Hotel ERP |
| Project Type | Full-Stack Hotel Management System |
| Architecture | pnpm Monorepo |
| Frontend | React 19 + TypeScript |
| Backend | Node.js + Express.js |
| Database | MariaDB |
| ORM | Drizzle ORM |
| API Style | REST API |
| Authentication | Session-Based Authentication |
| Authorization | Role-Based Access Control (RBAC) |
| Package Manager | pnpm |

## Key Features

### 1. Guest Management
- Public hotel website and room catalogue.
- Room availability search.
- Guest reservation creation.
- Reservation lookup using booking reference and contact details.
- Guest information management.

### 2. Room Management
- Centralized room and room-type management.
- Room availability and status tracking.
- Room assignment and reservation management.
- Room lifecycle management.

### 3. Reservation Management
- Reservation creation and modification.
- Booking confirmation and cancellation.
- Check-in and check-out workflows.
- Room availability and overlapping-booking prevention.
- Reservation status tracking.

### 4. Payments & Invoices
- Payment recording and management.
- Invoice tracking.
- Server-side calculation of monetary values.
- Payment and invoice balance management.

### 5. Staff Management
- Staff account management.
- Role-based access permissions.
- Staff attendance management.
- Secure staff authentication.

### 6. Housekeeping Management
- Housekeeping task creation and assignment.
- Room cleaning status tracking.
- Task completion and inspection workflows.
- Integration with room availability.

### 7. Inventory Management
- Inventory item management.
- Stock adjustments.
- Inventory tracking.

### 8. Expense Management
- Expense recording.
- Expense approval workflows.
- Operational expense tracking.

### 9. Restaurant Management
- Restaurant order creation.
- Order status management.
- Restaurant operations tracking.

### 10. Dashboard & Activity Monitoring
- Operational dashboard.
- Business activity tracking.
- Administrative overview and reporting.

---

## Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS 4
- Motion
- Lucide Icons
- Zod

### Backend
- Node.js
- Express.js 4
- TypeScript
- Zod
- Drizzle ORM
- MySQL2
- Argon2id

### Database
- MariaDB
- SQL migrations
- Database-backed session management

### Development & Testing
- pnpm Workspaces
- Vitest
- Supertest
- Git
- Visual Studio Code

---

## System Architecture

RIVR follows a modular full-stack architecture.

```text
                 RIVR HOTEL ERP
                       |
          +------------+------------+
          |                         |
     FRONTEND                    BACKEND
          |                         |
   React + TypeScript          Express.js API
          |                         |
   TanStack Router             REST Endpoints
          |                         |
   API Client                   Middleware
          |                         |
          +------------+------------+
                       |
                  Drizzle ORM
                       |
                   MariaDB
                       |
             Persistent Data Storage
```

### Architecture Highlights

- Frontend and backend are maintained in a single pnpm monorepo.
- Express.js handles API requests and business logic.
- Drizzle ORM manages database interactions.
- MariaDB stores hotel business records and sessions.
- Zod validates incoming API data.
- Authentication and permissions are enforced server-side.
- The frontend communicates with the backend through a centralized API client.

---

## Repository Structure

```text
hotel-erp/
│
├── apps/
│   └── api/
│       ├── drizzle/
│       │   └── migrations/
│       ├── scripts/
│       ├── src/
│       │   ├── config/
│       │   ├── database/
│       │   ├── middleware/
│       │   ├── modules/
│       │   ├── services/
│       │   ├── utils/
│       │   ├── app.ts
│       │   └── server.ts
│       └── tests/
│
├── src/
│   ├── components/
│   │   └── hotel/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── hotel-data.ts
│   │   └── hotel-store.tsx
│   ├── pages/
│   ├── router.tsx
│   ├── App.tsx
│   └── main.tsx
│
├── public/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

Ensure the following tools are installed:

- Node.js 20 or newer
- pnpm 11
- MariaDB 10.6 or newer
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Trishit6/hotel-erp.git
```

Navigate into the project:

```bash
cd hotel-erp
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create an environment file from the provided example.

**Windows PowerShell:**

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

**macOS/Linux:**

```bash
cp apps/api/.env.example apps/api/.env
```

Configure the database credentials and other required settings inside:

```text
apps/api/.env
```

### 4. Create the Database

Log in to MariaDB and execute:

```sql
CREATE DATABASE rivr_hotel
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE rivr_hotel_test
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Configure the database names and credentials in the API environment file.

### 5. Run Database Migrations

```bash
pnpm db:migrate
```

### 6. Seed Initial Data

```bash
pnpm db:seed
```

### 7. Create the Administrator Account

```bash
pnpm create-admin
```

Follow the interactive instructions to create the initial administrator account.

---

## Running the Application

RIVR uses separate development processes for the frontend and backend.

### Start the Backend

Open a terminal in the project root:

```bash
pnpm dev:api
```

The API uses port `4000` by default.

### Start the Frontend

Open another terminal:

```bash
pnpm dev
```

The Vite development server uses port `5173` by default.

### Access the Application

| Service | Local URL |
|---|---|
| Guest Website | http://localhost:5173 |
| Staff Login | http://localhost:5173/admin/login |
| Backend API | http://localhost:4000/api |
| API Health Check | http://localhost:4000/api/health |

Vite proxies `/api` requests to the backend by default.

---

## API Overview

The Express backend exposes REST API endpoints grouped by functionality.

| Module | Base Route |
|---|---|
| Health | `/api/health` |
| Public Catalogue | `/api/public/` |
| Authentication | `/api/auth/` |
| Dashboard & Administration | `/api/admin/` |
| Reservations | `/api/admin/reservations` |
| Rooms | `/api/admin/rooms` |
| Guests | `/api/admin/guests` |
| Payments | `/api/admin/payments` |
| Housekeeping | `/api/admin/housekeeping/tasks` |
| Staff | `/api/admin/staff` |
| Inventory | `/api/admin/inventory` |
| Expenses | `/api/admin/expenses` |
| Restaurant Orders | `/api/admin/restaurant/orders` |
| Reports | `/api/admin/reports/` |
| User Management | `/api/admin/users` |

Administrative endpoints require an authenticated session and appropriate permissions.

---

## Authentication & Security

RIVR incorporates several security mechanisms:

- Argon2id password hashing.
- Database-backed session management.
- HTTP-only authentication cookies.
- Server-side role-based access control.
- Zod request validation.
- Helmet security headers.
- Rate limiting.
- Explicit-origin CORS configuration.
- Server-side permission enforcement.
- Session invalidation following account deactivation or password changes.

### Supported Roles

- Super Administrator
- Administrator
- Manager
- Receptionist
- Housekeeping
- Accountant
- Restaurant Staff

Permissions are determined by the backend rather than trusted client-side role values.

---

## Business Logic & Data Integrity

The system includes important hotel-operational rules:

- Prevention of overlapping room reservations.
- Room availability management.
- Reservation status transitions.
- Automated housekeeping task creation after checkout.
- Room status updates following check-in and check-out.
- Server-authoritative payment calculations.
- Monetary storage using `DECIMAL(12,2)`.
- Integer-paise calculations for financial operations.
- Date handling based on `YYYY-MM-DD` and `Asia/Kolkata`.

The documented demo tax rate is 12%. Actual tax configuration must be verified before real-world use.

---

## Development Commands

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start frontend development server |
| `pnpm dev:api` | Start backend development server |
| `pnpm build` | Build frontend |
| `pnpm build:api` | Build backend |
| `pnpm preview` | Preview frontend production build |
| `pnpm exec tsc -b` | Frontend TypeScript project check |
| `pnpm typecheck:api` | Backend type checking |
| `pnpm test:api` | Run backend integration tests |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Seed initial data |
| `pnpm db:reset` | Reset database schema — destructive |
| `pnpm create-admin` | Create administrator |

**Note:** API integration tests require a configured MariaDB test database. Use `pnpm exec tsc -b` for the actual frontend TypeScript project-reference check.

---

## Testing & Quality Assurance

Before preparing a release, execute:

```bash
pnpm exec tsc -b
pnpm build
pnpm typecheck:api
pnpm test:api
```

The backend test suite is designed to verify API functionality, authentication, permissions, validation, payment workflows, reservation operations, and database-dependent business rules.

Tests must use a dedicated test database. Never run destructive database reset commands against production data.

---

## Current Project Status

RIVR has progressed beyond a frontend-only prototype into a full-stack application structure.

| Component | Project status |
|---|---|
| React frontend | Implemented |
| Express.js API workspace | Implemented |
| MariaDB integration code | Implemented; local connection verification pending |
| Drizzle ORM schema and migrations | Implemented |
| Authentication and session architecture | Implemented |
| Role-based access control | Implemented |
| Hotel operations modules | Implemented in the documented API structure |
| Frontend API integration | Implemented in the documented application architecture |
| Database migration execution | Pending local verification |
| Full database-backed test execution | Pending verification |
| Production deployment | Pending |

**Important:** The presence of implementation code does not establish that every workflow has passed end-to-end testing. Database connectivity, migrations, integration tests, and production deployment must be verified separately.

---

## Known Limitations

- Guest account registration and guest password recovery are not enabled.
- Online payment gateway integration is not currently documented as implemented.
- Payment recording is staff-managed.
- The current configuration targets a single property.
- Hotel identity and contact information contain placeholder values that must be replaced.
- Demo seed data is not a production data-import mechanism.
- Legacy browser `localStorage` business records are not automatically migrated into MariaDB.
- Email and SMS delivery integrations are not currently documented as implemented.

---

## Production Deployment Considerations

Before deploying RIVR:

1. Configure production environment variables.
2. Use strong and unique session secrets.
3. Enable HTTPS and secure cookies.
4. Configure the production database and least-privilege credentials.
5. Run database migrations as a release step.
6. Disable demo reset functionality.
7. Remove or rotate initial setup tokens.
8. Configure the production frontend origin.
9. Verify authentication, authorization, and all critical business workflows.
10. Configure backups, monitoring, and operational recovery procedures.

Do not expose `.env` files, database passwords, administrator credentials, or session secrets in GitHub.

---

## Future Improvements

Potential areas for continued development include:

- Online payment gateway integration.
- Email and SMS notifications.
- Advanced analytics and operational reporting.
- Multi-property management.
- Guest account management.
- Enhanced inventory and procurement workflows.
- Automated deployment and monitoring.
- Expanded integration and end-to-end testing.

---

## Project Repository

**GitHub:** https://github.com/Trishit6/hotel-erp

---

## License

All rights reserved. This project is currently maintained as a private development initiative. No open-source license is granted unless a license file is added to the repository.

---

**RIVR Hotel ERP**  
*One Platform. Smarter Hotel Operations.*