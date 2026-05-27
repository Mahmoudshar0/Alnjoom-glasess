# OptiVision Frontend

A modern, production-ready React frontend for an optical shop management system. Built with TypeScript, featuring comprehensive business operations including customer management, examinations, inventory, orders, invoicing, and financial reporting.

**Main Purpose**: Provide an intuitive web interface for optical shop staff to manage daily operations including patient examinations, product inventory, sales orders, and financial tracking.

**Key Frontend Features**:
- Role-based access control (Admin/User)
- Real-time data management with optimistic updates
- Professional invoice generation and printing
- Excel export capabilities for reports
- Responsive design for desktop and tablet use
- Secure JWT-based authentication

---

## Table of Contents

- [Screenshots / UI Preview](#screenshots--ui-preview)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Features](#features)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Routing System](#routing-system)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Authentication](#authentication)
- [UI & Styling](#ui--styling)
- [Reusable Components](#reusable-components)
- [Forms & Validation](#forms--validation)
- [Performance Optimizations](#performance-optimizations)
- [Accessibility](#accessibility)
- [Responsive Design](#responsive-design)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Error Handling](#error-handling)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Scalability Notes](#scalability-notes)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Screenshots / UI Preview

The application features a clean, professional interface with:

- **Dashboard**: Overview cards showing key business metrics (customers, orders, revenue)
- **Sidebar Navigation**: Collapsible navigation with role-based menu items
- **Data Tables**: Paginated, searchable tables for customers, inventory, orders, and invoices
- **Customer Profiles**: Detailed view with examination history and purchase records
- **Invoice Print View**: Clean, print-optimized layout for customer invoices
- **Reports Dashboard**: Financial reports and customer analytics with export options

All pages follow a consistent card-based layout with primary blue color scheme (#0ea5e9).

---

## Live Demo

No live demo URL configured. Deploy to Vercel, Netlify, or your preferred hosting platform using the production build.

---

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | React 18.2 | UI library with hooks and concurrent features |
| **Language** | TypeScript 5.3 | Type-safe development |
| **Build Tool** | Vite 5.0 | Fast HMR and optimized production builds |
| **Routing** | React Router DOM 6.21 | Client-side routing with nested routes |
| **State Management** | React Context + TanStack Query | Auth state + server state caching |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS framework |
| **Forms** | React Hook Form 7.49 | Performant form state management |
| **Validation** | Zod 3.22 + @hookform/resolvers | Schema-based validation |
| **HTTP Client** | Axios 1.6 | Configured API client with interceptors |
| **Icons** | Lucide React 0.312 | Consistent iconography |
| **Data Export** | xlsx + xlsx-js-style | Excel generation with styling |
| **Dev Tools** | TanStack Query DevTools | Development debugging |

---

## Project Architecture

```
src/
├── api/                    # API layer (axios instances per domain)
│   ├── auth.ts            # Authentication endpoints
│   ├── client.ts          # Base axios configuration
│   ├── customers.ts       # Customer CRUD operations
│   ├── employees.ts       # Employee management (admin)
│   ├── examinations.ts    # Eye examination records
│   ├── inventory.ts       # Product inventory
│   ├── invoices.ts        # Invoice generation
│   ├── orders.ts          # Sales orders
│   ├── reports.ts         # Analytics endpoints
│   └── backup.ts          # Database backup (admin)
├── components/
│   ├── layout/            # Application shell
│   │   ├── AppLayout.tsx  # Main layout wrapper
│   │   ├── Header.tsx     # Top navigation bar
│   │   └── Sidebar.tsx    # Navigation menu
│   └── ui/                # Reusable UI primitives
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Badge.tsx
│       ├── StatCard.tsx
│       └── LoadingSpinner.tsx
├── context/
│   └── AuthContext.tsx    # Global authentication state
├── pages/                 # Route-level page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── customers/
│   ├── examinations/
│   ├── inventory/
│   ├── orders/
│   ├── invoices/
│   ├── employees/
│   ├── reports/
│   ├── settings/
│   └── backup/
├── utils/                 # Helper functions
│   ├── format.ts          # Date/currency formatting
│   └── exportPeriodInvoicesExcel.ts
├── types/
│   └── index.ts           # Shared TypeScript interfaces
├── App.tsx                # Route definitions + auth guards
└── main.tsx               # Application entry point
```

**Architecture Patterns**:
- Feature-based folder organization under `pages/`
- Centralized API layer with domain-specific modules
- Context API for auth state, TanStack Query for server data
- Protected route wrapper (`AdminRoute`) for role-based access
- Path alias `@/` configured for clean imports

**Key types** (`src/types/index.ts`):
- `FamilyMember` — `{ id, name?, phone?, dateOfBirth? }` used for parent/children relations
- `Customer` — extended with `parentId?`, `parent?: FamilyMember`, `children?: FamilyMember[]`
- `CustomerReport` — extended with `parent?` and `children?`

**Customer API** (`src/api/customers.ts`):
- `linkChild(parentId, childId)` — `POST /customers/:id/children`
- `unlinkChild(parentId, childId)` — `DELETE /customers/:id/children/:childId`
- `createCustomer` accepts `parentId` to link on creation

---

## Features

- **Authentication**: Email/password login with JWT token storage
- **Dashboard**: Real-time business metrics overview
- **Customer Management**: CRUD operations with detailed profiles
- **Family Members**: Link customers as parent/child; each member keeps their own exams, orders, and invoices
- **Examination Records**: Track patient eye exams and prescriptions
- **Inventory Management**: Product catalog with stock tracking
- **Order Processing**: Create and manage customer orders
- **Invoicing System**: Generate, view, and print professional invoices
- **Excel Export**: Export invoice data for financial periods
- **Reports Module**:
  - Financial reports (admin-only)
  - Customer purchase analytics
- **Employee Management**: Admin-only user management
- **Backup System**: Database backup functionality (admin-only)
- **Settings**: User preferences and configuration
- **Responsive Design**: Optimized for desktop and tablet workflows

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Install dependencies
npm install
```

---

## Environment Variables

Create a `.env` file in the project root (not committed to git):

```env
# API Base URL (optional - defaults to proxy in dev)
VITE_API_URL=http://localhost:3001
```

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `VITE_API_URL` | Backend API base URL for production builds | No (dev uses proxy) | `https://api.example.com` |

**Note**: During development, Vite proxies `/api` requests to `http://localhost:3001` (see `vite.config.ts:14`).

---

## Running the Project

### Development

```bash
npm run dev
```

Starts Vite dev server on `http://localhost:5173` with hot module replacement.

### Production Build

```bash
npm run build
```

Type-checks with TypeScript, then creates optimized production bundle in `dist/`.

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing.

---

## Routing System

**Router**: React Router v6 with `BrowserRouter`

**Route Structure**:
```
/login                           → Public login page
/                                → Redirects to /dashboard
/dashboard                       → Main metrics overview
/customers                       → Customer list
/customers/:id                   → Customer profile
/customers/:id/report            → Customer analytics
/examinations                    → Examination records
/inventory                       → Product inventory
/orders                          → Sales orders
/invoices                        → Invoice list
/invoices/:id/print              → Print-optimized invoice view
/reports                         → Reports dashboard
/reports/financial               → Financial reports (ADMIN)
/employees                       → Employee management (ADMIN)
/backup                          → Database backup (ADMIN)
/settings                        → Application settings
```

**Auth Guards**:
- `AdminRoute` wrapper component restricts routes to ADMIN role users
- Unauthenticated users without valid token are redirected to `/login`
- Invalid routes redirect to `/dashboard`

**Layout System**:
- `AppLayout` wraps all authenticated routes
- `Header` + `Sidebar` provide consistent navigation
- Login page renders outside the layout

---

## State Management

**Authentication State**: React Context (`AuthContext.tsx`)
- Stores current user object and loading state
- Provides `login()`, `logout()`, and `isAdmin` computed property
- Persists JWT in `localStorage` with automatic rehydration on app load

**Server State**: TanStack Query v5
- Automatic caching, background refetching, and optimistic updates
- DevTools available in development mode
- Query keys organized by domain (customers, orders, invoices, etc.)

**No Global Client State Store**: Component-level state + URL params handle UI state (modals, filters, pagination).

---

## API Integration

**Base Client** (`api/client.ts`):
- Axios instance with base configuration
- Request interceptor attaches `Authorization: Bearer <token>` header
- Response interceptor handles 401 errors by clearing token and redirecting to login

**Domain APIs**:
- Each business domain has dedicated API module (`customers.ts`, `orders.ts`, etc.)
- All endpoints use consistent error handling patterns
- TypeScript interfaces ensure request/response type safety

**Proxy Configuration**:
- Development: `/api/*` requests proxied to backend on port 3001
- Production: Use `VITE_API_URL` environment variable

---

## Authentication

**Flow**:
1. User submits credentials on `/login`
2. `api/auth.ts` calls backend, receives JWT + user object
3. Token stored in `localStorage`, user state updated in Context
4. `AuthProvider` useEffect checks for existing token on mount and validates via `/auth/me`

**Protected Routes**:
- `AdminRoute` component checks `isAdmin` from context
- Non-admin users attempting admin routes are redirected to `/dashboard`

**Token Management**:
- No automatic refresh implemented (tokens assumed long-lived or backend handles refresh)
- Logout clears `localStorage` token and resets context state

---

## UI & Styling

**Styling Solution**: Tailwind CSS 3.4 with PostCSS

**Theme Configuration** (`tailwind.config.js`):
- Custom `DM Sans` font family
- Extended primary color palette (sky blue tones)
- All other Tailwind defaults preserved

**Design System**:
- Card-based layouts using reusable `Card` component
- Consistent spacing and typography scale
- Primary action buttons use `primary-600` with hover states
- Status badges for visual categorization (orders, invoices, inventory)

**No Dark Mode**: Application uses light theme only.

---

## Reusable Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Button` | `components/ui/Button.tsx` | Styled button with variants |
| `Card` | `components/ui/Card.tsx` | Container with shadow and padding |
| `Input` | `components/ui/Input.tsx` | Form input with label and error states |
| `Modal` | `components/ui/Modal.tsx` | Overlay dialog with backdrop |
| `Badge` | `components/ui/Badge.tsx` | Status indicator pills |
| `StatCard` | `components/ui/StatCard.tsx` | Dashboard metric display |
| `LoadingSpinner` | `components/ui/LoadingSpinner.tsx` | Centered loading indicator |
| `AppLayout` | `components/layout/AppLayout.tsx` | Authenticated app shell |
| `Sidebar` | `components/layout/Sidebar.tsx` | Navigation menu with role filtering |
| `Header` | `components/layout/Header.tsx` | Top bar with user info and logout |

---

## Forms & Validation

**Form Library**: React Hook Form 7.49

**Validation Schema**: Zod 3.22 with `@hookform/resolvers`

**Pattern**:
- Forms use `useForm` hook with Zod schema resolver
- Validation errors displayed inline below inputs
- Form submission disabled during loading states
- Consistent error messaging across login, customer forms, order creation, etc.

---

## Performance Optimizations

- **Vite Build**: Native ESM, esbuild-powered bundling, tree-shaking
- **Code Splitting**: Automatic route-based splitting via React Router + Vite
- **React Query Caching**: Reduces redundant API calls across sessions
- **Memoization**: Used selectively in list rendering and expensive computations
- **No Image Optimization**: Application does not currently handle user-uploaded images

---

## Accessibility

- Semantic HTML structure (`<main>`, `<nav>`, `<header>`)
- Form inputs include associated labels
- Focus states visible on interactive elements
- Keyboard navigation supported via standard browser behavior
- ARIA attributes not extensively implemented (future improvement area)

---

## Responsive Design

- Mobile-first Tailwind approach
- Primary layout optimized for desktop (1024px+)
- Tables may require horizontal scroll on smaller screens
- Sidebar collapses or becomes drawer on mobile (implementation-dependent)
- Print styles specifically defined for invoice printing route

**Breakpoints**: Standard Tailwind defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |

---

## Testing

No automated testing framework configured.

**Recommended Future Additions**:
- Vitest + React Testing Library for unit/component tests
- Playwright or Cypress for E2E flows (login, order creation, invoice printing)

---

## Deployment

**Build Output**: `dist/` folder contains static assets ready for deployment.

**Compatible Platforms**:
- **Vercel**: Zero-config deployment, automatic preview URLs
- **Netlify**: Drag-and-drop `dist/` or connect Git repository
- **Firebase Hosting**: Requires `firebase.json` configuration
- **Static Hosting (S3, GitHub Pages)**: Upload `dist/` contents

**Backend Dependency**: Ensure API server is accessible and CORS configured for frontend origin.

---

## CI/CD

No CI/CD pipeline configured in repository.

**Recommended Pipeline**:
1. Run `npm run build` on every push/PR
2. Fail build on TypeScript errors or failed compilation
3. Deploy `dist/` to hosting platform on main branch merge

---

## Error Handling

**Global Patterns**:
- Axios response interceptor catches 401 and redirects to login
- Form validation errors surfaced via React Hook Form
- Loading states prevent duplicate submissions
- No global error boundary implemented (errors bubble to console)

**UI Feedback**:
- `LoadingSpinner` shown during async operations
- Disabled buttons during mutations
- No toast notification system currently implemented

---

## Security

- JWT stored in `localStorage` (vulnerable to XSS; consider httpOnly cookies for production)
- All authenticated requests include bearer token
- Admin routes protected client-side only (backend must enforce authorization)
- Environment variables prefixed with `VITE_` exposed to client bundle (never store secrets here)
- No Content Security Policy configured in Vite

---

## Troubleshooting

### Styles Not Applying

Ensure Tailwind classes are used in files covered by `tailwind.config.js` content glob.

### API Calls Failing in Development

Verify backend server is running on port 3001, or adjust proxy target in `vite.config.ts`.

### Login Redirect Loop

Clear `localStorage` token if backend rejects it. Check network tab for `/auth/me` failures.

### TypeScript Errors on Build

Run `npm run build` locally to catch type errors before deployment.

---

## Scalability Notes

- Modular API layer allows easy addition of new domains
- Feature-based page structure supports team scaling
- TanStack Query provides foundation for optimistic updates and real-time sync
- Component library can evolve into shared design system
- Path aliasing (`@/*`) keeps imports clean as codebase grows

---

## Implemented Features (recent)

- **Family Members** — customers can be linked as parent/child; profile shows parent banner and children list with link/unlink/create-new flows

- **Customer search stability** — `CustomersList` uses `placeholderData: keepPreviousData` on the search query so the page stays mounted while results load; previously each keystroke triggered `isLoading → true`, unmounting the page and dropping input focus.

- **Admin invoice edit** — Admins see an **Edit** button (guarded by `isAdmin`) inside each expanded invoice row. The modal allows editing all five mutable fields: Total Amount, Paid Amount, Status (UNPAID / PARTIAL / PAID), Payment Method, and Notes. Editing amounts is a direct DB override and does not create a payment history record — a warning is shown in the UI. Status can be set explicitly or left to auto-derive from the amounts on the backend. API: `PUT /api/invoices/:id`.

## Future Improvements

- Add React Hook Form + Zod to all data entry forms (currently inconsistent)
- Implement global toast notification system
- Add error boundary for graceful crash recovery
- Introduce automated testing (Vitest + RTL)
- Add pagination and advanced filtering to all list views
- Implement dark mode toggle
- Add loading skeletons for better perceived performance
- Create shared form components to reduce boilerplate
- Add keyboard shortcuts for power users
- Implement virtualized tables for large datasets

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Follow existing code style, use TypeScript strictly, and ensure builds pass before submitting PRs.

---

## License

This project is proprietary. All rights reserved.

---

## Author

Optical shop management system frontend - Built for Eye Shop operations.

---

**Generated Documentation**: This README was auto-generated based on actual project analysis of source code, configuration files, and package dependencies as of May 2026.
