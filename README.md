# OptiVision — Optical Shop Management System

A production-grade system for managing an optical shop. Manages customers, eye examinations, orders, invoices, inventory, and financials.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### First Time Setup

1. **Configure database** — Edit `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/optivision"
JWT_SECRET="your-secret-key-change-this"
PORT=3001
```

2. **Run setup script** (Windows):
```
setup.bat
```

Or manually:
```bash
cd backend && npm install
cd ../frontend && npm install
cd ../backend
cp .env.example .env
# Edit .env with your DB credentials
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
```

### Start System

**Windows:** Double-click `start.bat`

**Linux/Mac:**
```bash
chmod +x start.sh && ./start.sh
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

**LAN Access:** Other devices on the same network can access via `http://YOUR-IP:5173`

### Default Login
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@optivision.com | admin123 |
| Staff | staff@optivision.com | employee123 |

---

## Features

| Module | Description | Access |
|--------|-------------|--------|
| Dashboard | Stats, recent orders, financial overview | All |
| Customers | Full profiles, searchable, history | All |
| Customer Profile | Latest exam, orders, invoices, full history | All |
| Examinations | Eye data (SPH/CYL/Axis/ADD/IPD) — full table | All |
| Orders | Create from customer+exam+inventory, status tracking | All |
| Invoices | Generated from orders, payment tracking | All |
| Invoice Print | Professional printable invoice (A4) | All |
| Inventory | Frames, Lenses, Accessories with dynamic forms | All |
| Reports | Customer/order/inventory summary dashboard | All |
| Customer Report | Printable A4 full history report | All |
| Employees | User management (add/edit/deactivate) | Admin |
| Financial Reports | Revenue analytics, collection rate | Admin |
| Backup & Restore | pg_dump download + browser file restore | Admin |

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + React Query
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (8h expiry) + role-based (Admin/Employee)
- **Currency:** KWD (Kuwaiti Dinar, 3 decimal places)

## Backup & Restore

**Backup:** Admin → Backup page → Download Backup (.sql)

**Restore via UI:** Admin → Backup page → Upload .sql file → Restore Database

**Restore via CLI (alternative):**
```bash
cd backend
./scripts/restore.sh backups/optivision_backup_XXXX.sql
```

> Backup/restore requires `pg_dump` and `psql` to be in your system PATH (included with PostgreSQL).
