# RIVR — Hotel Management & ERP System

<p align="center">
  <strong>A unified digital platform for hotel operations, guest management and hospitality administration.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MariaDB-Database-003545?logo=mariadb&logoColor=white" alt="MariaDB" />
  <img src="https://img.shields.io/badge/License-Not%20Specified-lightgrey" alt="License not specified" />
</p>

---

## Overview

**RIVR Hotel ERP** is a full-stack hotel management and enterprise resource planning application designed to bring guest-facing experiences and internal hotel operations together in one platform.

The system combines a public hotel website and reservation experience with a role-based staff management workspace. It uses a React frontend, a TypeScript-based REST API, MariaDB and Drizzle ORM to manage operational data.

RIVR aims to simplify hotel workflows, improve operational visibility, centralize business records and provide a consistent digital experience for guests and hotel staff.

## Key Capabilities

### Guest Experience & Reservations
- Public hotel website and accommodation catalogue.
- Room and room-type information.
- Availability search based on stay dates.
- Guest registration and authentication.
- Reservation creation and booking confirmation.
- Reservation verification using a booking reference and matching contact information.
- Guest dashboard and booking history.
- Guest password reset functionality.

### Hotel Operations
- Reservation management.
- Room and room-type management.
- Guest records management.
- Check-in and check-out workflows.
- Room status tracking.
- Housekeeping task management.
- Staff management and attendance.
- Inventory management.
- Expense tracking and approval.
- Restaurant order management.
- Payment and invoice records.
- Operational activity logs.

### Role-Based Access Control

The application supports role-based access for different hotel operations.

| Role | Access purpose |
|---|---|
| Super Administrator | Overall system administration |
| Administrator | Authorized hotel administration |
| Manager | Management and operational oversight |
| Receptionist | Front-desk and reservation operations |
| Housekeeping | Housekeeping operations |
| Accountant | Financial records and reporting |
| Restaurant | Restaurant order operations |
| Staff | Assigned staff operations |
| Customer | Guest account and booking experience |

Access is enforced by the backend through authenticated sessions and server-side permissions.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite 8 |
| Routing | TanStack Router |
| Styling | Tailwind CSS 4 |
| Animations | GSAP, Motion |
| Icons | Lucide React |
| Backend | Node.js, Express 4 |
| API Validation | Zod |
| Database | MariaDB / compatible MySQL |
| ORM | Drizzle ORM |
| Database Driver | mysql2 |
| Authentication | Argon2id, server-managed sessions |
| Security | Helmet, CORS, rate limiting, RBAC |
| Testing | Vitest, Supertest |
| Package Manager | pnpm |

## Architecture

RIVR follows a frontend and backend architecture with a centralized API and relational database.

```text
                  RIVR HOTEL ERP
                         |
             +-----------+-----------+
             |                       |
       Public Website          Staff Workspace
             |                       |
             +-----------+-----------+
                         |
                  React Frontend
                 TypeScript + Vite
                         |
                  Typed API Client
                         |
                 Express REST API
                         |
             +-----------+-----------+
             |                       |
       Authentication           API Modules
       & Authorization           & Services
             |                       |
             +-----------+-----------+
                         |
                    Drizzle ORM
                         |
                     MariaDB
```

### Repository Structure

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
│   └── router.tsx
│
├── scripts/
├── reports/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Security & Authentication

Security is an important part of the RIVR architecture.

The documented implementation includes:

- Password hashing using Argon2id.
- Server-managed sessions.
- HTTP-only session cookies.
- HMAC-SHA256 hashing of stored session tokens.
- Explicit-origin CORS configuration.
- Helmet security headers.
- API rate limiting.
- Zod request validation.
- Backend-enforced role-based permissions.
- Protected administrative endpoints.
- Restricted reservation verification.
- Session invalidation following relevant account security changes.

The frontend does not determine privileged user roles. Authorization is enforced by the backend.

## Reservation & Operational Rules

The system includes business rules intended to protect reservation and room operations.

- Reservations cannot overlap for the same room.
- Booking transactions lock the relevant room row before checking availability.
- Public reservations begin with a pending two-hour hold.
- Staff-created reservations begin as confirmed.
- Expired public holds are handled through cleanup.
- Rooms marked for maintenance, cleaning or out-of-order use are not sellable.
- Check-in and check-out follow date and permission rules.
- Certain manager/admin overrides are logged.
- Payment and invoice updates use transaction-safe server-side calculations.

## Getting Started

Follow the instructions below to run RIVR locally.

### Prerequisites

Install the following:

- Node.js 20 or newer.
- pnpm 12.18.0.
- MariaDB 10.6+ or compatible MySQL 5.7+.
- Git.
- A code editor such as Visual Studio Code.

### 1. Clone the Repository

```bash
git clone https://github.com/Trishit6/hotel-erp.git
cd hotel-erp
```

### 2. Enable pnpm

```bash
corepack enable
corepack prepare pnpm@12.18.0 --activate
```

Verify the installation:

```bash
node -v
pnpm -v
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Configure Environment Variables

Create the API environment file.

**Windows PowerShell:**

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

**macOS / Linux:**

```bash
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and configure the required values:

```env
NODE_ENV=development

PORT=4000
WEB_ORIGIN=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=rivr_hotel
DB_TEST_NAME=rivr_hotel_test

SESSION_SECRET=replace_with_a_long_random_secret
```

Use the database port configured in your MariaDB installation. The example above uses port `3307`.

Generate a strong, unique session secret for your local environment.

**Security notice:** Never commit `.env` files, database passwords, session secrets or other credentials to GitHub.

### 5. Create the Databases

Connect to MariaDB and execute:

```sql
CREATE DATABASE rivr_hotel
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE rivr_hotel_test
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Ensure that the configured database user has the necessary permissions.

### 6. Run Database Migrations

```bash
pnpm db:migrate
```

This applies the available database migrations.

### 7. Create the First Administrator

Use the dedicated CLI command:

```bash
pnpm create-admin --email admin@example.com --password "your-strong-password"
```

Use your own administrator email and a strong password of at least 12 characters.

The CLI is designed for initial administrator creation and refuses to create another active super-administrator when one already exists.

### 8. Start the Application

```bash
pnpm dev
```

The development script starts the API and frontend.

Open:

| Service | Local URL |
|---|---|
| Guest Website | http://localhost:5173 |
| Staff Login | http://localhost:5173/login |
| API Health | http://localhost:4000/api/health |

## Development Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start frontend and API together |
| `pnpm dev:web` | Start frontend only |
| `pnpm dev:api` | Start API only |
| `pnpm build` | Typecheck and build frontend |
| `pnpm build:api` | Build API |
| `pnpm typecheck` | Frontend TypeScript check |
| `pnpm typecheck:api` | API TypeScript check |
| `pnpm test:api` | Run API integration tests |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm create-admin` | Run administrator creation command |

## API Overview

The backend exposes REST endpoints under:

```text
http://localhost:4000/api
```

### Public Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API and database health |
| GET | `/public/room-types` | Room types and amenities |
| GET | `/public/catalog` | Public hotel catalogue |
| GET | `/public/rooms` | Public rooms |
| GET | `/public/availability` | Availability search |
| POST | `/public/reservations` | Create a guest reservation |
| POST | `/public/reservations/verify` | Verify reservation ownership |

### Authentication Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Sign in |
| POST | `/auth/logout` | Sign out |
| GET | `/auth/me` | Retrieve current session |
| POST | `/auth/change-password` | Change password |

### Administrative API

Administrative modules include:

- Dashboard and activity.
- Reservations.
- Rooms and room types.
- Guest management.
- Payments and invoices.
- Housekeeping.
- Staff and attendance.
- Inventory.
- Expenses.
- Restaurant orders.
- Reports.
- User management.

All administrative routes require an authenticated session and the relevant server-side permission.

## Testing

The project uses Vitest and Supertest for API integration testing.

Before considering a build ready, run:

```bash
pnpm typecheck
pnpm build
pnpm typecheck:api
pnpm test:api
```

The API integration tests use the configured test database. Ensure that `DB_TEST_NAME` points to a separate test database and that its credentials are correct.

Do not run tests against production data.

## Production Deployment

Before deploying RIVR:

1. Configure production environment variables.
2. Use a strong session secret.
3. Enable secure cookies over HTTPS.
4. Configure the correct production frontend origin.
5. Disable development reset functionality.
6. Remove demo credentials and development-only accounts.
7. Run database migrations as a controlled deployment step.
8. Build the API and frontend.
9. Deploy the API and frontend behind an appropriately configured web server or reverse proxy.
10. Verify authentication, authorization, booking operations and database connectivity.

Build commands:

```bash
pnpm build:api
pnpm build
```

The API can be started using:

```bash
node apps/api/dist/server.js
```

Serve the frontend build with SPA fallback to `index.html`.

For session-cookie compatibility, serving the frontend and API behind the same origin is recommended.

## Important Development & Data Safety Notes

**Demo seed warning:** The `pnpm db:seed` command is destructive. It clears business tables and inserts demo data, including demo users and reservations. It can overwrite existing development business data.

Do not run it against a database containing records you want to preserve.

The built-in demo credentials are intended only for local development. Never use them in production.

The project does not automatically migrate historical browser `localStorage` records into MariaDB.

## Current Limitations

The following limitations are documented in the current project:

- No integrated online payment gateway. Payments are recorded by staff.
- No integrated email, SMS or calendar delivery provider.
- Single-property configuration.
- Hotel contact details are placeholder data and must be replaced before launch.
- Demo seed data is not a production data-import mechanism.
- No automatic migration of historical browser-storage data.
- Frontend bundle optimization and code splitting remain possible future improvements.

## Future Development

Potential areas for future development include:

- Online payment gateway integration.
- Automated email and SMS notifications.
- Multi-property hotel management.
- Advanced analytics and operational reporting.
- Improved performance through route-level code splitting.
- Expanded guest communication and service workflows.
- Further enhancements to the reservation experience.

These are development opportunities, not claims that the features are already implemented.

## Contributing

Contributions, suggestions and issue reports are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make focused changes.
4. Test your changes.
5. Submit a pull request with a clear description.

Please avoid committing secrets, environment files, personal information or production database records.

## License

No license is currently specified in this repository.

Unless a license is added, all rights remain with the copyright holder. Check the repository for licensing information before redistributing or reusing the project.

---

<p align="center">
  <strong>RIVR Hotel ERP</strong><br/>
  <em>Bringing hospitality operations into one connected platform.</em>
</p>

<p align="center">
  <a href="https://github.com/Trishit6/hotel-erp">GitHub Repository</a>
</p>