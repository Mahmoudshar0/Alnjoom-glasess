# OptiVision — Complete Technical Documentation

---

# 1. EXECUTIVE SUMMARY

## Project Name
**OptiVision** — Optical Shop Management System

## Purpose
OptiVision is a full-stack web application for managing optical shop operations including customer management, eye examinations, order processing, inventory management, invoicing, payments, reporting, and automated database backups.

## Business Problem
Optical shops need a unified system to:
- Track customer profiles with family relationships
- Record detailed eye examination prescriptions (SPH/CYL/AXIS/ADD/IPD)
- Manage orders linking customers, examinations, and inventory items
- Generate invoices from orders with partial/full payment tracking
- Monitor inventory (frames, lenses, accessories) with stock alerts
- Access financial reports and collection analytics
- Maintain data integrity via automated backups

## Target Users
| Role | Access Level |
|------|--------------|
| **Administrator** | Full system access: employee management, financial reports, backup/restore, all CRUD operations |
| **Employee (Staff)** | Customer management, examinations, orders, invoices, inventory, reports (read-only financials) |

## Main Capabilities
1. **Customer Management** — CRUD, search, family linking (parent/child)
2. **Examinations** — Full prescription entry (OD/OS SPH, CYL, AXIS, ADD, IPD, Height)
3. **Orders** — Multi-item orders linked to customer + examination + inventory; status workflow (NEW → IN_PROGRESS → READY → DELIVERED); searchable customer combobox
4. **Invoices** — Generated from uninvoiced orders, detailed payment history per installment (date, method, notes, amount), printable A4 format; searchable customer combobox
5. **Inventory** — Frames, Lenses, Accessories with type-specific fields, SKU auto-generation, stock alerts
6. **Reports** — Dashboard summary, customer history, financial analytics (Admin), **Staff Performance analytics** (Admin)
7. **Employee Management** — User CRUD, role assignment, activation (Admin only)
8. **Backup & Restore** — pg_dump/psql-based, scheduled auto-backups, browser upload restore (Admin only)
9. **Search** — Real-time client-side search bars on Orders and Invoices pages; searchable combobox dropdowns on all customer-selection modals

## High-Level Architecture
```
┌─────────────────┐     HTTPS/REST      ┌─────────────────┐
│   React 18      │ ◄─────────────────► │  Express + TS   │
│   Frontend      │   JWT Auth (8h)     │  Backend API    │
│   (Vite)        │                     │  (Port 3001)    │
└─────────────────┘                     └────────┬────────┘
                                                  │
                                                  │ Prisma ORM
                                                  ▼
                                         ┌─────────────────┐
                                         │  PostgreSQL     │
                                         │  (Port 5432)    │
                                         └─────────────────┘
```

---

# 2. PROJECT OVERVIEW

## System Description
OptiVision is a production-grade optical shop management system built as a **full-stack TypeScript application**. The frontend is a React 18 SPA using Vite, Tailwind CSS, TanStack Query (React Query), and React Hook Form with Zod validation. The backend is an Express.js REST API with Prisma ORM connecting to PostgreSQL. Authentication uses JWT tokens (8-hour expiry) with role-based access control (ADMIN/EMPLOYEE).

The system models the complete optical shop workflow: Customers → Examinations → Orders → Invoices → Payments, with Inventory as a shared resource. Family relationships allow linking customers (e.g., parents/children). Automated database backups run via pg_dump with configurable frequency and retention.

## Core Concepts
| Concept | Description |
|---------|-------------|
| **Customer** | Person with profile (name, phone, email, DOB, address, notes) + optional parent link |
| **Examination** | Eye prescription record linked to customer with OD/OS measurements |
| **Order** | Sales order linking customer, optional examination, items (inventory or custom), status workflow |
| **Invoice** | Bill generated from one or more uninvoiced orders; tracks total/paid amounts, status, payment method |
| **Payment** | Partial/full payment record against an invoice with method, date, notes |
| **InventoryItem** | Stock item: FRAME, LENS, or ACCESSORY with type-specific attributes |
| **User** | System login account with role (ADMIN/EMPLOYEE) |

## User Roles
| Role | Permissions |
|------|-------------|
| **ADMIN** | All employee permissions + Employee Management, Financial Reports, Backup/Restore, Invoice amount/status override |
| **EMPLOYEE** | Customers, Examinations, Orders, Invoices (create/pay/print), Inventory, Reports (dashboard), Settings (own password) |

---

# 3. TECHNOLOGY STACK

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Framework** | React 18 + Vite | SPA, fast HMR, modern bundling |
| **Language** | TypeScript | Type safety across stack |
| **Styling** | Tailwind CSS | Utility-first responsive UI |
| **State Management** | TanStack Query (React Query) | Server state, caching, mutations |
| **Forms** | React Hook Form + Zod | Validation, type-safe forms |
| **Routing** | React Router v6 | Client-side routing, protected routes |
| **Icons** | Lucide React | Consistent icon set |
| **Date/Number Format** | Custom utilities | KWD currency (3 decimals), locale dates |
| **Excel Export** | xlsx / xlsx-js-style | Period collective reports |
| **Backend Runtime** | Node.js + Express | REST API server |
| **Language** | TypeScript | Shared types with frontend |
| **ORM** | Prisma + PrismaPg adapter | Type-safe database access |
| **Database** | PostgreSQL 14+ | Relational data store |
| **Auth** | JWT (jsonwebtoken) + bcryptjs | Stateless auth, password hashing |
| **Validation** | Zod | Schema validation (shared with frontend) |
| **File Upload** | Multer | Backup file uploads |
| **Process Mgmt** | PM2 (ecosystem.config.js) | Production process management |
| **Backup** | pg_dump / psql | Native PostgreSQL backup/restore |
| **Package Manager** | npm | Dependency management |

---

# 4. PROJECT STRUCTURE

```
Eye-shop-mahmoudRepo/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Express app entry, routes, error handler, auto-backup init
│   │   ├── lib/
│   │   │   └── prisma.ts            # PrismaClient singleton with PrismaPg adapter
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verification → req.user
│   │   │   └── role.ts              # requireRole('ADMIN') guard
│   │   └── routes/
│   │       ├── auth.ts              # POST /login, GET /me, POST /change-password
│   │       ├── customers.ts         # CRUD + family linking
│   │       ├── examinations.ts      # CRUD + customer-filtered list
│   │       ├── inventory.ts         # CRUD + SKU check/generate
│   │       ├── orders.ts            # CRUD + status + inventory sync
│   │       ├── invoices.ts          # CRUD + payments + order linking
│   │       ├── employees.ts         # Admin-only user CRUD
│   │       ├── reports.ts           # Summary, customer, financial (admin), staff performance (admin)
│   │       └── backup.ts            # Backup/restore + auto-scheduler
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema (see §8)
│   │   ├── seed.ts                  # Admin user seed
│   │   └── migrations/              # Prisma migration history
│   ├── scripts/
│   │   ├── backup.sh                # CLI backup script
│   │   └── restore.sh               # CLI restore script
│   ├── backups/                     # Auto/manually created .sql files
│   ├── .env                         # DATABASE_URL, JWT_SECRET, PORT
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx                 # React root
│   │   ├── App.tsx                  # Routes + AdminRoute guard
│   │   ├── index.css                # Tailwind imports
│   │   ├── api/
│   │   │   ├── client.ts            # Axios instance + auth interceptor
│   │   │   ├── auth.ts              # login, getMe
│   │   │   ├── customers.ts         # CRUD + family + report
│   │   │   ├── examinations.ts
│   │   │   ├── inventory.ts         # CRUD + SKU check/generate
│   │   │   ├── orders.ts
│   │   │   ├── invoices.ts
│   │   │   ├── employees.ts
│   │   │   ├── reports.ts
│   │   │   └── backup.ts
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Input, Select, Modal, Card, Badge, LoadingSpinner, SearchableSelect
│   │   │   └── layout/              # Sidebar, Header, AppLayout
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # JWT storage, login/logout, role check
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── customers/
│   │   │   │   ├── CustomersList.tsx
│   │   │   │   └── CustomerProfile.tsx
│   │   │   ├── examinations/ExaminationsPage.tsx
│   │   │   ├── inventory/InventoryPage.tsx
│   │   │   ├── orders/OrdersPage.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── InvoicesPage.tsx
│   │   │   │   ├── InvoicePrint.tsx
│   │   │   │   └── PeriodCollectiveReport.tsx
│   │   │   ├── employees/EmployeesPage.tsx
│   │   │   ├── reports/
│   │   │   │   ├── ReportsPage.tsx
│   │   │   │   ├── FinancialReports.tsx
│   │   │   │   ├── StaffPerformance.tsx      # NEW — per-staff daily analytics
│   │   │   │   └── CustomerReport.tsx
│   │   │   ├── settings/SettingsPage.tsx
│   │   │   └── backup/BackupPage.tsx
│   │   ├── types/index.ts           # Shared TypeScript interfaces
│   │   └── utils/format.ts          # KWD formatting, date, signed numbers
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── start.bat                        # Windows launcher (starts both frontend/backend)
├── setup_v2.bat                     # First-time setup script
├── update.bat                       # Update script
├── ecosystem.config.js              # PM2 config
├── README.md
└── .gitignore
```

---

# 5. ARCHITECTURE ANALYSIS

## Architecture Pattern
**Layered Architecture** with clear separation:
- **Presentation Layer**: React components (pages, UI components, layout)
- **Application Layer**: React Query hooks, API client, AuthContext
- **API Layer**: Express routes (controllers) — thin, delegate to Prisma
- **Data Access Layer**: Prisma Client (repository pattern via Prisma)
- **Database Layer**: PostgreSQL

## Module Structure
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| **Auth** | Login, token management, password change | `auth.ts` (routes + middleware) |
| **Customers** | Profiles, search, family tree | `customers.ts` (routes + API) |
| **Examinations** | Prescription records | `examinations.ts` |
| **Orders** | Sales orders + inventory sync | `orders.ts` |
| **Invoices** | Billing + payments | `invoices.ts` |
| **Inventory** | Stock items + SKU management | `inventory.ts` |
| **Employees** | User management (admin) | `employees.ts` |
| **Reports** | Aggregated analytics | `reports.ts` |
| **Staff Performance** | Per-employee daily sales analytics (Admin) | `reports.ts`, `StaffPerformance.tsx` |
| **Backup** | pg_dump/psql automation | `backup.ts` |

## Service Structure
Each route file is a self-contained feature module:
- Imports Prisma client from `../lib/prisma`
- Uses `authenticate` middleware on all routes
- Uses `requireRole('ADMIN')` for admin-only routes
- Zod schemas for request validation
- Prisma transactions for multi-table operations
- Consistent error handling via global middleware

## Domain Structure
```
User (ADMIN/EMPLOYEE)
    │
    ├── Customer
    │     ├── Examination[] (1:N)
    │     ├── Order[] (1:N)
    │     ├── Invoice[] (1:N)
    │     └── Customer (parent/child) (self-ref)
    │
    ├── InventoryItem (FRAME/LENS/ACCESSORY)
    │     └── OrderItem[] (1:N)
    │
    ├── Order
    │     ├── OrderItem[] (1:N)
    │     ├── Invoice (N:1)
    │     └── Examination (N:1, optional)
    │
    ├── Invoice
    │     ├── Payment[] (1:N)
    │     └── Order[] (1:N, via invoiceId)
    │
    └── Payment (linked to Invoice)
```

## Text-Based Architecture Diagram
```text
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ React App    │  │ TanStack     │  │ Axios Client         │  │
│  │ (Pages/UI)   │──│ Query Cache  │──│ (JWT Interceptor)    │  │
│  └──────────────┘  └──────────────┘  └──────────┬───────────┘  │
└─────────────────────────────────────────────────│────────────────┘
                                                  │ HTTPS/REST + JWT
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS API (Port 3001)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ CORS     │ │ JSON     │ │ Auth MW  │ │ Global Error MW  │   │
│  │ Middleware│ │ Parser   │ │ (JWT)    │ │ (Prisma codes)   │   │
│  └──────────┘ └──────────┘ └────┬─────┘ └──────────────────┘   │
│                                 │                                 │
│  ┌────────┐ ┌────────┐ ┌────────┼────────┐ ┌────────┐ ┌────────┐│
│  │ Auth   │ │Customers│ │Exams   │Inventory│ │Orders  │ │Invoices││
│  │ Routes │ │ Routes │ │ Routes │ Routes  │ │ Routes │ │ Routes ││
│  └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘│
│       │          │          │          │          │          │    │
│  ┌────┴──────────┴──────────┴──────────┴──────────┴──────────┴───┐│
│  │                     PRISMA CLIENT (Singleton)                   ││
│  └────────────────────────────────┬────────────────────────────────┘│
└───────────────────────────────────│─────────────────────────────────┘
                                    │ PrismaPg Adapter
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                           │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│  │ User   │ │ Customer │ │Exam      │ │Inventory│ │ Order    │  │
│  └────────┘ └──────────┘ └──────────┘ └────────┘ └──────────┘  │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐              │
│  │Invoice │ │ Payment  │ │OrderItem │ │Backup  │ (files)      │
│  └────────┘ └──────────┘ └──────────┘ └────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

# 6. REQUEST LIFECYCLE

## Typical Authenticated Request Flow
```
User Action (e.g., Create Order)
        │
        ▼
Frontend: React Hook Form validates → TanStack Query mutation
        │
        ▼
API Client (axios): Adds Authorization: Bearer <JWT> header
        │
        ▼
HTTPS POST /api/orders
        │
        ▼
Express: CORS → JSON Parser → authenticate middleware
        │                         │
        │                         ▼
        │              JWT.verify(token, JWT_SECRET)
        │                         │
        │                         ▼
        │              req.user = { id, email, role }
        │                         │
        ▼                         ▼
Route Handler (orders.ts:58)     │
        │                         │
        ▼                         │
Zod Validation (orderSchema)     │
        │                         │
        ▼                         │
Prisma Transaction ($transaction) │
        │                         │
        ├─► tx.order.create()     │
        ├─► tx.orderItem.createMany() │
        └─► tx.inventoryItem.update() (decrement quantity)
        │
        ▼
Response: 201 Created + Order JSON
        │
        ▼
Frontend: QueryClient.invalidateQueries(['orders']) → Refetch
        │
        ▼
UI Updates
```

## Files Involved
| Step | File |
|------|------|
| Form & Mutation | `frontend/src/pages/orders/OrdersPage.tsx` |
| API Call | `frontend/src/api/orders.ts` → `createOrder()` |
| Axios Config | `frontend/src/api/client.ts` (interceptor) |
| Auth Middleware | `backend/src/middleware/auth.ts` |
| Route Handler | `backend/src/routes/orders.ts:58-91` |
| Validation Schema | `backend/src/routes/orders.ts:9-23` |
| Prisma Transaction | `backend/src/routes/orders.ts:64-89` |
| Global Error Handler | `backend/src/index.ts:34-46` |

---

# 7. FEATURE INVENTORY

## Feature: Customer Management

### Purpose
Manage customer profiles with contact info, family relationships, and complete history.

### User Role
All authenticated users

### Entry Point
`/customers` (CustomersList) → `/customers/:id` (CustomerProfile)

### Business Value
Central customer registry enabling order/exam linking, family grouping, and history tracking.

### Internal Flow
```
Customer List (search, paginate)
    │
    ├─► Create: POST /api/customers → validation → unique phone check → create
    ├─► Edit: PUT /api/customers/:id → validation → unique phone check → update
    ├─► Delete: DELETE /api/customers/:id → cascade delete exams/orders/invoices
    ├─► View Profile: GET /api/customers/:id → include exams, orders, invoices, family
    └─► Family: POST/DELETE /api/customers/:id/children → link/unlink existing customers
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend Pages | `CustomersList.tsx`, `CustomerProfile.tsx` |
| API Client | `frontend/src/api/customers.ts` |
| Backend Routes | `backend/src/routes/customers.ts` |
| Types | `frontend/src/types/index.ts` (Customer, FamilyMember) |

### Database Tables
`Customer` (self-referencing parentId), `Examination`, `Order`, `Invoice`

### APIs Used
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List with search, counts |
| GET | `/api/customers/:id` | Full profile with relations |
| POST | `/api/customers` | Create |
| PUT | `/api/customers/:id` | Update |
| DELETE | `/api/customers/:id` | Delete |
| POST | `/api/customers/:id/children` | Link child |
| DELETE | `/api/customers/:id/children/:childId` | Unlink child |

### Validation Rules
- Name required
- Phone required, unique across customers
- Email optional, valid format
- ParentId must exist, cannot create circular reference

### Security Rules
- All endpoints require JWT authentication
- No role restriction (both ADMIN/EMPLOYEE)

### Edge Cases
- Deleting customer cascades to examinations, orders, invoices
- Family linking prevents circular references
- Phone uniqueness checked on create/update (excludes current record)

### Flow Diagram
```text
User
 │
 ├─► /customers → Search/Table
 │     │
 │     ├─► [Add] → Modal → POST /api/customers → Refresh
 │     ├─► [Edit] → Modal → PUT /api/customers/:id → Refresh
 │     ├─► [Delete] → Confirm → DELETE → Refresh
 │     └─► [View] → /customers/:id
 │
 └─► /customers/:id → Profile
       │
       ├─► Exams Tab → List/Add/Edit/Delete
       ├─► Orders Tab → List (expandable)
       ├─► Invoices Tab → List with payments
       └─► Family Tab → Parent link + Children list + Add (Link Existing / Create New)
```

---

## Feature: Examinations

### Purpose
Record and manage eye examination prescriptions for customers.

### User Role
All authenticated users

### Entry Point
Customer Profile → Examinations section → Add/Edit/Delete

### Business Value
Clinical prescription storage enabling order creation with correct lens specifications.

### Internal Flow
```
GET /api/examinations?customerId=:id → List for customer
POST /api/examinations → Create (customerId required)
PUT /api/examinations/:id → Update
DELETE /api/examinations/:id → Delete
GET /api/examinations → Global search (name/phone) + pagination (200)
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend | `CustomerProfile.tsx` (exam modal), `ExaminationsPage.tsx` |
| API Client | `frontend/src/api/examinations.ts` |
| Backend | `backend/src/routes/examinations.ts` |

### Database Tables
`Examination` (linked to Customer, optional Order)

### Validation Rules
- CustomerId required, must exist
- All optical values optional (nullable)
- Axis must be integer if provided
- Date defaults to now

### Security Rules
- JWT required
- No role restriction

### Edge Cases
- Examination can exist without Order
- Order can link to Examination (optional)
- Global list searchable by customer name/phone

---

## Feature: Orders

### Purpose
Create and track sales orders linking customers, examinations, and inventory items.

### User Role
All authenticated users

### Entry Point
`/orders` (OrdersPage) — tabs by status, expandable rows, create modal

### Business Value
Core sales workflow: quote → order → production → delivery with inventory reservation.

### Internal Flow
```
Orders List (filter by status, customer)
    │
    ├─► Create: Modal → Select Customer → Load Exams + Inventory
    │              Build items (inventory or custom) → POST /api/orders
    │              Transaction: create order + items + decrement inventory
    ├─► Status Update: PATCH /api/orders/:id/status (NEW→IN_PROGRESS→READY→DELIVERED)
    ├─► Edit: PUT /api/orders/:id → Restore old inventory → Replace items → Decrement new
    └─► Delete: DELETE /api/orders/:id → Restore inventory quantities
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend | `OrdersPage.tsx` (complex form with FieldArray) |
| API Client | `frontend/src/api/orders.ts` |
| Backend | `backend/src/routes/orders.ts` |

### Database Tables
`Order`, `OrderItem`, `InventoryItem` (quantity sync), `Customer`, `Examination`, `Invoice`

### APIs Used
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Filter by status, customerId |
| GET | `/api/orders/:id` | Full detail |
| POST | `/api/orders` | Create with items (transaction) |
| PATCH | `/api/orders/:id/status` | Status transition |
| PUT | `/api/orders/:id` | Full replace (transaction) |
| DELETE | `/api/orders/:id` | Delete + restore inventory |

### Validation Rules
- CustomerId required
- At least 1 item required
- Each item: quantity ≥ 1, price ≥ 0
- InventoryItemId optional (custom items allowed)
- Status must be valid enum

### Inventory Synchronization (Critical Business Rule)
| Operation | Inventory Effect |
|-----------|------------------|
| Create Order | `quantity -= item.quantity` for each linked inventory item |
| Update Order | Restore old items (+qty), then decrement new items (-qty) |
| Delete Order | Restore all items (+qty) |
| Status Change | No inventory effect |

All inventory updates use `.catch(() => {})` to handle deleted inventory items gracefully.

### Security Rules
- JWT required
- No role restriction

### Edge Cases
- Custom items (no inventoryId) don't affect stock
- Inventory item deleted after order creation: `.catch()` prevents failure
- Orders can be created without examination

---

## Feature: Invoices & Payments

### Purpose
Generate invoices from uninvoiced orders, track payments with full per-installment detail (date, method, notes), print professional invoices.

### User Role
All authenticated users (Admin can override amounts/status)

### Entry Point
`/invoices` (InvoicesPage) — tabs by status, real-time search bar (name/phone), period filter, create modal (searchable customer combobox), payment modal with date picker, print

### Business Value
Billing and collection management with per-installment audit trail.

### Internal Flow
```
Invoices List (filter by status, date range, customer)
    │
    ├─► Create: Select Customer → Load uninvoiced orders
    │              Checkbox select orders → Running total
    │              Optional initial payment → POST /api/invoices
    │              Transaction: create invoice + link orders + record payment
    ├─► Add Payment: POST /api/invoices/:id/payments
    │              Recalculates paidAmount + status (UNPAID/PARTIAL/PAID)
    ├─► Edit (Admin): PUT /api/invoices/:id → Override total/paid/status
    ├─► Print: /invoices/:id/print → InvoicePrint.tsx (A4 layout)
    ├─► Period Report: Date range → PeriodCollectiveReport (Excel export)
    └─► Delete: DELETE → Unlink orders + delete invoice + payments
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend | `InvoicesPage.tsx`, `InvoicePrint.tsx`, `PeriodCollectiveReport.tsx` |
| API Client | `frontend/src/api/invoices.ts` |
| Backend | `backend/src/routes/invoices.ts` |

### Database Tables
`Invoice`, `Payment`, `Order` (via invoiceId), `Customer`

### APIs Used
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | Filter status, customer, date range |
| GET | `/api/invoices/:id` | Full detail with orders, payments |
| POST | `/api/invoices` | Create from orderIds (transaction) |
| POST | `/api/invoices/:id/payments` | Add payment (amount, **date**, method, notes), recalc paidAmount + status |
| PUT | `/api/invoices/:id` | Admin override amounts/status |
| DELETE | `/api/invoices/:id` | Unlink orders + delete |

### Business Rules
- Invoice total = sum of order items (price × qty) at creation
- Status derived: PAID if paid≥total, PARTIAL if paid>0, else UNPAID
- Payment adds to paidAmount, recalculates status
- Each Payment record stores its own `date` (defaults to now if not provided), `method`, `notes`, `amount`
- Admin can override total/paid/status directly (audit risk)
- Deleting invoice unlinks orders (they become available for re-invoicing)

### Security Rules
- JWT required for all
- Admin only: PUT /api/invoices/:id (amount/status override)

### Edge Cases & UI Notes
- Partial payments shown as a numbered table inside invoice expand panel: #, Date, Method (badge), Notes, Amount, Total Paid footer
- CustomerProfile Invoice History also has expandable payment breakdown per invoice
- Payment date can be set explicitly in Add Payment modal (defaults to today)
- Search bar on Invoices page filters by customer name or phone (client-side, instant)
- Invoice print uses customer data + order items + payment summary
- Period collective report aggregates multiple invoices for Excel export

---

## Feature: Inventory Management

### Purpose
Manage stock of Frames, Lenses, Accessories with type-specific attributes and SKU system.

### User Role
All authenticated users

### Entry Point
`/inventory` (InventoryPage) — tabs by type, search, add/edit modal with dynamic fields

### Business Value
Product catalog with stock tracking, low-stock alerts, SKU auto-generation.

### Internal Flow
```
Inventory List (filter by type, search brand/model)
    │
    ├─► Create: Modal → Select Type → Dynamic fields appear
    │              SKU: manual or auto-generate (FRM-XXXX, LNS-XXXX, ACC-XXXX)
    │              Real-time SKU availability check (debounced)
    │              POST /api/inventory → Create
    ├─► Edit: Modal → Pre-fill → PUT /api/inventory/:id (SKU check)
    ├─► Delete: DELETE /api/inventory/:id
    ├─► SKU Check: GET /api/inventory/check-sku?sku=xxx&excludeId=yyy
    └─► SKU Generate: GET /api/inventory/generate-sku?type=FRAME → Next sequence
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend | `InventoryPage.tsx` (dynamic form by type) |
| API Client | `frontend/src/api/inventory.ts` |
| Backend | `backend/src/routes/inventory.ts` |

### Database Tables
`InventoryItem`, `OrderItem` (reference)

### Type-Specific Fields
| Type | Fields |
|------|--------|
| FRAME | brand, model, color, material, category, price, quantity, sku |
| LENS | brand, model, lensType, coating, lensIndex, category, price, quantity, sku |
| ACCESSORY | brand, model, category, price, quantity, sku |

### Validation Rules
- Type required (enum)
- Price ≥ 0, Quantity ≥ 0 (integer)
- SKU unique if provided
- LensIndex numeric if provided

### SKU Auto-Generation Logic
```
Prefix: FRAME=FRM, LENS=LNS, ACCESSORY=ACC
Pattern: PREFIX-#### (4-digit zero-padded)
Algorithm: Find max existing sequence for prefix, increment, check gaps
```

### Security Rules
- JWT required
- No role restriction

### Edge Cases
- Manual SKU entry validated real-time (debounced 400ms)
- Auto-generation handles gaps from manual SKUs
- Low stock highlighted: ≤5 (red), ≤15 (amber), >15 (green)

---

## Feature: Reports

### Purpose
Dashboard summary, customer history reports, financial analytics (admin), staff performance analytics (admin).

### User Role
All: Dashboard, Customer Report. Admin: Financial Reports, Staff Performance.

### Entry Point
`/reports` (ReportsPage), `/reports/financial` (FinancialReports), `/reports/staff` (StaffPerformance), `/customers/:id/report` (CustomerReport)

### Business Value
Operational visibility: customer activity, stock alerts, collection rates, revenue trends, and per-employee performance accountability.

### Internal Flow
```
Dashboard (GET /api/reports/summary) → Real-time stats (refetch 60s)
    ├─► Counts: customers, orders, exams, low stock items
    ├─► Orders by status (groupBy)
    ├─► Invoice aggregates (sum total/paid)
    └─► Recent orders (10)

Customer Report (GET /api/reports/customer/:id) → Full history + summary
    ├─► Customer + family
    ├─► All exams, orders (with items), invoices (with payments)
    └─► Summary: totalBilled, totalPaid, outstanding

Financial Reports (Admin) (GET /api/reports/financial)
    ├─► All invoices + payments
    ├─► Revenue, outstanding, billed totals
    ├─► Orders by status
    └─► Recent 30-day revenue

Staff Performance (Admin) (GET /api/reports/staff?dateFrom=&dateTo=)
    ├─► Orders grouped by createdById (with items for value calc)
    ├─► Invoices grouped by createdById
    ├─► Per-user: totalOrders, totalOrderValue, totalInvoices, totalBilled, totalCollected
    ├─► Per-user daily breakdown array (date, orders, orderValue, invoices, billed, collected)
    └─► Sorted by totalBilled descending
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend | `ReportsPage.tsx`, `FinancialReports.tsx`, `StaffPerformance.tsx`, `CustomerReport.tsx` |
| API Client | `frontend/src/api/reports.ts` |
| Backend | `backend/src/routes/reports.ts` |

### Database Tables
All tables aggregated via Prisma `count`, `groupBy`, `aggregate`; Staff: `Order.createdById`, `Invoice.createdById`

### Security Rules
- JWT required
- Financial Reports: `requireRole('ADMIN')`
- Staff Performance: `requireRole('ADMIN')`

---

## Feature: Staff Performance Report *(Added 2026-06-16)*

### Purpose
Per-employee sales analytics with daily breakdown — orders created, invoices issued, revenue billed and collected.

### User Role
Admin only

### Entry Point
`/reports/staff` (StaffPerformance)

### Business Value
Holds staff accountable for daily targets. Identifies top performers and slow days. Enables commission or review calculations based on real billing data.

### Internal Flow
```
1. Admin selects date range (From / To) and clicks Apply
2. GET /api/reports/staff?dateFrom=<ISO>&dateTo=<ISO>
3. Backend fetches Orders + Invoices with createdBy in date range
4. Aggregates per user: totals + daily breakdown
5. Returns sorted array (highest billed first)
6. Frontend renders ranked staff cards (🥇🥈🥉)
7. Click any card → expands daily table with color-coded collection %
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend Page | `frontend/src/pages/reports/StaffPerformance.tsx` |
| API Client | `frontend/src/api/reports.ts` (`getStaffReport`, `StaffMemberStat`, `StaffDayData`, `StaffReport`) |
| Backend | `backend/src/routes/reports.ts` (`GET /staff`) |

### Database Tables
`Order` (createdById, createdAt, items), `Invoice` (createdById, createdAt, totalAmount, paidAmount), `User`

### APIs Used
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reports/staff` | Admin | Returns staff performance stats with optional dateFrom/dateTo query params |

### Response Shape
```json
{
  "staffStats": [
    {
      "user": { "id": "...", "name": "...", "role": "EMPLOYEE" },
      "totalOrders": 12,
      "totalOrderValue": 3400.000,
      "totalInvoices": 9,
      "totalBilled": 3200.000,
      "totalCollected": 2900.000,
      "daily": [
        { "date": "2026-06-15", "orders": 3, "orderValue": 800.000, "invoices": 2, "billed": 750.000, "collected": 700.000 }
      ]
    }
  ],
  "totalUsers": 4
}
```

---

## Feature: Employee Management (Admin Only)

### Purpose
Manage system user accounts with roles and activation status.

### User Role
Admin only

### Entry Point
`/employees` (EmployeesPage)

### Business Value
Access control for the application itself.

### Internal Flow
```
List users (GET /api/employees)
    │
    ├─► Create: POST /api/employees → Hash password → Create (ADMIN/EMPLOYEE)
    ├─► Update: PUT /api/employees/:id → Optional password re-hash
    └─► Delete: DELETE /api/employees/:id (cannot delete self)
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend | `EmployeesPage.tsx` |
| API Client | `frontend/src/api/employees.ts` |
| Backend | `backend/src/routes/employees.ts` |
| Middleware | `backend/src/middleware/role.ts` |

### Database Tables
`User`

### Validation Rules
- Name required
- Email required, unique, valid format
- Password min 6 chars (create), optional on update
- Role enum: ADMIN/EMPLOYEE
- isActive boolean

### Security Rules
- JWT + `requireRole('ADMIN')` on all routes
- Cannot delete own account
- Passwords hashed with bcrypt (10 rounds)

---

## Feature: Backup & Restore (Admin Only)

### Purpose
Automated and manual PostgreSQL database backup/restore via pg_dump/psql.

### User Role
Admin only

### Entry Point
`/backup` (BackupPage)

### Business Value
Disaster recovery, data portability, compliance.

### Internal Flow
```
Backup Page
    │
    ├─► Create Backup: POST /api/backup/create
    │       → pg_dump -h host -p port -U user -F p -f file dbname
    │       → Returns metadata, prunes old backups per settings
    ├─► List: GET /api/backup/list → Filesystem scan (backups/*.sql)
    ├─► Download: GET /api/backup/download/:filename → res.download()
    ├─► Download Latest: GET /api/backup/download/latest
    ├─► Restore (saved): POST /api/backup/restore/:filename
    │       → psql -h host -p port -U user -d dbname -f file
    ├─► Restore (upload): POST /api/backup/restore-upload (multer)
    │       → Upload .sql → psql restore → Delete temp file
    ├─► Delete: DELETE /api/backup/:filename
    └─► Settings: GET/PUT /api/backup/settings
            → autoEnabled, frequency (daily/weekly/monthly), keepLast
            → Background scheduler (setInterval) runs pg_dump automatically
```

### Files Involved
| Type | Files |
|------|-------|
| Frontend | `BackupPage.tsx` |
| API Client | `frontend/src/api/backup.ts` |
| Backend | `backend/src/routes/backup.ts` |
| Scripts | `backend/scripts/backup.sh`, `restore.sh` |

### Key Implementation Details
- **Cross-platform pg_dump/psql resolution**: Windows searches `C:\Program Files\PostgreSQL\<version>\bin\`
- **Auto-backup scheduler**: `initAutoBackup()` called on startup and settings change
- **Pruning**: Keeps last N backups per settings
- **Settings persisted**: `backups/settings.json`
- **Security**: Admin only, PGPASSWORD via env

### Security Rules
- JWT + `requireRole('ADMIN')` on all routes
- File upload: only `.sql` extension, 500MB limit

### Edge Cases
- pg_dump/psql not in PATH: Windows fallback search
- Restore replaces ALL data (warning shown)
- Auto-backup runs only while Node process alive

---

# 8. DATABASE DOCUMENTATION

## Schema Overview (Prisma)

### Enums
```prisma
enum Role { ADMIN, EMPLOYEE }
enum OrderStatus { NEW, IN_PROGRESS, READY, DELIVERED }
enum InvoiceStatus { UNPAID, PARTIAL, PAID }
enum ItemType { FRAME, LENS, ACCESSORY }
```

### Tables

## Table: User
### Purpose
System authentication and authorization accounts.

### Columns
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| name | String | Display name |
| email | String (Unique) | Login identifier |
| passwordHash | String | bcrypt hash |
| role | Role | ADMIN or EMPLOYEE |
| isActive | Boolean | Account enabled (default true) |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Last update |

### Relationships
None (referenced by audit trails implicitly)

### Constraints
- email unique
- role default EMPLOYEE

### Usage Locations
- `backend/src/routes/auth.ts` (login, me, change-password)
- `backend/src/routes/employees.ts` (admin CRUD)
- `backend/src/middleware/auth.ts` (JWT payload)

---

## Table: Customer
### Purpose
Patient/customer profiles with family hierarchy.

### Columns
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| name | String? | Full name |
| phone | String? | Contact phone (unique when set) |
| email | String? | Contact email |
| dateOfBirth | DateTime? | DOB |
| address | String? | Address |
| notes | String? | Free text |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Last update |
| parentId | String? | Self-referencing FK |

### Relationships
| Relation | Type | Target | On Delete |
|----------|------|--------|-----------|
| parent | Many-to-One | Customer | Set Null |
| children | One-to-Many | Customer | - |
| examinations | One-to-Many | Examination | Cascade |
| orders | One-to-Many | Order | - |
| invoices | One-to-Many | Invoice | - |

### Constraints
- Phone unique (when not null)
- ParentId references Customer.id

### Indexes
- Implicit on id (PK), parentId (FK)

### Usage Locations
- `backend/src/routes/customers.ts` (all CRUD + family)
- `backend/src/routes/examinations.ts` (customerId filter)
- `backend/src/routes/orders.ts` (customerId filter)
- `backend/src/routes/invoices.ts` (customerId filter)
- `backend/src/routes/reports.ts` (customer report)

---

## Table: Examination
### Purpose
Eye prescription records linked to customers.

### Columns
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| customerId | String | FK → Customer |
| doctor | String? | Doctor name |
| date | DateTime | Exam date (default now) |
| rightSph | Float? | OD Sphere |
| rightCyl | Float? | OD Cylinder |
| rightAxis | Int? | OD Axis |
| leftSph | Float? | OS Sphere |
| leftCyl | Float? | OS Cylinder |
| leftAxis | Int? | OS Axis |
| add | Float? | Addition (bifocal/progressive) |
| ipd | Float? | Interpupillary distance |
| height | Float? | Segment height |
| notes | String? | Clinical notes |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Last update |

### Relationships
| Relation | Type | Target | On Delete |
|----------|------|--------|-----------|
| customer | Many-to-One | Customer | Cascade |
| orders | One-to-Many | Order | - |

### Constraints
- customerId required, FK to Customer
- Axis fields integer

### Usage Locations
- `backend/src/routes/examinations.ts`
- `backend/src/routes/orders.ts` (examinationId optional)
- `backend/src/routes/reports.ts` (customer report)

---

## Table: InventoryItem
### Purpose
Product catalog for frames, lenses, accessories.

### Columns
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| type | ItemType | FRAME, LENS, ACCESSORY |
| brand | String? | Brand name |
| model | String? | Model name |
| color | String? | Frame color |
| material | String? | Frame material |
| lensType | String? | Lens type (Single Vision, Progressive, etc.) |
| coating | String? | Lens coating |
| lensIndex | Float? | Refractive index |
| category | String? | Accessory category |
| price | Float | Sale price (default 0) |
| quantity | Int | Stock on hand (default 0) |
| sku | String? | Unique SKU |
| notes | String? | Notes |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Last update |

### Relationships
| Relation | Type | Target | On Delete |
|----------|------|--------|-----------|
| orderItems | One-to-Many | OrderItem | - |

### Constraints
- SKU unique (when not null)
- Price ≥ 0, Quantity ≥ 0 (enforced at API level)

### Usage Locations
- `backend/src/routes/inventory.ts`
- `backend/src/routes/orders.ts` (inventory sync)
- `backend/src/routes/reports.ts` (low stock)

---

## Table: Order
### Purpose
Sales orders linking customer, optional examination, and line items.

### Columns
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| customerId | String | FK → Customer |
| examinationId | String? | FK → Examination (optional) |
| invoiceId | String? | FK → Invoice (set when invoiced) |
| status | OrderStatus | NEW, IN_PROGRESS, READY, DELIVERED |
| notes | String? | Special instructions |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Last update |

### Relationships
| Relation | Type | Target | On Delete |
|----------|------|--------|-----------|
| customer | Many-to-One | Customer | - |
| examination | Many-to-One | Examination | - |
| invoice | Many-to-One | Invoice | - |
| items | One-to-Many | OrderItem | Cascade |

### Constraints
- Status default NEW
- customerId required

### Usage Locations
- `backend/src/routes/orders.ts` (full CRUD + status + inventory sync)
- `backend/src/routes/invoices.ts` (orderIds for invoice creation)
- `backend/src/routes/reports.ts` (aggregations)

---

## Table: OrderItem
### Purpose
Line items within an order (inventory-linked or custom).

### Columns
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| orderId | String | FK → Order |
| inventoryItemId | String? | FK → InventoryItem (optional) |
| customItemName | String? | Name for non-inventory items |
| quantity | Int | Quantity (default 1) |
| price | Float | Unit price |
| notes | String? | Item notes |

### Relationships
| Relation | Type | Target | On Delete |
|----------|------|--------|-----------|
| order | Many-to-One | Order | Cascade |
| inventoryItem | Many-to-One | InventoryItem | - |

### Constraints
- orderId required
- quantity ≥ 1, price ≥ 0 (API validation)

### Usage Locations
- `backend/src/routes/orders.ts` (create/update/delete with inventory sync)
- `backend/src/routes/invoices.ts` (invoice total calculation)

---

## Table: Invoice
### Purpose
Billing documents generated from one or more orders.

### Columns
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| customerId | String | FK → Customer |
| totalAmount | Float | Calculated at creation |
| paidAmount | Float | Sum of payments (default 0) |
| paymentMethod | String? | Initial payment method |
| status | InvoiceStatus | UNPAID, PARTIAL, PAID |
| notes | String? | Notes |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Last update |

### Relationships
| Relation | Type | Target | On Delete |
|----------|------|--------|-----------|
| customer | Many-to-One | Customer | - |
| orders | One-to-Many | Order | - |
| payments | One-to-Many | Payment | Cascade |

### Constraints
- Status default UNPAID
- PaidAmount ≤ TotalAmount (enforced by logic)

### Usage Locations
- `backend/src/routes/invoices.ts` (full CRUD + payments)
- `backend/src/routes/orders.ts` (invoiceId set on invoice creation)
- `backend/src/routes/reports.ts` (financial aggregates)

---

## Table: Payment
### Purpose
Individual payment records against an invoice.

### Columns
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| invoiceId | String | FK → Invoice |
| amount | Float | Payment amount |
| method | String | Cash, KNET, Credit Card, Bank Transfer |
| date | DateTime | Payment date (default now) |
| notes | String? | Notes |

### Relationships
| Relation | Type | Target | On Delete |
|----------|------|--------|-----------|
| invoice | Many-to-One | Invoice | Cascade |

### Constraints
- Amount > 0
- Method required

### Usage Locations
- `backend/src/routes/invoices.ts` (add payment, recalc status)
- `backend/src/routes/reports.ts` (financial)

---

## Relationship Diagram
```text
User (ADMIN/EMPLOYEE)
    │
    └── Customer ◄──────────────────────────────────────┐
    │    │                                               │
    │    ├── Examination ◄────────────────────────────┐  │
    │    │    │                                        │  │
    │    │    └── Order ◄────────────────────────────┐  │  │
    │    │         │                                 │  │  │
    │    │         ├── OrderItem ◄── InventoryItem   │  │  │
    │    │         │                                 │  │  │
    │    │         └── Invoice ◄─────────────────────┘  │  │
    │    │              │                               │  │
    │    │              └── Payment                     │  │
    │    │                                             │  │
    │    └── Customer (parent/child self-ref) ─────────┘  │
    │                                                     │
    └── (auth only) ──────────────────────────────────────┘
```

---

# 9. API DOCUMENTATION

## Base URL
```
Development: http://localhost:3001/api
Production:  https://your-domain/api
```

## Authentication
All endpoints (except `/api/auth/login` and `/api/health`) require:
```
Authorization: Bearer <JWT_TOKEN>
```

Token expires in 8 hours. Returns 401 on expiry/invalid.

## Error Format
```json
{
  "message": "Error description",
  "errors": [ { "path": ["field"], "message": "..." } ]  // Zod validation errors
}
```

## Common HTTP Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (unique constraint) |
| 500 | Server Error |

---

## Auth Endpoints

### POST /api/auth/login
**Description**: Authenticate user, return JWT
**Request**:
```json
{ "email": "admin@optivision.com", "password": "admin123" }
```
**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "Admin", "email": "...", "role": "ADMIN" }
}
```

### GET /api/auth/me
**Description**: Get current user profile
**Response**: `{ "id": "...", "name": "...", "email": "...", "role": "ADMIN" }`

### POST /api/auth/change-password
**Description**: Change password (requires current password)
**Request**: `{ "currentPassword": "...", "newPassword": "..." }`

---

## Customer Endpoints

### GET /api/customers
**Query**: `q` (search name/phone)
**Response**: `Customer[]` with `_count.orders`, `_count.examinations`, parent

### GET /api/customers/:id
**Response**: Full `CustomerReport` with exams, orders (items, invoice), invoices (payments), parent, children

### POST /api/customers
**Request**: `{ name, phone?, email?, dateOfBirth?, address?, notes?, parentId? }`
**Validation**: Phone unique, parentId exists

### PUT /api/customers/:id
**Request**: Partial customer fields

### DELETE /api/customers/:id
**Effect**: Cascades to examinations, orders, invoices

### POST /api/customers/:id/children
**Request**: `{ "childId": "..." }`
**Validation**: Not self, not circular, child exists

### DELETE /api/customers/:id/children/:childId
**Effect**: Sets child's parentId = null

---

## Examination Endpoints

### GET /api/examinations
**Query**: `q` (search customer name/phone)
**Response**: `Examination[]` with customer (id, name, phone), limited to 200

### GET /api/examinations/customer/:customerId
**Response**: All examinations for customer (descending date)

### GET /api/examinations/:id
**Response**: Single examination

### POST /api/examinations
**Request**: `{ customerId, doctor?, date?, rightSph?, rightCyl?, rightAxis?, leftSph?, leftCyl?, leftAxis?, add?, ipd?, height?, notes? }`

### PUT /api/examinations/:id
**Request**: Partial examination fields

### DELETE /api/examinations/:id

---

## Inventory Endpoints

### GET /api/inventory
**Query**: `type` (FRAME|LENS|ACCESSORY), `q` (search brand/model)
**Response**: `InventoryItem[]`

### GET /api/inventory/:id

### POST /api/inventory
**Request**: Full item fields (type-specific)

### PUT /api/inventory/:id

### DELETE /api/inventory/:id

### GET /api/inventory/check-sku
**Query**: `sku`, `excludeId?`
**Response**: `{ "available": boolean }`

### GET /api/inventory/generate-sku
**Query**: `type` (FRAME|LENS|ACCESSORY)
**Response**: `{ "sku": "FRM-0001" }`

---

## Order Endpoints

### GET /api/orders
**Query**: `status` (NEW|IN_PROGRESS|READY|DELIVERED), `customerId`
**Response**: `Order[]` with customer, items (inventoryItem), invoice, examination

### GET /api/orders/:id

### POST /api/orders
**Request**:
```json
{
  "customerId": "...",
  "examinationId": "...",
  "status": "NEW",
  "notes": "...",
  "items": [
    { "inventoryItemId": "...", "customItemName": "...", "quantity": 1, "price": 150.000, "notes": "..." }
  ]
}
```
**Transaction**: Creates order + items + decrements inventory quantities

### PATCH /api/orders/:id/status
**Request**: `{ "status": "IN_PROGRESS" }`

### PUT /api/orders/:id
**Request**: Full order replace (restores old inventory, decrements new)

### DELETE /api/orders/:id
**Transaction**: Restores inventory quantities + deletes order

---

## Invoice Endpoints

### GET /api/invoices
**Query**: `status` (UNPAID|PARTIAL|PAID), `customerId`, `dateFrom`, `dateTo`
**Response**: `Invoice[]` with customer, orders (items, examination), payments

### GET /api/invoices/:id

### POST /api/invoices
**Request**:
```json
{
  "customerId": "...",
  "orderIds": ["...", "..."],
  "paidAmount": 0,
  "paymentMethod": "Cash",
  "notes": "..."
}
```
**Transaction**: Creates invoice + links orders + records initial payment if paidAmount > 0
**Validation**: Orders must belong to customer, must be uninvoiced

### POST /api/invoices/:id/payments
**Request**: `{ "amount": 50.000, "method": "Cash", "date": "2026-01-15", "notes": "..." }`
**Effect**: Creates payment, recalculates paidAmount + status

### PUT /api/invoices/:id (Admin only)
**Request**: `{ "paymentMethod"?, "notes"?, "status"?, "totalAmount"?, "paidAmount"? }`
**Note**: Direct override — does NOT create payment history record

### DELETE /api/invoices/:id
**Transaction**: Unlinks orders (invoiceId = null) + deletes invoice + payments

---

## Employee Endpoints (Admin Only)

### GET /api/employees
**Response**: `User[]` (id, name, email, role, isActive, createdAt) — no passwordHash

### POST /api/employees
**Request**: `{ "name": "...", "email": "...", "password": "...", "role": "EMPLOYEE" }`
**Effect**: Hashes password, creates user

### PUT /api/employees/:id
**Request**: Partial user fields (password optional, re-hashed if provided)

### DELETE /api/employees/:id
**Validation**: Cannot delete self

---

## Report Endpoints

### GET /api/reports/customer/:customerId
**Response**: Full `CustomerReport` with summary totals

### GET /api/reports/summary
**Response**:
```json
{
  "totalCustomers": 120,
  "newCustomersThisMonth": 5,
  "totalOrders": 340,
  "ordersThisMonth": 23,
  "totalExaminations": 180,
  "ordersByStatus": { "NEW": 10, "IN_PROGRESS": 15, "READY": 8, "DELIVERED": 307 },
  "lowStockItems": [ { "id": "...", "quantity": 2, ... } ],
  "totalBilled": 45000.000,
  "totalCollected": 42000.000,
  "recentOrders": [ ... ]
}
```

### GET /api/reports/financial (Admin Only)
**Response**:
```json
{
  "totalRevenue": 42000.000,
  "totalOutstanding": 3000.000,
  "totalBilled": 45000.000,
  "recentRevenue": 5000.000,
  "ordersByStatus": { ... },
  "invoices": [ ... ]  // First 50
}
```

---

## Backup Endpoints (Admin Only)

### POST /api/backup/create
**Response**: `{ "message": "...", "backup": { "filename": "...", "size": 12345, "createdAt": "..." } }`

### GET /api/backup/list
**Response**: `BackupFile[]` (filename, size, createdAt)

### GET /api/backup/download/:filename
**Response**: File download (application/sql)

### GET /api/backup/download/latest
**Response**: Latest backup file download

### POST /api/backup/restore/:filename
**Response**: `{ "message": "Database restored successfully" }`

### POST /api/backup/restore-upload
**Request**: Multipart form with `backup` file (.sql)
**Response**: `{ "message": "Database restored successfully" }`

### DELETE /api/backup/:filename

### GET /api/backup/settings
**Response**: `{ "autoEnabled": true, "frequency": "weekly", "keepLast": 8, "lastAutoBackup": "..." }`

### PUT /api/backup/settings
**Request**: `{ "autoEnabled"?, "frequency"?, "keepLast"? }`
**Effect**: Updates settings, restarts scheduler

---

# 10. AUTHENTICATION & AUTHORIZATION

## Login Flow
```text
User → POST /api/auth/login (email, password)
         │
         ▼
    bcrypt.compare(password, user.passwordHash)
         │
         ▼ (valid)
    JWT.sign({ id, email, role }, JWT_SECRET, { expiresIn: '8h' })
         │
         ▼
    Response: { token, user }
         │
         ▼
Frontend: localStorage.setItem('token', token)
         │
         ▼
Axios interceptor adds Authorization header to all requests
```

## Token Handling
- **Storage**: `localStorage` (key: `token`)
- **Expiry**: 8 hours (hardcoded in `auth.ts:29`)
- **Refresh**: Not implemented — user must re-login
- **Logout**: `localStorage.removeItem('token')` + redirect to `/login`

## Session Management
- Stateless JWT (no server-side sessions)
- Token verified on each request via `authenticate` middleware
- 401 response triggers frontend logout + redirect to `/login`

## Role-Based Access Control
```typescript
// middleware/role.ts
export function requireRole(role: string) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
```

### Protected Routes
| Route | Required Role |
|-------|---------------|
| `/api/employees/*` | ADMIN |
| `/api/reports/financial` | ADMIN |
| `/api/backup/*` | ADMIN |
| `/api/invoices/:id` (PUT) | ADMIN |
| All others | Any authenticated (ADMIN or EMPLOYEE) |

### Frontend Route Guards
```tsx
// App.tsx
function AdminRoute({ children }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```
Applied to: `/employees`, `/reports/financial`, `/backup`

## Password Security
- **Hashing**: bcrypt with 10 rounds (`bcrypt.hash(password, 10)`)
- **Verification**: `bcrypt.compare(plain, hash)`
- **Minimum Length**: 6 characters (enforced by Zod)
- **Seed**: Admin user created with `admin123` (hashed)

## Default Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@optivision.com | admin123 |
| Staff | staff@optivision.com | employee123 (commented in seed) |

---

# 11. BUSINESS RULES

## Validation Rules

### Customer
- **Phone Uniqueness**: Enforced at API level (create/update), case-insensitive
- **Name Required**: Minimum 1 character
- **Email Format**: Valid email if provided
- **Family Circular Prevention**: Cannot link customer as own ancestor

### Examination
- **Customer Required**: Must reference existing customer
- **Optical Values**: All nullable (optional)
- **Axis Integer**: Must be whole number if provided

### Order
- **Customer Required**: Must exist
- **Items Required**: At least 1 item
- **Item Quantity**: ≥ 1
- **Item Price**: ≥ 0
- **Status Enum**: Only valid transitions (UI enforces order)

### Invoice
- **Customer Required**: Must match all orders' customer
- **Orders Required**: At least 1 order ID
- **Orders Uninvoiced**: Cannot include already-invoiced orders
- **Total Calculation**: Sum of (item.price × item.quantity) at creation time
- **Status Derivation**:
  - `PAID` if `paidAmount ≥ totalAmount`
  - `PARTIAL` if `paidAmount > 0`
  - `UNPAID` if `paidAmount = 0`

### Payment
- **Amount**: > 0
- **Method**: Required
- **Status Recalculation**: After each payment, invoice status updated

### Inventory
- **SKU Uniqueness**: Global across all types
- **Price**: ≥ 0
- **Quantity**: ≥ 0 (integer)
- **Type-Specific Fields**: Enforced by dynamic frontend form

### Employee
- **Email Unique**: Global
- **Password Min**: 6 chars
- **Role Enum**: ADMIN or EMPLOYEE
- **Self-Delete Prevention**: Cannot delete own account

## Access Restrictions
| Resource | Admin | Employee |
|----------|-------|----------|
| Customers | ✅ CRUD | ✅ CRUD |
| Examinations | ✅ CRUD | ✅ CRUD |
| Orders | ✅ CRUD | ✅ CRUD |
| Invoices (create/pay/print) | ✅ | ✅ |
| Invoices (override amounts) | ✅ | ❌ |
| Inventory | ✅ CRUD | ✅ CRUD |
| Reports (Dashboard/Customer) | ✅ | ✅ |
| Reports (Financial) | ✅ | ❌ |
| Employees | ✅ CRUD | ❌ |
| Backup/Restore | ✅ | ❌ |
| Settings (own password) | ✅ | ✅ |

## Domain Rules

### Inventory Synchronization
```
CREATE ORDER:
  For each item with inventoryItemId:
    inventoryItem.quantity -= item.quantity

UPDATE ORDER:
  For each OLD item with inventoryItemId:
    inventoryItem.quantity += item.quantity  // Restore
  For each NEW item with inventoryItemId:
    inventoryItem.quantity -= item.quantity  // Decrement

DELETE ORDER:
  For each item with inventoryItemId:
    inventoryItem.quantity += item.quantity  // Restore
```
All inventory updates use `.catch(() => {})` to handle deleted inventory items gracefully.

### Invoice-Order Linking
- Orders can exist without invoice (status: uninvoiced)
- Invoice creation links orders via `invoiceId` (many-to-one)
- Deleting invoice sets `invoiceId = null` on orders (re-invoiceable)
- Invoice total frozen at creation (not recalculated if order items change)

### Family Relationships
- Customer.parentId → Customer.id (self-referencing)
- One parent, multiple children
- Circular prevention: Cannot set parent to own descendant
- UI shows parent link + children list on profile

### Currency Handling
- **Currency**: KWD (Kuwaiti Dinar)
- **Precision**: 3 decimal places (fils)
- **Storage**: Float in database
- **Display**: `formatKWD()` → "1,234.567 KWD"
- **Input**: Step 0.001 in number fields

---

# 12. EXTERNAL INTEGRATIONS

## PostgreSQL (Primary Database)
| Aspect | Details |
|--------|---------|
| **Purpose** | Primary data store |
| **Connection** | `DATABASE_URL` env var (PrismaPg adapter) |
| **Auth** | Username/password in URL |
| **Backup** | pg_dump/psql via child_process |
| **Failure Handling** | Global error handler maps Prisma codes (P2002, P2003, P2025) |

## pg_dump / psql (Backup/Restore)
| Aspect | Details |
|--------|---------|
| **Purpose** | Database backup and restore |
| **Invocation** | `child_process.execFile()` |
| **Windows Path Resolution** | Searches `C:\Program Files\PostgreSQL\<version>\bin\` |
| **Auth** | `PGPASSWORD` env var passed to subprocess |
| **Format** | Plain SQL (`-F p`) |
| **Failure Handling** | Returns 500 with stderr; UI shows error notification |

## JWT (Authentication)
| Aspect | Details |
|--------|---------|
| **Library** | `jsonwebtoken` |
| **Secret** | `JWT_SECRET` env var |
| **Algorithm** | HS256 (default) |
| **Expiry** | 8 hours |
| **Payload** | `{ id, email, role }` |

## bcryptjs (Password Hashing)
| Aspect | Details |
|--------|---------|
| **Rounds** | 10 |
| **Usage** | User creation, password change |

## PM2 (Production Process Management)
| Aspect | Details |
|--------|---------|
| **Config** | `ecosystem.config.js` |
| **Apps** | Backend (dist/index.js), Frontend preview (optional) |

---

# 13. ENVIRONMENT VARIABLES

| Variable | Required | Purpose | Default/Example |
|----------|----------|---------|-----------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Yes | JWT signing secret | `optivision-secret-12667-15422` |
| `PORT` | No | Backend port | `3001` |
| `NODE_ENV` | No | Environment mode | `development` / `production` |

### Inferred Variables (Not in .env but used)
| Variable | Inferred From | Purpose |
|----------|---------------|---------|
| `PGPASSWORD` | Parsed from `DATABASE_URL` | Passed to pg_dump/psql subprocess |
| `PGHOST` | Parsed from `DATABASE_URL` | pg_dump/psql -h |
| `PGPORT` | Parsed from `DATABASE_URL` | pg_dump/psql -p |
| `PGUSER` | Parsed from `DATABASE_URL` | pg_dump/psql -U |
| `PGDATABASE` | Parsed from `DATABASE_URL` | pg_dump/psql -d |

---

# 14. CONFIGURATION ANALYSIS

## Build Configuration

### Backend (TypeScript)
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```
**Build**: `npm run build` → `tsc` → outputs to `dist/`
**Dev**: `npm run dev` → `ts-node-dev --respawn --transpile-only src/index.ts`

### Frontend (Vite + TypeScript)
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: true }
})
```
**Build**: `npm run build` → `tsc && vite build`
**Dev**: `npm run dev` → `vite` (HMR on port 5173)

## Environment Configuration
| File | Purpose |
|------|---------|
| `backend/.env` | DATABASE_URL, JWT_SECRET, PORT |
| `frontend/.env` | Not used (API base URL hardcoded to localhost:3001) |

## Runtime Configuration
| Config | Location | Description |
|--------|----------|-------------|
| Auto-backup | `backups/settings.json` | frequency, keepLast, autoEnabled |
| PM2 | `ecosystem.config.js` | Process management for production |
| CORS | `backend/src/index.ts:18` | `origin: '*'` (allows LAN access) |

## Package Management
| Tool | Files |
|------|-------|
| npm | `package.json`, `package-lock.json` (both frontend & backend) |
| Prisma | `prisma/schema.prisma`, `prisma/migrations/` |

## Dependency Analysis

### Backend Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `@prisma/client` | ^7.8.0 | ORM client |
| `@prisma/adapter-pg` | ^7.8.0 | PostgreSQL adapter for Prisma |
| `pg` | ^8.13.3 | PostgreSQL driver |
| `bcryptjs` | ^2.4.3 | Password hashing |
| `cors` | ^2.8.5 | CORS middleware |
| `dotenv` | ^16.4.1 | Env loading |
| `express` | ^4.18.2 | Web framework |
| `jsonwebtoken` | ^9.0.2 | JWT auth |
| `multer` | ^2.1.1 | File upload |
| `zod` | ^3.22.4 | Validation |

### Frontend Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | DOM renderer |
| `react-router-dom` | ^6.21.3 | Routing |
| `@tanstack/react-query` | ^5.17.0 | Server state |
| `@tanstack/react-query-devtools` | ^5.17.0 | Devtools |
| `axios` | ^1.6.5 | HTTP client |
| `react-hook-form` | ^7.49.3 | Forms |
| `@hookform/resolvers` | ^3.3.4 | Zod resolver |
| `zod` | ^3.22.4 | Validation |
| `lucide-react` | ^0.312.0 | Icons |
| `xlsx` | ^0.18.5 | Excel export |
| `xlsx-js-style` | ^1.2.0 | Styled Excel |

---

# 15. DEPLOYMENT GUIDE

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### First-Time Setup (Windows)
```cmd
# 1. Clone repository
git clone <repo-url>
cd Eye-shop-mahmoudRepo

# 2. Configure database
# Edit backend/.env with your PostgreSQL credentials
# DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/optivision"
# JWT_SECRET="your-secure-random-secret"
# PORT=3001

# 3. Run setup script
setup_v2.bat

# Or manually:
cd backend && npm install
cd ../frontend && npm install
cd ../backend
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
```

### Start Development Servers
```cmd
# Option 1: Windows launcher (starts both)
start.bat

# Option 2: Manual (two terminals)
# Terminal 1 - Backend:
cd backend && npm run dev

# Terminal 2 - Frontend:
cd frontend && npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

### LAN Access
Other devices on same network: `http://<your-lan-ip>:5173`
- Backend CORS allows all origins (`origin: '*'`)

## Database Setup
1. Create PostgreSQL database: `CREATE DATABASE optivision;`
2. User with privileges: `GRANT ALL PRIVILEGES ON DATABASE optivision TO postgres;`
3. Run migrations: `npx prisma migrate dev`
4. Seed admin: `npx ts-node prisma/seed.ts`

## Environment Setup
| Environment | .env Configuration |
|-------------|-------------------|
| Development | Local PostgreSQL, JWT_SECRET=dev-secret |
| Production | Managed PostgreSQL (AWS RDS, etc.), strong JWT_SECRET |

## Running the Project
### Development
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

### Production Build
```bash
# Backend
cd backend && npm run build  # → dist/
npm start  # node dist/index.js

# Frontend
cd frontend && npm run build  # → dist/
# Serve dist/ via nginx/Apache or PM2
```

## Production Deployment

### PM2 (Recommended)
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'optivision-backend',
      script: './backend/dist/index.js',
      cwd: './backend',
      env: { NODE_ENV: 'production', PORT: 3001 }
    },
    {
      name: 'optivision-frontend',
      script: 'npx',
      args: 'serve -s dist -l 5173',
      cwd: './frontend'
    }
  ]
};
```
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Docker (Not configured but straightforward)
```dockerfile
# Backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/dist ./dist
COPY backend/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/index.js"]

# Frontend
FROM nginx:alpine
COPY frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## CI/CD Pipeline
**Not currently configured**. Recommended:
1. GitHub Actions / GitLab CI
2. On push to main:
   - Install deps
   - Run lint/typecheck
   - Build frontend & backend
   - Run tests (when added)
   - Deploy to staging
3. On tag: Deploy to production

---

# 16. SECURITY REVIEW

## Authentication Security

| Aspect | Status | Notes |
|--------|--------|-------|
| **Password Hashing** | ✅ Strong | bcrypt 10 rounds |
| **JWT Secret** | ⚠️ Hardcoded default | Change in production `.env` |
| **JWT Expiry** | ⚠️ 8 hours | No refresh token; consider shorter + refresh |
| **Token Storage** | ⚠️ localStorage | Vulnerable to XSS; consider httpOnly cookie |
| **Password Policy** | ⚠️ Min 6 chars | Consider stronger requirements |

## Authorization Security

| Aspect | Status | Notes |
|--------|--------|-------|
| **Role Middleware** | ✅ Implemented | `requireRole('ADMIN')` on sensitive routes |
| **Route Guards** | ✅ Frontend + Backend | Both layers enforced |
| **Self-Delete Prevention** | ✅ | Cannot delete own account |
| **Object-Level Auth** | ❌ Missing | No ownership checks (e.g., employee can see all customers) |

## Input Validation

| Aspect | Status | Notes |
|--------|--------|-------|
| **Zod Schemas** | ✅ All endpoints | Request body validated |
| **SQL Injection** | ✅ Prevented | Prisma parameterized queries |
| **XSS Prevention** | ⚠️ Moderate | React's auto-escaping helps; no CSP header set |
| **Rate Limiting** | ❌ Missing | No rate limiting on login or API endpoints |
| **File Upload Validation** | ✅ | `.sql` only, 500MB limit, sanitized filename |
| **Query Parameter Injection** | ✅ | Prisma sanitizes; no raw SQL |

## API Security
| Concern | Status | Notes |
|---------|--------|-------|
| **CORS** | ⚠️ Wide open | `origin: '*'` allows any origin; restrict in production |
| **HTTPS** | ❌ Not enforced | No HTTPS in dev; should use reverse proxy in production |
| **Error Details** | ⚠️ Verbose | Development error messages may leak info |
| **Global Error Handler** | ✅ Prisma codes mapped | User-friendly messages for common DB errors |

## Secrets Management
| Secret | Location | Risk |
|--------|----------|------|
| JWT_SECRET | `backend/.env` (committed to repo) | **CRITICAL** — Must move to env, add to `.gitignore` |
| DATABASE_URL | `backend/.env` (contains password) | **CRITICAL** — Contains DB password in plaintext |
| Default JWT | Hardcoded in seed: `optivision-secret-12667-15422` | **CRITICAL** — Change before production |

## Data Protection
| Concern | Status | Notes |
|---------|--------|-------|
| **Password Storage** | ✅ bcrypt hashed | 10 rounds |
| **Customer Data** | ⚠️ No encryption at rest | PostgreSQL level encryption optional |
| **Backup Files** | ⚠️ Plain SQL | Backups contain all data including personal info; secure backup files |
| **Audit Trail** | ❌ Not implemented | No created_by/updated_by tracking on records |

## Vulnerabilities (Ranked)

### CRITICAL
1. **`.env` file committed to Git** — Contains database credentials and JWT secret
2. **Weak JWT secret** — Hardcoded default known to all developers
3. **No rate limiting on login** — Brute force attack possible

### HIGH
4. **XSS via file upload** — Multer doesn't strip dangerous content from uploads
5. **No CSP headers** — Missing Content-Security-Policy
6. **CORS wildcard** — Allows any origin in production

### MEDIUM
7. **localStorage token storage** — XSS vulnerability exposes JWT
8. **No refresh token rotation** — 8-hour token can't be revoked server-side
9. **Backup files accessible** — No auth on backup directory (filesystem level)

### LOW
10. **No input sanitization for search** — While ORM-protected, search strings are passed directly
11. **Weak password policy** — Only 6-character minimum

---

# 17. PERFORMANCE REVIEW

## Database Performance

| Aspect | Assessment | Recommendation |
|--------|------------|----------------|
| **Query Pattern** | ⚠️ No pagination for customer orders (full history) | Add pagination for large datasets |
| **N+1 Prevention** | ✅ Prisma includes/select used strategically | Good |
| **Indexes** | ⚠️ Only PK and unique indexes | Add indexes on `customer.phone`, `inventoryItem.sku`, `order.status`, foreign keys |
| **Large Joins** | ⚠️ Customer profile joins 6+ tables | Consider lazy loading or pagination |
| **Query Limits** | ✅ Examinations limited to 200, invoices filtered | Good |

## API Performance

| Aspect | Assessment | Recommendation |
|--------|------------|----------------|
| **Response Times** | ⚠️ No caching implemented | Add response caching for reports/summary |
| **Payload Size** | ⚠️ Customer report returns all history | Add pagination/limits for large customers |
| **Concurrent Requests** | ✅ Prisma connection pooling via adapter | Good |

## Frontend Performance

| Aspect | Assessment | Recommendation |
|--------|------------|----------------|
| **Bundle Size** | ⚠️ No code splitting | Lazy load non-critical pages |
| **Caching** | ✅ TanStack Query with `staleTime` not configured | Set `staleTime` for less-frequent data |
| **Rerenders** | ⚠️ Components use `useQuery` at page level | Consider `select` for derived data |
| **Asset Size** | ✅ Tailwind CSS purges unused | Good |

## Caching

| Aspect | Status | Notes |
|--------|--------|-------|
| **Browser Cache** | ❌ No ETags/Cache-Control | Add to static endpoints |
| **React Query Cache** | ✅ Client-side | No staleTime configured |
| **Server Cache** | ❌ No Redis/memcached | Consider for dashboard/summary |

## Scalability

| Aspect | Assessment | Recommendation |
|--------|------------|----------------|
| **Horizontal Scaling** | ⚠️ Stateless (JWT) backend | Easy to scale with load balancer |
| **Database Scaling** | ⚠️ Single PostgreSQL instance | Consider read replicas or connection pooling (PgBouncer) |
| **Static Assets** | ✅ Served via Vite | Use CDN for production |

---

# 18. CODE QUALITY REVIEW

## Technical Debt

### HIGH PRIORITY
| Issue | Location | Description |
|-------|----------|-------------|
| **No TypeScript strict mode** | `backend/tsconfig.json` | `strict: true` is set but `any` types used in several places |
| **Inline `any` types** | `frontend/src/pages/orders/OrdersPage.tsx:44` | `useForm<any>()` used instead of proper typing |
| **Raw SQL subprocess** | `backend/src/routes/backup.ts` | Direct pg_dump/psql without timeout handling |
| **API URL hardcoded** | `frontend/src/api/client.ts:4` | `http://localhost:3001/api` should be env-configurable |

### MEDIUM PRIORITY
| Issue | Location | Description |
|-------|----------|-------------|
| **Error logging** | `backend/src/index.ts:35` | `console.error` only; no structured logging |
| **Type assertions** | `backend/src/routes/orders.ts:30` | `status as any` used frequently |
| **Magic numbers** | `backend/src/routes/reports.ts:64` | `quantity: { lte: 10 }` hardcoded |
| **No tests** | Entire project | No unit/integration/e2e tests |
| **Inline styles** | `frontend/src/pages/reports/ReportsPage.tsx:15` | MiniBar uses inline `style` instead of Tailwind |

### LOW PRIORITY
| Issue | Location | Description |
|-------|----------|-------------|
| **Empty catch blocks** | Multiple routes | `.catch(() => {})` — silently ignores errors |
| **Comment quality** | Seed file has commented-out code | Clean up comments |
| **Mixed naming** | Backend uses `snake_case` query params, camelCase everywhere else | Consistent |
| **No input mask** | Phone number free text | Consider phone number formatting |

## Code Smells
| Smell | Location | Issue |
|-------|----------|-------|
| **Long functions** | `CustomerProfile.tsx` (672 lines) | Component handles too many concerns |
| **God component** | `InvoicesPage.tsx` (614 lines) | Complex page with 4 modals |
| **Duplicate logic** | `formatKWD` utility vs String formatting | Centralize formatting |
| **Silent errors** | Multiple `.catch(() => {})` | At least log the error |

## Refactoring Opportunities
| Priority | Refactoring | Benefit |
|----------|-------------|---------|
| High | Extract shared validation to separate module | DRY Zod schemas |
| High | Create reusable API query hooks | Reduce duplication |
| Medium | Split large components (CustomerProfile, InvoicesPage) | Maintainability |
| Medium | Add proper error boundaries | Better UX on crashes |
| Low | Centralize constants (status enums, payment methods) | Single source of truth |

---

# 19. SYSTEM DEPENDENCY MAP

## Internal Dependencies
```text
Frontend
  ├── api/client.ts (base)
  ├── api/auth.ts → backend: /api/auth
  ├── api/customers.ts → backend: /api/customers
  ├── api/examinations.ts → backend: /api/examinations
  ├── api/inventory.ts → backend: /api/inventory
  ├── api/orders.ts → backend: /api/orders
  ├── api/invoices.ts → backend: /api/invoices
  ├── api/employees.ts → backend: /api/employees
  ├── api/reports.ts → backend: /api/reports
  ├── api/backup.ts → backend: /api/backup
  ├── context/AuthContext.tsx → stores JWT
  ├── components/ui/* → reusable UI components
  ├── components/layout/* → App shell (Sidebar, Header)
  └── pages/* → Route pages

Backend
  ├── src/index.ts → Express app, mounts all routes
  ├── src/middleware/auth.ts → JWT verification (req.user)
  ├── src/middleware/role.ts → Role guard
  ├── src/lib/prisma.ts → PrismaClient (singleton)
  ├── src/routes/* → Feature modules
  └── prisma/schema.prisma → Database schema
```

## External Dependencies
```text
OptiVision System
  ├── PostgreSQL 14+ (database)
  ├── pg_dump / psql (backup/restore)
  ├── Node.js 18+
  └── npm packages (see package.json)
```

## Critical Modules
| Module | Criticality | Reason |
|--------|-------------|--------|
| **Prisma Client** | Critical | Single point of data access |
| **Auth Middleware** | Critical | Guards all protected routes |
| **Invoice Creation** | Critical | Complex transaction with multiple side effects |
| **Backup System** | High | Depends on external PostgreSQL binaries |
| **Order + Inventory Sync** | High | Data integrity across two entities |

---

# 20. DEVELOPER ONBOARDING GUIDE

## What to Read First
1. **README.md** — Project overview, quick start
2. **backend/prisma/schema.prisma** — Data model (foundation of everything)
3. **backend/src/index.ts** — App entry, routing, error handling
4. **frontend/src/App.tsx** — Routes, guards, layout
5. **backend/src/routes/invoices.ts** — Most complex business logic (understand the transaction pattern)
6. **frontend/src/types/index.ts** — Shared interfaces

## Important Files

### Backend
| File | Why |
|------|-----|
| `src/lib/prisma.ts` | Prisma singleton with adapter |
| `src/middleware/auth.ts` | JWT verification |
| `src/middleware/role.ts` | Role authorization |
| `src/routes/auth.ts` | Login flow |
| `src/routes/orders.ts` | Inventory sync transaction |
| `src/routes/invoices.ts` | Multi-step invoice creation |
| `src/routes/backup.ts` | pg_dump/psql integration |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.ts` | Seed data |

### Frontend
| File | Why |
|------|-----|
| `src/api/client.ts` | Axios instance with auth interceptor |
| `src/context/AuthContext.tsx` | Auth state management |
| `src/pages/orders/OrdersPage.tsx` | Complex form with FieldArray |
| `src/pages/invoices/InvoicesPage.tsx` | Multi-modal page, date filtering |
| `src/pages/inventory/InventoryPage.tsx` | Dynamic form by type + SKU validation |
| `src/components/ui/Button.tsx` | Reusable component pattern |
| `src/types/index.ts` | All TypeScript interfaces |

## Key Development Patterns
1. **Route -> Validation -> Prisma Transaction -> Response** — All backend routes
2. **useQuery / useMutation + QueryClient.invalidateQueries** — All frontend data operations
3. **useForm + zodResolver** — Form validation pattern
4. **Dynamic form fields** by `InventoryItem.type`
5. **Admin guards** at both frontend (`AdminRoute`) and backend (`requireRole`)

## Common Pitfalls
| Pitfall | Solution |
|---------|----------|
| Forgetting to invalidate query cache | Always call `invalidateQueries` after mutations |
| Inventory quantity desync | Always use Prisma transactions for order operations |
| JWT not refreshed | Plan for 8-hour expiry; user must re-login |
| Missing CORS errors | Backend uses `origin: '*'` which allows all |
| pg_dump/psql not in PATH | Use full binary path or Windows fallback search |

## Recommended Learning Path
1. Understand PostgreSQL + Prisma schema
2. Read auth flow (login → JWT → middleware)
3. Study simple route (customers) → complex route (invoices)
4. Study frontend data layer (api/* → React Query hooks)
5. Study backup system (pg_dump integration)
6. Understand deployment (PM2, env vars)

---

# 21. PROJECT COMPLEXITY ASSESSMENT

## System Size
**Medium** (approximately 10,000+ lines across 50+ source files)

## Estimated Development Effort

### MVP Effort
| Phase | Effort | Key Deliverables |
|-------|--------|------------------|
| Backend Setup | 1 week | Express, Prisma, Auth, basic CRUD |
| Frontend Setup | 1 week | Vite, Tailwind, Router, Auth |
| Core Features | 3 weeks | Customers, Examinations, Orders, Invoices |
| Inventory | 1 week | Full inventory with SKU system |
| Reports | 1 week | Dashboard, financial, customer report |
| Backup | 1 week | pg_dump integration, auto-backup |
| Polish & QA | 1 week | Error handling, edge cases, UI polish |
| **Total MVP** | **~9 weeks** | **1-2 developers** |

### Current Version Effort
- Existing codebase: ~9-12 weeks with 2 developers
- Current state (inclusive of all features): ~14-18 weeks if rebuilding from scratch

## Team Size Required
| Role | Full-Time | Notes |
|------|-----------|-------|
| Full-Stack Developer | 1-2 | TypeScript, React, Node.js |
| UI/UX Designer | 0.5 (part-time) | For production polish |
| QA Engineer | 0.5 (part-time) | Testing, edge cases |
| DevOps | 0.25 (part-time) | CI/CD, deployment |

Estimated: **2 full-time** developers for maintenance

## Maintenance Complexity
| Factor | Rating (1-5) | Notes |
|--------|--------------|-------|
| Code Complexity | 3 | Clean architecture but some large components |
| Testing Gap | 5 | No tests means cautious refactoring |
| Dependencies | 2 | Modern, well-maintained packages |
| Database Schema | 2 | Simple relational model with clear relationships |
| Deployment | 2 | Simple PM2 setup |
| **Overall** | **3 (Moderate)** | |

---

# 22. REBUILD ESTIMATION

## Time to Rebuild
| Phase | Duration | Team |
|-------|----------|------|
| Requirements & Design | 1 week | Architect + PM |
| Backend (Auth + Core) | 3 weeks | 2 developers |
| Frontend (Shell + Core) | 3 weeks | 2 developers |
| Inventory + Orders | 2 weeks | 2 developers |
| Invoices + Payments | 2 weeks | 2 developers |
| Reports + Backup | 2 weeks | 2 developers |
| Testing & Polish | 2 weeks | 2 developers + QA |
| Deployment | 1 week | DevOps |
| **Total** | **16 weeks** | **2 full-stack + QA + DevOps** |

## Required Team Roles
| Role | Count | Skills |
|------|-------|--------|
| Full-Stack Engineer | 2 | TypeScript, React, Node.js, PostgreSQL, Prisma |
| QA Engineer | 1 | Manual + automation testing |
| DevOps Engineer | 0.5 | Docker, CI/CD, PostgreSQL admin |
| UI/UX Designer | 0.5 | Tailwind CSS, responsive design |

## Required Skills
- **Frontend**: React 18, TypeScript, TanStack Query, React Hook Form, Zod, Tailwind CSS, Vite
- **Backend**: Express.js, TypeScript, Prisma ORM, PostgreSQL, JWT auth, Zod validation
- **DevOps**: PM2, PostgreSQL administration, pg_dump/psql, Windows/Linux server management
- **Domain**: Optical shop operations (prescriptions, order workflow, billing)

## Infrastructure Requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Server CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB SSD | 50 GB SSD |
| Database | PostgreSQL 14 | PostgreSQL 16 + PgBouncer |
| Node.js | 18.x LTS | 20.x LTS |
| Network | Static IP/Load balancer | HTTPS reverse proxy |

---

# 23. FINAL SUMMARY

## Complete Feature List
| # | Feature | Status |
|---|---------|--------|
| 1 | JWT Authentication (8h expiry) | ✅ |
| 2 | Role-Based Access (Admin/Employee) | ✅ |
| 3 | Password Change | ✅ |
| 4 | Customer CRUD | ✅ |
| 5 | Customer Search (name/phone) | ✅ |
| 6 | Family Linking (parent/child) | ✅ |
| 7 | Eye Examination Recording (OD/OS) | ✅ |
| 8 | Prescription Entry (SPH, CYL, AXIS, ADD, IPD, Height) | ✅ |
| 9 | Order CRUD with Status Workflow | ✅ |
| 10 | Multi-Item Orders (inventory + custom) | ✅ |
| 11 | Inventory-Dependent Quantity Sync | ✅ |
| 12 | Invoice Generation from Orders | ✅ |
| 13 | Partial Payment Tracking | ✅ |
| 14 | Invoice Status Auto-Calculation | ✅ |
| 15 | Printable A4 Invoice | ✅ |
| 16 | Period-Based Collective Report (Excel Export) | ✅ |
| 17 | Inventory Management (Frames, Lenses, Accessories) | ✅ |
| 18 | SKU Auto-Generation | ✅ |
| 19 | Real-Time SKU Availability Check | ✅ |
| 20 | Low Stock Alerts | ✅ |
| 21 | Employee CRUD (Admin) | ✅ |
| 22 | Dashboard Summary with Stats | ✅ |
| 23 | Customer History Report | ✅ |
| 24 | Financial Reports (Admin) | ✅ |
| 25 | Database Backup (pg_dump) | ✅ |
| 26 | Database Restore (psql) | ✅ |
| 27 | Upload-Based Restore | ✅ |
| 28 | Automated Backup Scheduling | ✅ |
| 29 | Backup Retention Management | ✅ |
| 30 | Settings Persistence (password, language) | ✅ |

## Architecture Summary
- **Pattern**: Layered architecture (React → Express → Prisma → PostgreSQL)
- **Auth**: JWT with 8h expiry, ADMIN/EMPLOYEE roles
- **API**: RESTful, Zod-validated, Prisma transactions
- **Frontend**: SPA with React Query for server state, React Hook Form + Zod for forms
- **Backup**: Native PostgreSQL pg_dump/psql with auto-scheduler

## Database Summary
- **7 tables**: User, Customer, Examination, InventoryItem, Order, OrderItem, Invoice, Payment
- **2 enums**: OrderStatus, InvoiceStatus, ItemType, Role
- **Relationships**: Customer self-ref (family), Customer→Examination→Order→Invoice chain
- **Key constraint**: SKU unique, Phone unique (when set), Invoice-Order linking

## Security Summary
| Area | Status |
|------|--------|
| Authentication | ✅ JWT + bcrypt |
| Authorization | ✅ Role-based (ADMIN/EMPLOYEE) |
| Input Validation | ✅ Zod on all endpoints |
| SQL Injection | ✅ Prevented via Prisma |
| CORS | ⚠️ Wildcard |
| Rate Limiting | ❌ Missing |
| Secrets | ⚠️ .env in repo |
| HTTPS | ❌ Not configured |

## Technical Risks
| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| `.env` committed to Git | Critical | Credential leak | Add to `.gitignore`, rotate secrets |
| No backups for backups | High | Backup file corruption | Store backups off-server |
| No database connection retry | Medium | App crash on DB restart | Add retry logic |
| No input sanitization on search | Low | Potential ORM query issues | Prisma parameterized queries mitigate |
| Silent exception swallows | Medium | Hidden data integrity issues | Add proper error logging |
| No monitoring/alerting | Medium | Missed failures | Add PM2 + health check monitoring |

## Recommended Improvements

### Immediate (Security)
1. **Add `.env` to `.gitignore`** and rotate all credentials
2. **Change JWT_SECRET** from default
3. **Add rate limiting** to login endpoint
4. **Restrict CORS** in production

### Short-term (Quality)
5. **Add pagination** to customer orders/exams lists
6. **Add unit tests** for business logic (inventory sync, invoice creation)
7. **Add integration tests** for API endpoints
8. **Split large components** (CustomerProfile, InvoicesPage)

### Medium-term (Features)
9. **Add audit trail** (created_by, updated_by on records)
10. **Add email notifications** for invoices/orders
11. **Add multi-language support** (currently English + Arabic UI elements)
12. **Add customer purchase history analytics**

### Long-term (Architecture)
13. **Dockerize** the application
14. **Add CI/CD pipeline** (GitHub Actions)
15. **Implement refresh token rotation**
16. **Add read replicas** for reporting queries
17. **Consider microservices** for backup integration

## Critical Components
| Component | Why Critical |
|-----------|--------------|
| **Invoice Creation (backend/src/routes/invoices.ts:66-124)** | Complex transaction: create invoice + link orders + record payment + invalidate queries |
| **Order + Inventory Sync (backend/src/routes/orders.ts:58-91)** | Dual write: order creation and inventory decrement in transaction |
| **Auth Middleware (backend/src/middleware/auth.ts)** | Single point of access control |
| **Prisma Client Singleton (backend/src/lib/prisma.ts)** | Database access layer, must be properly initialized |
| **Backup System (backend/src/routes/backup.ts)** | Depends on external binaries, platform-specific paths |

## Key Takeaways
1. **OptiVision** is a production-grade optical shop management system built on **TypeScript + React + Express + PostgreSQL**
2. The system models the complete optical shop workflow: Customer → Examination → Order → Invoice → Payment
3. **Prisma ORM** provides type-safe database access with transactions for data integrity
4. **JWT authentication** with role-based access control (ADMIN/EMPLOYEE)
5. **Inventory synchronization** is handled within Prisma transactions to prevent stock desync
6. **Backup system** uses native PostgreSQL tools (pg_dump/psql) with automatic scheduling
7. The codebase is **medium-sized** (~10K+ lines), well-structured, but lacks **tests** and has some **security concerns** (`.env` in repo, weak default JWT secret)
8. Rebuilding from scratch would require approximately **16 weeks** with a team of **2-3 developers**