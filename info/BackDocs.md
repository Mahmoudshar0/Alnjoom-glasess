# OptiVision Backend

**Professional optical shop management system backend** — A production-ready Node.js API for managing customers, eye examinations, inventory, orders, invoicing, payments, employee accounts, financial reporting, and automated PostgreSQL backups.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Features](#features)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Database](#database)
- [Error Handling](#error-handling)
- [Security](#security)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Tech Stack

| Category              | Technology                          |
|-----------------------|-------------------------------------|
| Runtime               | Node.js                             |
| Framework             | Express.js 4                        |
| Language              | TypeScript 5                        |
| Database              | PostgreSQL                          |
| ORM                   | Prisma 7                            |
| Authentication        | JWT (jsonwebtoken)                  |
| Password Hashing      | bcryptjs                            |
| Validation            | Zod                                 |
| File Uploads          | Multer                              |
| CORS                  | cors                                |
| Dev Server            | ts-node-dev                         |

---

## Project Architecture

OptiVision follows a clean layered architecture with separation of concerns:

```
backend/
├── src/
│   ├── index.ts                 # Express app entry point + global error handler
│   ├── routes/                  # API route handlers
│   │   ├── auth.ts
│   │   ├── customers.ts
│   │   ├── examinations.ts
│   │   ├── inventory.ts
│   │   ├── orders.ts
│   │   ├── invoices.ts
│   │   ├── employees.ts
│   │   ├── reports.ts
│   │   └── backup.ts
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication middleware
│   │   └── role.ts              # Role-based access control (ADMIN only)
│   └── lib/
│       └── prisma.ts            # Prisma client singleton
├── prisma/
│   ├── schema.prisma            # Database schema + enums + relations
│   ├── seed.ts                  # Initial admin/employee seed data
│   └── migrations/              # Prisma migration history
├── backups/                     # Auto-generated .sql backup files
├── scripts/
│   ├── backup.sh
│   └── restore.sh
├── package.json
├── tsconfig.json
└── .env
```

**Design Patterns Used:**
- Middleware pattern for authentication and authorization
- Repository pattern via Prisma models
- Transactional operations for data consistency (orders, invoices)
- Singleton Prisma client
- Role-based access control (RBAC)

---

## Features

- **Authentication**: JWT-based login with 8-hour token expiry
- **Customer Management**: CRUD + search by name/phone, full history view
- **Eye Examinations**: Store detailed prescriptions (SPH, CYL, AXIS, ADD, IPD, height)
- **Inventory Management**: Frames, Lenses, Accessories with SKU generation and duplicate prevention
- **Orders**: Create orders linked to customers/examinations, automatic inventory deduction
- **Invoicing**: Group multiple orders into invoices, track payments, partial payments supported
- **Payments History**: Full audit trail of all payments per invoice
- **Employee Management**: Admin-only user creation with role assignment (ADMIN/EMPLOYEE)
- **Reports & Analytics**: Customer financial summary, dashboard KPIs, monthly trends, low-stock alerts
- **Financial Reports**: Revenue, outstanding balances, recent activity (ADMIN only)
- **Automated Backups**: Scheduled PostgreSQL dumps (daily/weekly/monthly) with retention policy
- **Manual Backup/Restore**: Full backup, download, and point-in-time restore via UI or API
- **SKU Generator**: Automatic SKU generation with collision avoidance
- **Global Error Handling**: Prisma-specific error translation to user-friendly messages

---

## Installation

```bash
git clone <repository-url>
cd backend
npm install
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/optivision
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3001
```

| Variable        | Purpose                        | Example                                      | Required |
|-----------------|--------------------------------|----------------------------------------------|----------|
| `DATABASE_URL`  | PostgreSQL connection string   | `postgresql://user:pass@host:5432/dbname`    | Yes      |
| `JWT_SECRET`    | Secret for signing JWT tokens  | `optivision-secret-12667-15422`              | Yes      |
| `PORT`          | Server port                    | `3001`                                       | No (defaults to 3001) |

---

## Running the Project

### Development

```bash
npm run dev
```

Starts the server with hot-reload using `ts-node-dev`.

### Production

```bash
npm run build
npm start
```

### Database Commands

```bash
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed initial admin/employee accounts
npm run db:studio    # Open Prisma Studio GUI
```

Default seeded credentials:
- Admin: `admin@optivision.com` / `admin123`
- Employee: `staff@optivision.com` / `employee123`

---

## API Documentation

All routes are prefixed with `/api`.

### Health Check

`GET /api/health` — Returns `{ status: "ok", version: "1.0.0" }`

---

### Authentication

#### POST `/api/auth/login`

**Description**: Authenticate user and return JWT token + user info.

**Request Body**:
```json
{
  "email": "admin@optivision.com",
  "password": "admin123"
}
```

**Response (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clx...",
    "name": "Admin User",
    "email": "admin@optivision.com",
    "role": "ADMIN"
  }
}
```

**Status Codes**: 200, 400, 401

---

#### GET `/api/auth/me`

**Auth Required**: Yes  
Returns current authenticated user.

---

#### POST `/api/auth/change-password`

**Auth Required**: Yes  
Body: `{ currentPassword, newPassword }`

---

### Customers

All routes require authentication.

| Method | Endpoint                                    | Description                                        |
|--------|---------------------------------------------|----------------------------------------------------|
| GET    | `/api/customers`                            | List customers (search via `?q=`); includes `parent` info |
| GET    | `/api/customers/:id`                        | Get customer with full history, `parent`, and `children` |
| POST   | `/api/customers`                            | Create customer (`phone` optional, accepts `parentId`) |
| PUT    | `/api/customers/:id`                        | Update customer                                    |
| DELETE | `/api/customers/:id`                        | Delete customer                                    |
| POST   | `/api/customers/:id/children`               | Link an existing customer as a family member       |
| DELETE | `/api/customers/:id/children/:childId`      | Unlink a family member (does not delete the customer) |

**Family member linking rules:**
- A customer can have one parent and multiple children.
- `POST /:id/children` body: `{ childId: string }` — sets `childId.parentId = id`.
- `DELETE /:id/children/:childId` — sets `childId.parentId = null`.
- A customer cannot be linked to itself.
- Phone is optional when creating a child customer (children may share a parent's phone or have none).

---

### Examinations

All routes require authentication.

| Method | Endpoint                                      | Description                     |
|--------|-----------------------------------------------|---------------------------------|
| GET    | `/api/examinations`                           | List examinations (search, limit 200) |
| GET    | `/api/examinations/customer/:customerId`      | Examinations for a customer     |
| GET    | `/api/examinations/:id`                       | Get single examination          |
| POST   | `/api/examinations`                           | Create examination              |
| PUT    | `/api/examinations/:id`                       | Update examination              |
| DELETE | `/api/examinations/:id`                       | Delete examination              |

---

### Inventory

All routes require authentication.

| Method | Endpoint                              | Description                              |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/api/inventory`                      | List items (`?type=FRAME& q=rayban`)     |
| GET    | `/api/inventory/check-sku`            | Check SKU availability                   |
| GET    | `/api/inventory/generate-sku`         | Generate next SKU for type               |
| GET    | `/api/inventory/:id`                  | Get single item                          |
| POST   | `/api/inventory`                      | Create item (SKU must be unique)         |
| PUT    | `/api/inventory/:id`                  | Update item                              |
| DELETE | `/api/inventory/:id`                  | Delete item                              |

---

### Orders

All routes require authentication.

| Method | Endpoint                     | Description                                      |
|--------|------------------------------|--------------------------------------------------|
| GET    | `/api/orders`                | List orders (filter by `status`, `customerId`)   |
| GET    | `/api/orders/:id`            | Get order with items and invoice                 |
| POST   | `/api/orders`                | Create order + deduct inventory                  |
| PUT    | `/api/orders/:id`            | Update order + restore/re-deduct inventory       |
| PATCH  | `/api/orders/:id/status`     | Update order status only                         |
| DELETE | `/api/orders/:id`            | Delete order + restore inventory                 |

---

### Invoices

All routes require authentication.

| Method | Endpoint                          | Description                                      |
|--------|-----------------------------------|--------------------------------------------------|
| GET    | `/api/invoices`                   | List invoices (filters: status, customerId, dates) |
| GET    | `/api/invoices/:id`               | Get invoice with orders, items, payments         |
| POST   | `/api/invoices`                   | Create invoice from multiple orders              |
| POST   | `/api/invoices/:id/payments`      | Record additional payment                        |
| PUT    | `/api/invoices/:id`               | Update invoice fields (see below)                |
| DELETE | `/api/invoices/:id`               | Delete invoice + unlink orders                   |

**PUT `/api/invoices/:id` — accepted fields:**

| Field           | Type    | Notes                                                                 |
|-----------------|---------|-----------------------------------------------------------------------|
| `paymentMethod` | string  | Optional. Send empty string to clear.                                 |
| `notes`         | string  | Optional. Send empty string to clear.                                 |
| `totalAmount`   | number  | Optional. Direct override (e.g. for discounts or corrections).        |
| `paidAmount`    | number  | Optional. Direct override — does **not** add a payment history record.|
| `status`        | enum    | Optional (`UNPAID` / `PARTIAL` / `PAID`). If omitted, status is auto-derived from the resulting `totalAmount` and `paidAmount`. |

**Status auto-calculation rule** (applied when `status` is not sent):
- `paidAmount >= totalAmount` → `PAID`
- `paidAmount > 0` → `PARTIAL`
- otherwise → `UNPAID`

---

### Employees (Admin Only)

All routes require `ADMIN` role.

| Method | Endpoint               | Description                     |
|--------|------------------------|---------------------------------|
| GET    | `/api/employees`       | List all users                  |
| POST   | `/api/employees`       | Create new user                 |
| PUT    | `/api/employees/:id`   | Update user (including password)|
| DELETE | `/api/employees/:id`   | Delete user (cannot delete self)|

---

### Reports

All routes require authentication.

- `GET /api/reports/summary` — Dashboard KPIs (customers, orders, revenue, low stock, recent orders)
- `GET /api/reports/customer/:customerId` — Full customer financial + clinical history
- `GET /api/reports/financial` — Revenue, outstanding, recent invoices (**ADMIN only**)

---

### Backup & Restore (Admin Only)

All routes require `ADMIN` role.

| Method | Endpoint                              | Description                              |
|--------|---------------------------------------|------------------------------------------|
| POST   | `/api/backup/create`                  | Create manual backup                     |
| GET    | `/api/backup/list`                    | List all backup files                    |
| GET    | `/api/backup/download/:filename`      | Download specific backup                 |
| GET    | `/api/backup/download/latest`         | Download most recent backup              |
| POST   | `/api/backup/restore/:filename`       | Restore from existing backup             |
| POST   | `/api/backup/restore-upload`          | Upload and restore `.sql` file           |
| DELETE | `/api/backup/:filename`               | Delete backup file                       |
| GET    | `/api/backup/settings`                | Get auto-backup settings                 |
| PUT    | `/api/backup/settings`                | Update auto-backup config                |

**Auto-backup** runs on server start based on settings (`daily`/`weekly`/`monthly`).

---

## Authentication & Authorization

- JWT tokens are issued on login and expire after **8 hours**.
- All protected routes require `Authorization: Bearer <token>` header.
- Role-based access:
  - `EMPLOYEE`: Full access to customers, orders, inventory, invoices, reports
  - `ADMIN`: Everything above + employee management + financial reports + backup/restore

Middleware flow:
1. `authenticate` — validates JWT and attaches user to request
2. `requireRole('ADMIN')` — blocks non-admin users (403)

---

## Database

- **Provider**: PostgreSQL
- **ORM**: Prisma
- **Key Models**: `User`, `Customer`, `Examination`, `InventoryItem`, `Order`, `OrderItem`, `Invoice`, `Payment`
- **Enums**: `Role`, `OrderStatus`, `InvoiceStatus`, `ItemType`
- **Relationships**: Full cascading deletes on critical paths (Order → OrderItem, Invoice → Payment)

**Customer self-referential family relation:**
```prisma
model Customer {
  parentId  String?
  parent    Customer?  @relation("CustomerFamily", fields: [parentId], references: [id])
  children  Customer[] @relation("CustomerFamily")
}
```
`parentId` is nullable — existing customers are unaffected. Applied via `prisma db push` (non-destructive).

### Prisma Workflow

```bash
npx prisma migrate dev          # Create and apply migration
npx prisma generate             # Regenerate Prisma Client after schema changes
npx prisma studio               # Visual database browser
npm run db:seed                 # Seed initial users
```

---

## Error Handling

Global error middleware in `src/index.ts:34` catches:
- `P2002` → 409 (unique constraint violation — SKU already exists)
- `P2003` → 400 (foreign key constraint)
- `P2025` → 404 (record not found)
- All other errors → 500 with generic message

Validation errors from Zod return `400` with detailed issues array.

---

## Security

- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens signed with strong secret
- CORS enabled (`origin: '*'`)
- Role-based authorization middleware
- Zod schema validation on all inputs
- Prisma handles SQL injection prevention
- Backup/restore restricted to ADMIN role only

---

## Scripts

| Script            | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Start development server with hot reload |
| `npm run build`   | Compile TypeScript to `dist/`            |
| `npm start`       | Start production server                  |
| `npm run db:migrate` | Run Prisma migrations                 |
| `npm run db:seed` | Seed initial admin/employee accounts     |
| `npm run db:studio` | Open Prisma Studio                     |

---

## Deployment

The application runs on any Node.js environment with PostgreSQL access.

**Recommended production setup**:
1. Set strong `JWT_SECRET`
2. Use a managed PostgreSQL database
3. Run `npm run build` and start with `npm start`
4. Keep `pg_dump` / `psql` available for backup features (Windows: usually in `C:\Program Files\PostgreSQL\<version>\bin`)

PM2 or Docker can be used for process management.

---

## Troubleshooting

### Prisma Client Not Found
```bash
npx prisma generate
```

### Backup/Restore Fails on Windows
Ensure PostgreSQL `bin` folder is in PATH or the app will auto-detect it in `C:\Program Files\PostgreSQL`.

### SKU Already Exists Error
Use the `/api/inventory/generate-sku` endpoint or choose a different SKU.

### Token Expired
Re-login to obtain a new JWT (tokens expire after 8 hours).

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types and Zod validation
4. Test thoroughly
5. Submit a pull request

---

## License

Proprietary — All rights reserved.

---

## Author

Built for OptiVision optical shop management system.
