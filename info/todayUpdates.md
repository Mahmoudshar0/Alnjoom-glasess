# Today's Updates — 2026-06-16

> Session work performed on the **OptiVision** Optical Shop Management System.

---

## 1. Payment History — Detailed Tracking View

### Problem
Partial payments existed in the database (`Payment` table) but were displayed as a simple one-line entry (`date · method — amount`). No way to see payment dates, notes, or sequence at a glance.

### Changes Made

#### `frontend/src/pages/invoices/InvoicesPage.tsx`
- **Payment History table** — Replaced the simple list with a full `<table>` showing:
  - `#` (sequential number), Date, Method (pill badge), Notes, Amount
  - Green **Total Paid** footer row (`bg-emerald-50`)
- **Add Payment modal** — Added a **Payment Date** field (date picker, defaults to today) so staff can record the exact date of a past payment
- **`onPaySubmit`** — Now sends `date` field to the backend alongside `amount`, `method`, `notes`

#### `frontend/src/pages/customers/CustomerProfile.tsx`
- **Invoice History section** — Each invoice row is now **clickable/expandable**
  - Shows payment count hint (`"2 payments"`) in the row
  - Expand arrow (ChevronDown/Up) appears when payments exist
  - Expanding reveals the same detailed payment table (Date, Method, Notes, Amount, Total Paid footer)
- Added `expandedInvoice` state and `ChevronDown`, `ChevronUp` icon imports

#### `frontend/src/api/invoices.ts`
- Added `date?: string` to the `addPayment` function signature

> **Backend note:** No backend changes needed — `POST /api/invoices/:id/payments` already accepted an optional `date` field and stored it correctly.

---

## 2. Search Bar — Invoices Page

### Problem
No way to quickly find a specific customer's invoices without scrolling through a long list.

### Changes Made

#### `frontend/src/pages/invoices/InvoicesPage.tsx`
- Added `searchQuery` state
- Added `filteredInvoices` computed array — filters by **customer name** or **customer phone** (case-insensitive, client-side)
- **Search bar UI** — Full-width input with Search icon on the left and a clear (×) button that appears when text is present
- **Summary cards** (Total Billed, Collected, Outstanding) now reflect only the filtered invoices
- **Empty state** — shows a Search icon + `"No results for '...'"` message when nothing matches
- Compatible with the existing status tabs (ALL/UNPAID/PARTIAL/PAID) and date period filter

---

## 3. Search Bar — Orders Page

### Problem
Same as invoices — no search to quickly locate a customer's orders.

### Changes Made

#### `frontend/src/pages/orders/OrdersPage.tsx`
- Added `searchQuery` state and `filteredOrders` computed array
- Filters by **customer name** or **customer phone** (client-side)
- **Search bar UI** — identical pattern to the invoices search bar
- Status tab count badges (`(3)`) still count from the full unfiltered list for reference
- Empty state shows Search icon + "No results" message when needed
- Added `X` icon import from lucide-react

---

## 4. Searchable Select (Combobox) — Modal Customer Dropdowns

### Problem
The customer `<select>` dropdown in the New Examination, New Order, and New Invoice modals was a plain HTML select — unusable when there are many customers (no search/filter capability).

### Changes Made

#### `frontend/src/components/ui/SearchableSelect.tsx` *(NEW FILE)*
Reusable combobox component:
- Click trigger button → opens dropdown with an embedded **search input**
- Type to filter options by `label` (name) or `sublabel` (phone)
- Checkmark (✓) next to selected option
- Small (×) button inside trigger to clear the selection
- Closes on outside click or `Escape` key
- Error state support (red border + message below)
- Required marker (`*`) in label

#### `frontend/src/pages/examinations/ExaminationsPage.tsx`
- Replaced `<Select label="Customer *">` with `<SearchableSelect>`
- Added `customerSelectValue` state (bridges the combobox to `react-hook-form` via `setValue`)
- State properly cleared on modal open/close

#### `frontend/src/pages/orders/OrdersPage.tsx`
- Replaced `<Select label="Customer *">` with `<SearchableSelect>`
- Added `customerSelectValue` state; selecting a customer also updates `selectedCustomer` (for examination lazy-load) and clears `examinationId`

#### `frontend/src/pages/invoices/InvoicesPage.tsx`
- Replaced `<Select label="Customer *">` with `<SearchableSelect>`
- Wired directly to existing `selectedCustomerId` state (no react-hook-form involved here)

---

## 5. Staff Performance Report *(NEW FEATURE)*

### Problem
No visibility into which employee created which orders/invoices, or how much each staff member billed and collected per day.

### Changes Made

#### `backend/src/routes/reports.ts`
- Added `GET /api/reports/staff` endpoint (Admin only via `requireRole('ADMIN')`)
- Query parameters: `dateFrom`, `dateTo` (ISO strings, optional)
- Aggregates:
  - All `Order` records with `createdById` in the date range
  - All `Invoice` records with `createdById` in the date range
- Returns per-staff totals **and** a chronological daily breakdown array
- Response shape:
  ```json
  {
    "staffStats": [
      {
        "user": { "id": "...", "name": "...", "role": "ADMIN|EMPLOYEE" },
        "totalOrders": 12,
        "totalOrderValue": 3400.000,
        "totalInvoices": 9,
        "totalBilled": 3200.000,
        "totalCollected": 2900.000,
        "daily": [
          {
            "date": "2026-06-15",
            "orders": 3,
            "orderValue": 800.000,
            "invoices": 2,
            "billed": 750.000,
            "collected": 700.000
          }
        ]
      }
    ],
    "totalUsers": 4
  }
  ```
- Sorted by `totalBilled` descending (highest earner first)

#### `frontend/src/api/reports.ts`
- Added `StaffDayData`, `StaffMemberStat`, `StaffReport` TypeScript interfaces
- Added `getStaffReport(params?)` API function

#### `frontend/src/pages/reports/StaffPerformance.tsx` *(NEW FILE)*
Full staff performance analytics page:
- **Date range filter** — From / To date pickers + Apply / Clear buttons (same UX as invoices page)
- **Summary bar** — 4 cards: Total Orders, Total Invoices, Total Billed, Total Collected (across all staff for the period)
- **Staff cards** — One card per staff member, sorted by revenue:
  - 🥇🥈🥉 Trophy / Award / Medal rank icons for top 3
  - Role badge (Admin = violet, Employee = sky)
  - **Collection rate progress bar** — green ≥90%, amber ≥60%, red below
  - KPI columns: Orders, Invoices, Billed, Collected
- **Expandable daily breakdown table** — click any card to expand:
  - Columns: Date, Orders (count badge), Order Value, Invoices (count badge), Billed, Collected, Collection %
  - Color-coded % per day (green/amber/red)
  - Dark (`bg-slate-900`) totals footer row
- Empty state with icon when no activity found

#### `frontend/src/App.tsx`
- Added `import StaffPerformance`
- Added route `/reports/staff` wrapped in `<AdminRoute>`

#### `frontend/src/pages/reports/ReportsPage.tsx`
- Added two **nav cards** between the key stats and the detail sections:
  - **Financial Reports** → `/reports/financial` (sky theme)
  - **Staff Performance** → `/reports/staff` (violet theme)
- Hover animations with arrow slide effect

---

## Summary of Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/pages/invoices/InvoicesPage.tsx` | Modified | Payment table, date field, search bar, searchable customer select |
| `frontend/src/pages/customers/CustomerProfile.tsx` | Modified | Expandable payment breakdown in invoice history |
| `frontend/src/pages/orders/OrdersPage.tsx` | Modified | Search bar, searchable customer select |
| `frontend/src/pages/examinations/ExaminationsPage.tsx` | Modified | Searchable customer select in modal |
| `frontend/src/api/invoices.ts` | Modified | `date?` field in `addPayment` |
| `frontend/src/api/reports.ts` | Modified | `getStaffReport`, staff types added |
| `frontend/src/App.tsx` | Modified | `/reports/staff` route added |
| `frontend/src/pages/reports/ReportsPage.tsx` | Modified | Financial & Staff nav cards added |
| `frontend/src/components/ui/SearchableSelect.tsx` | **NEW** | Reusable searchable combobox component |
| `frontend/src/pages/reports/StaffPerformance.tsx` | **NEW** | Staff performance analytics page |
| `backend/src/routes/reports.ts` | Modified | `GET /api/reports/staff` endpoint added |
