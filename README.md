# Pawsitive POS — Pet Shop Business Software

A full-stack business management system for a pet shop: point-of-sale checkout,
inventory & purchasing, customer & pet records, and grooming/vet appointment
scheduling, with a role-based dashboard.

## Features

- **Auth & roles** — JWT login with `ADMIN`, `MANAGER`, and `STAFF` roles; permissions
  are enforced on the API (e.g. only admins/managers can edit inventory or delete records).
- **Dashboard** — today's & month-to-date revenue, low-stock alerts, inventory value,
  upcoming appointments, and recent sales at a glance.
- **Point of Sale (POS)** — search products, build a cart, apply a discount, choose a
  payment method, and check out. Stock is decremented atomically and a `StockMovement`
  audit trail is recorded. Sales can be voided (auto-restocks items).
- **Inventory** — products with SKU, cost/sell price, category, supplier, reorder level,
  and manual stock adjustments (with reasons).
- **Customers & Pets** — customer directory with one-to-many pets (species, breed, sex,
  weight, notes), sale/appointment history per customer.
- **Appointments** — book grooming/vet visits for a specific pet & service, assign staff,
  and track status (scheduled → confirmed → completed / cancelled / no-show).
- **Services** — configurable bookable services (grooming, vaccination, etc.) with price
  and duration.
- **Suppliers & Purchase Orders** — vendor directory and PO workflow
  (draft → ordered → received), where marking a PO "received" increments stock for every
  line item automatically.

## Tech Stack

| Layer     | Choice |
|-----------|--------|
| Backend   | Node.js, Express, TypeScript, Prisma ORM, SQLite (zero-config; swap to Postgres for prod) |
| Auth      | JWT (bcrypt-hashed passwords) |
| Validation| Zod |
| Frontend  | React 19, TypeScript, Vite, React Router, Tailwind CSS v4, Axios |

## Project Structure

```
server/          Express API
  prisma/        schema.prisma, migrations, seed.ts
  src/
    routes/      one file per resource (auth, products, sales, appointments, ...)
    middleware/  requireAuth, requireRole, error handler
    utils/       jwt helpers, typed HTTP errors
    index.ts     app entry
client/          React app (Vite)
  src/
    api/         axios client with auth interceptor
    context/     AuthContext (login/register/logout, session restore)
    components/  Layout (sidebar nav), reusable UI primitives, ProtectedRoute
    pages/       Dashboard, POS, SalesHistory, Products, Customers, Appointments,
                 Services, Suppliers, PurchaseOrders
    types.ts     shared TS types mirroring the API shapes
```

## Getting Started

Requires Node.js 18+.

### 1. Backend API

```bash
cd server
cp .env.example .env      # defaults work out of the box (SQLite file db)
npm install
npx prisma migrate dev    # creates dev.db and applies the schema
npm run seed              # demo users, products, customers, pets, sales, appointments
npm run dev                # http://localhost:4000
```

Demo logins (password for all: `password123`):

| Email | Role |
|-------|------|
| admin@petshop.test | ADMIN |
| manager@petshop.test | MANAGER |
| staff@petshop.test | STAFF |

### 2. Frontend

```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000`, so just open
`http://localhost:5173` and log in — no CORS setup needed in development.

### Production build

```bash
# server
cd server && npm run build && npm start

# client
cd client && npm run build   # outputs static assets to client/dist
```

Serve `client/dist` with any static host (or behind the same reverse proxy as the API),
and point the client at the API's real origin (update `CLIENT_ORIGIN` in `server/.env`
and adjust the client's API base URL / proxy for your deployment).

## Notes on the data model

- SQLite doesn't support native enums, so fields that are conceptually enums
  (`role`, `status`, `paymentMethod`, etc.) are plain `String` columns validated with
  Zod at the API boundary — see the comment block at the top of `server/prisma/schema.prisma`
  for the allowed values of each. Swapping the datasource to PostgreSQL is a drop-in
  change if you want real DB-level enums later.
- Money-moving actions (POS checkout, sale void, purchase-order receiving, manual stock
  adjustments) run inside Prisma transactions so inventory counts and the
  `StockMovement` audit log never drift out of sync.
- The very first account ever registered via `POST /api/auth/register` becomes an
  `ADMIN` automatically; after that, registration is closed and new users must be
  created by an admin via `POST /api/users`.
