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
| Feature | OWASP Category | Detail |
|---|---|---|
| Rate limiting | A07 | `/auth/login`, `/auth/register`, `/auth/refresh` capped at 10 req / 15 min per IP |
| Helmet.js | A05 | 15+ security HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| Refresh tokens | A07 | 15-min access token + 7-day rotating refresh token in HttpOnly cookie |
| Refresh token hashing | A02 | Refresh token stored as bcrypt hash (cost 12) in DB — not plaintext |
| Audit log | A09 | Every create/update/delete stored in `AuditLogs` with old/new values as JSON |
| Password policy | A07 | Min 8, max 128 chars — requires lowercase, uppercase, number, special character |
| Live password checklist | A07 | Real-time per-rule feedback on register form (green/red indicators) |
| File validation | A04 | CSV-only, max 5 MB, max 5,000 rows, per-row validation with error report |
| Soft delete | A04 | Subnets and IPs marked `DeletedAt` — data retained for audit, invisible to API |
| CORS | A05 | Restricted to configured frontend origin |
| Parameterized queries | A03 | All SQL uses `mysql2` prepared statements — no string interpolation, no SQL injection |
| IDOR protection | A01 | Users can only edit/delete their own subnets and IPs — admins bypass |
| Ownership checks | A01 | Every mutating operation verifies `CreatedBy === userId` before proceeding |
| Env var validation | A05 | App fails at startup if `JWT_SECRET`, `DB_PASSWORD`, etc. are missing or too short |
| CSV row cap | A04 | Upload limited to 5,000 rows to prevent DoS via resource exhaustion |

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
mysql -u root -p < backend/database/schema.sql

# Optional: load seed data (two demo accounts, password: Admin@123)
mysql -u root -p < backend/database/seed.sql
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
│   ├── database/
│   │   ├── schema.sql     # DDL for all tables
│   │   └── seed.sql       # Optional demo data
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
└── README.md
```

---

## Security Notes

### OWASP Top 10 Coverage

| OWASP | Risk | How it's addressed |
|---|---|---|
| A01 | Broken Access Control | IDOR checks — users can only mutate their own records; admins bypass |
| A02 | Cryptographic Failures | bcrypt (cost 12) for passwords and refresh tokens; strong JWT secrets validated at boot |
| A03 | Injection | All queries use parameterized statements — no raw SQL interpolation |
| A04 | Insecure Design | CSV row cap (5,000), file size cap (5 MB), soft delete with audit trail |
| A05 | Security Misconfiguration | Helmet.js headers, strict CORS, env var validation at startup |
| A07 | Auth & Session Failures | Short-lived JWTs (15 min), rotating refresh tokens, rate limiting, strong password policy |
| A09 | Logging & Monitoring | `AuditLogs` table records every write with user, timestamp, old/new values |

### Known Considerations

- **Refresh token rotation** — stored as a bcrypt hash in the `Users` table. Logging out invalidates all sessions for that user (single active session per user by design).
- **Soft deletes** — records with `DeletedAt IS NOT NULL` are excluded from all queries but remain in the database for audit purposes.
- **IP range validation** — when adding an IP, the API verifies the IP belongs to the parent subnet's CIDR block.
- **Rate limiting** is in-memory (per process). For multi-process deployments, replace with a Redis-backed store (e.g. `rate-limit-redis`).
- **LIMIT/OFFSET** — pagination values are validated integers inlined into SQL (not parameterized) due to a mysql2 v3 prepared-statement type constraint. User input still goes through `?` placeholders.
