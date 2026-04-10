# Subnet Management System

A full-stack web application for managing subnets and their associated IP addresses.

**Stack:** Node.js (TypeScript) · Express · MySQL 8 · React (TypeScript) · Vite · Tailwind CSS

---

## Features

### Core
- **Authentication** — JWT-based register/login with protected routes
- **Subnet CRUD** — create, list, update, delete subnets with CIDR validation
- **IP CRUD** — manage IP addresses per subnet with format and range validation
- **CSV File Upload** — bulk-import subnets and IPs from a CSV file
- **Pagination** — server-side pagination on all list views
- **Search & Filter** — search subnets by name/address, filter IPs by address

### Security Bonuses
| Feature | Detail |
|---|---|
| Rate limiting | `/auth/login` and `/auth/register` capped at 10 req / 15 min per IP |
| Helmet.js | 15+ security HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| Refresh tokens | 15-min access token + 7-day rotating refresh token in HttpOnly cookie |
| Audit log | Every create/update/delete stored in `AuditLogs` with old/new values as JSON |
| Password policy | Min 8 chars, uppercase + number + special character required |
| File validation | CSV-only, max 5 MB, per-row validation with error report |
| Soft delete | Subnets and IPs are marked `DeletedAt`, never physically removed |
| CORS | Restricted to configured frontend origin |
| Parameterized queries | All SQL uses `mysql2` prepared statements — no raw string interpolation |

### UX Bonuses
- **Subnet IP calculator** — network/broadcast/first/last usable host info shown on IP list page
- **Upload error report** — per-row success/skip/error breakdown after CSV upload
- **Export to CSV** — download current subnet or IP list as a CSV file

---

## Prerequisites

- Node.js ≥ 18
- MySQL 8.0+
- npm ≥ 9

---

## Database Setup

```bash
# Connect to MySQL and run the schema script
mysql -u root -p < database/schema.sql

# Optional: load seed data (two demo accounts, password: Admin@123)
mysql -u root -p < database/seed.sql
```

> MySQL version used during development: **8.0**

---

## Backend

### Configuration

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=subnet_management
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

> Generate secrets with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Run (development)

```bash
cd backend
npm install
npm run dev
```

API runs at `http://localhost:3000`

### Build & run (production)

```bash
npm run build
npm start
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` (proxies `/api` to the backend automatically).

### Production build

```bash
npm run build
# Serve the dist/ folder with any static file server
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Log in, returns access token |
| POST | `/api/auth/refresh` | cookie | Rotate access token using refresh token |
| POST | `/api/auth/logout` | Bearer | Invalidate refresh token |

### Subnets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/subnets` | Bearer | List subnets (paginated, searchable) |
| POST | `/api/subnets` | Bearer | Create a subnet |
| GET | `/api/subnets/:id` | Bearer | Get subnet + network info |
| PUT | `/api/subnets/:id` | Bearer | Update a subnet |
| DELETE | `/api/subnets/:id` | Bearer | Soft-delete a subnet |

### IPs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/subnets/:subnetId/ips` | Bearer | List IPs (paginated, searchable) |
| POST | `/api/subnets/:subnetId/ips` | Bearer | Add an IP to a subnet |
| PUT | `/api/subnets/:subnetId/ips/:ipId` | Bearer | Update an IP |
| DELETE | `/api/subnets/:subnetId/ips/:ipId` | Bearer | Soft-delete an IP |

### Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload` | Bearer | Upload a CSV file (multipart/form-data, field: `file`) |

**Query parameters** (GET list endpoints): `page`, `limit`, `search`

---

## CSV Upload Format

```csv
SubnetName,SubnetAddress,IpAddress
Office LAN,192.168.1.0/24,192.168.1.10
Office LAN,192.168.1.0/24,192.168.1.11
DMZ,10.0.0.0/28,
```

- `SubnetName` — optional if subnet already exists
- `SubnetAddress` — required, must be valid CIDR notation
- `IpAddress` — optional; if provided, must be a valid IPv4 that belongs to the subnet

---

## Project Structure

```
subnet-management/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, validation
│   │   ├── routes/        # Express routers
│   │   ├── types/         # Shared TypeScript types
│   │   ├── utils/         # DB pool, audit logger, network helpers
│   │   └── app.ts         # Express app entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios calls per resource
│   │   ├── components/    # Shared UI (Modal, Pagination, Navbar, ProtectedRoute)
│   │   ├── context/       # AuthContext (user state, login/logout)
│   │   ├── pages/         # AuthPage, SubnetListPage, IPListPage, UploadPage
│   │   ├── types/         # Shared TypeScript types
│   │   └── App.tsx        # Router + providers
│   ├── package.json
│   └── vite.config.ts
├── database/
│   ├── schema.sql         # DDL for all tables
│   └── seed.sql           # Optional demo data
└── README.md
```

---

## Known Considerations

- **Refresh token rotation** — the refresh token is hashed with bcrypt and stored in the `Users` table. Logging out from one device invalidates all sessions for that user (single active session per user by design).
- **Soft deletes** — records with `DeletedAt IS NOT NULL` are excluded from all queries but remain in the database for audit purposes.
- **IP range validation** — when adding an IP, the API verifies the IP belongs to the parent subnet's CIDR block.
- **Rate limiting** is in-memory (per process). For multi-process deployments, replace with a Redis-backed store (e.g. `rate-limit-redis`).
