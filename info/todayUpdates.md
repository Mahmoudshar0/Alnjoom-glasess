# Today's Updates — 2026-06-30

> Session work performed on the **OptiVision** Optical Shop Management System.

---

## 1. Bug Fix — ExaminationsPage `setValue` ReferenceError

### Problem
Creating a new examination threw `Uncaught ReferenceError: setValue is not defined`. Even after selecting a customer from the `SearchableSelect`, the form still showed a validation error "Customer is required" because the `setValue` function was never destructured from `useForm`.

### Changes Made

#### `frontend/src/pages/examinations/ExaminationsPage.tsx`
- Added `setValue` to the `useForm` destructuring:
  ```diff
  - const { register, handleSubmit, reset, formState: { errors } } = useForm<ExamForm>({
  + const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExamForm>({
  ```

---

## 2. Mock Data Seed — Full Database Population

### Problem
Database was empty, making feature testing difficult.

### Changes Made

#### `backend/prisma/seed-mock.ts` *(NEW FILE)*
Comprehensive seed covering all models:
- **2 Users**: Admin (`admin@optivision.com` / `admin123`) + Employee (`staff@optivision.com` / `employee123`)
- **12 Customers**: Arabic names with phones, emails, DOBs, addresses; 2 family pairs linked (parent→child)
- **8 Examinations**: Full OD/OS prescriptions (SPH, CYL, Axis, ADD, IPD, Height), varying doctors
- **15 Inventory items**: 6 Frames (Ray-Ban, Oakley, Gucci, Tom Ford, Silhouette, Generic), 5 Lenses (Essilor, Zeiss, Hoya), 4 Accessories
- **12 Orders + 12 Invoices + Payments**: Mix of all statuses (NEW/IN_PROGRESS/READY/DELIVERED, UNPAID/PARTIAL/PAID), spread across past 90 days

Run with: `npx ts-node prisma/seed-mock.ts`

---

## 3. Employee Seed — 3 New Staff Accounts

### Changes Made

#### `backend/prisma/seed-employees.ts` *(NEW FILE)*
Adds 3 employee accounts using `upsert` (safe to re-run):

| Name | Email | Password |
|---|---|---|
| سارة المنصوري | `sara.mansouri@optivision.com` | `sara@2024` |
| عمر الحربي | `omar.harbi@optivision.com` | `omar@2024` |
| لينا الشهري | `lina.shahri@optivision.com` | `lina@2024` |

Run with: `npx ts-node prisma/seed-employees.ts`

---

## 4. Employee-Linked Data Seed — Customers, Orders, Invoices Per Staff

### Problem
New employees had no sales data, so the Staff Performance report was empty for them.

### Changes Made

#### `backend/prisma/seed-employee-data.ts` *(NEW FILE)*
Seeds customers, orders, and invoices attributed to each new employee via `createdById`:

| Employee | Customers | Orders | Invoice Mix |
|---|---|---|---|
| سارة المنصوري | وليد الرشيدي, أسماء الفيفي, بدر العنزي | 3 | PAID / PARTIAL / UNPAID |
| عمر الحربي | حمد الخالدي, دانة السلمي, فيصل الدوسري | 3 | PAID / PARTIAL / UNPAID |
| لينا الشهري | مريم الشمري, سلطان الغامدي | 2 | PAID / PARTIAL |

Each order includes frame + 2 lenses + accessory from existing inventory.

Run with: `npx ts-node prisma/seed-employee-data.ts`

---

## 5. Staff Performance Report — Zero-Sales Employees Now Always Visible

### Problem
Employees with no orders or invoices were invisible in the Staff Performance report — only those who had created ≥1 record appeared.

### Changes Made

#### `backend/src/routes/reports.ts`
After aggregating orders and invoices into `statsMap`, the code now merges **all active users** so every employee appears even with zero stats:
```typescript
// Ensure every active user appears — even those with zero sales
for (const u of allUsers) {
  if (!statsMap[u.id]) {
    statsMap[u.id] = {
      user: u,
      totalOrders: 0, totalOrderValue: 0,
      totalInvoices: 0, totalBilled: 0, totalCollected: 0,
      daily: {},
    };
  }
}
```
Zero-sales employees sort to the bottom of the ranked list.

#### `backend/dist/routes/reports.js`
Same change applied to the compiled file so the running backend picks it up immediately without a full rebuild.

---

## 6. Invoices Page — Employee Summary Cards Show Today's Personal Sales

### Problem
The 3 summary cards at the top of `/invoices` (Total Billed, Total Collected, Outstanding) showed totals across **all invoices in the system**, regardless of who was logged in. Employees should only see their own today's numbers.

### Changes Made

#### `frontend/src/pages/invoices/InvoicesPage.tsx`
- Added `user` to `useAuth()` destructuring (was only `isAdmin`)
- Computed `todayMyInvoices`: invoices created today (`createdAt >= todayStart`) AND created by the current user (`createdBy.id === user.id`)
- Summary cards are now **role-aware**:
  - **Admin**: shows totals from `filteredInvoices` (all invoices, respects tab/date/search filters) — unchanged behavior
  - **Employee**: shows totals from `todayMyInvoices` (today only, own invoices only)
- Card titles change accordingly: `"Today's Billed"`, `"Today's Collected"`, `"Today's Outstanding"`
- Each employee card shows a subtitle hint: `"Your sales today"`, `"Payments received today"`, `"N invoice(s) today"`

---

## 7. Staff Performance Report — Customer Names + Clickable Invoice Links

### Problem
The expandable daily breakdown in the Staff Performance report showed only aggregate numbers (billed, collected totals) with no way to see which customer each invoice was for or navigate to the invoice detail.

### Changes Made

#### `backend/src/routes/reports.ts`
- Added `customer: { select: { name: true } }` to the invoice select query
- Added `InvoiceRow` type: `{ id, customerName, totalAmount, paidAmount }`
- Added `invoiceRows: InvoiceRow[]` to each day bucket (initialized as `[]`)
- Each invoice now pushes into its day's `invoiceRows` array with customer name

#### `backend/dist/routes/reports.js`
Same changes applied to compiled JS for immediate effect.

#### `frontend/src/api/reports.ts`
- Added `StaffInvoiceRow` interface: `{ id, customerName, totalAmount, paidAmount }`
- Added `invoiceRows: StaffInvoiceRow[]` field to `StaffDayData`

#### `frontend/src/pages/reports/StaffPerformance.tsx`
- Added `Link` import from `react-router-dom` and `ExternalLink` from lucide-react
- **Completely rewrote the daily breakdown UI**: instead of one flat table per staff member, each day now renders its own mini-section:
  - **Day header**: date + order count + collection % (color-coded)
  - **Invoice rows table**: Customer name | Billed | Collected | Balance (red if > 0) | `🔗` Link button
  - **`ExternalLink` button** on each row navigates to `/invoices`
  - **Day Total dark footer row**: aggregated billed / collected / collection %
- **Grand Total bar** at the bottom of each expanded staff card

---

## 8. Staff Performance — Invoice Detail Modal on Row Click *(2026-06-29)*

### Problem
Clicking an invoice row in the Staff Performance expanded daily breakdown only showed a small external-link icon that navigated away to `/invoices`. There was no way to see the full details of an invoice without leaving the page.

### Changes Made

#### `frontend/src/pages/reports/StaffPerformance.tsx`
- Added a new **`InvoiceDetailModal`** component rendered inline within `StaffPerformance`.
- State variable `selectedInvoiceId` (string | null) tracks which invoice is open.
- When any invoice row (`<tr>`) is clicked, `onInvoiceClick(inv.id)` is called → sets `selectedInvoiceId` → modal opens.
- The entire `<tr>` is now clickable (not just the icon), with `cursor-pointer` and `hover:bg-sky-50`.
- Removed the old `<Link to="/invoices">` navigation from the ExternalLink cell — replaced with the modal trigger.
- `StaffCard` receives a new `onInvoiceClick` prop and passes it down to each invoice row.

**Modal contents:**

| Section | Details |
|---------|---------|
| **Header** | Short invoice ID · Print button (opens `/invoices/:id/print` in new tab) · Close (×) |
| **Meta cards** | Customer name & phone · Invoice date · Status badge (Paid / Partial / Unpaid) + payment method |
| **Orders** | Each linked order with status badge + item table (name, SKU, qty, unit price, line total, notes) |
| **Payment History** | Numbered table: date · method badge · amount per installment |
| **Financial Summary** | Total Billed / Total Collected / Outstanding Balance + animated progress bar |
| **Notes** | Amber box displayed only if notes exist |

**Behaviour:**
- Fetches full invoice via `getInvoice(id)` (React Query — cached after first open).
- Shows a spinner while loading.
- `Escape` key closes the modal; clicking the backdrop closes it.
- Print button opens `/invoices/:id/print` in a new tab without closing the modal.

---

## Summary of Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/pages/examinations/ExaminationsPage.tsx` | Fixed | Added `setValue` to `useForm` destructuring |
| `frontend/src/pages/invoices/InvoicesPage.tsx` | Modified | Employee today-only summary cards; `user` added to `useAuth` |
| `frontend/src/pages/reports/StaffPerformance.tsx` | Modified | Invoice Detail Modal on row click; per-invoice customer name rows + modal trigger |
| `frontend/src/api/reports.ts` | Modified | `StaffInvoiceRow` type + `invoiceRows` in `StaffDayData` |
| `backend/src/routes/reports.ts` | Modified | Zero-sales employee visibility fix; `invoiceRows` with customer name per day |
| `backend/dist/routes/reports.js` | Modified | Compiled JS patched to match TS source (immediate effect) |
| `backend/prisma/seed-mock.ts` | **NEW** | Full mock data seed (customers, exams, inventory, orders, invoices) |
| `backend/prisma/seed-employees.ts` | **NEW** | 3 employee accounts (sara, omar, lina) |
| `backend/prisma/seed-employee-data.ts` | **NEW** | Employee-linked customers, orders, invoices for staff report testing |

---

## 9. Backup Restore — Production-Safe Pipeline *(2026-06-30)*

### Problem
The restore endpoint called `psql` directly on the live database without any safety net. `psql` returns exit code 0 even when SQL statements fail (e.g., `CREATE TABLE` conflicting with existing Prisma-managed tables), so the API responded "Database restored successfully" while nothing was actually restored.

Additionally, there was no pre-restore backup, meaning a failed or corrupted restore could wipe production data with no recovery path.

### Root Causes
1. `psql` silently ignores SQL errors and returns exit code 0 by default — false success
2. No pre-restore safety backup — destructive with no fallback
3. `pg_dump` was missing `--clean --if-exists` flags — backups didn't include `DROP TABLE IF EXISTS`, so `CREATE TABLE` always conflicted on an existing database

### Changes Made

#### `backend/src/routes/backup.ts`
Replaced the direct psql call with a **3-step restore pipeline**:

**Step 1 — `createSafetyBackup()`**
Before touching anything, runs `pg_dump --clean --if-exists` to save a `pre-restore-safety-<timestamp>.sql` file.
If this fails → restore is aborted, production data untouched.

**Step 2 — `cleanSchema()`**
Runs: `DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ...`
Wipes all existing tables so the SQL file can run `CREATE TABLE` on a clean slate.
If this fails → restore is aborted, production data untouched (safety backup already exists).

**Step 3 — `runPsqlRestore()`**
Runs psql with `-v ON_ERROR_STOP=1 --single-transaction`:
- `ON_ERROR_STOP=1` → psql exits with non-zero code on first SQL error (real errors now surface)
- `--single-transaction` → entire restore wrapped in one transaction; failure rolls back, no partial restore

If step 3 fails → DB is empty but the `pre-restore-safety-*.sql` backup from step 1 is available for recovery.

All three steps extracted into named helper functions (`createSafetyBackup`, `cleanSchema`, `runPsqlRestore`) and composed in `runRestorePipeline()`, shared by both `/restore/:filename` and `/restore-upload`.

**Also fixed `pg_dump` flags** — added `--clean --if-exists` to all three pg_dump calls (manual backup, auto-backup) so future backups embed `DROP TABLE IF EXISTS` before each `CREATE TABLE`, making them self-contained.

---

## 10. Invoice Print — Empty Payment History Message *(2026-06-30)*

### Problem
The Payment History section on the printed invoice (`/invoices/:id/print`) was hidden entirely when an invoice had no payments. Printed invoices for unpaid customers showed no indication of payment status in that section, which was confusing.

### Changes Made

#### `frontend/src/pages/invoices/InvoicePrint.tsx`
- Removed the `invoice.payments.length > 0` guard that hid the entire Payment History section
- The section now **always renders**
- When there are no payments, shows an italic placeholder message:
  - **English:** *"No payments have been made yet."*
  - **Arabic:** *"لم يتم سداد أي مبلغ حتى الآن."* (right-aligned in RTL)
- Added `noPayments` key to the `COPY` record (both `en` and `ar`) and to the TypeScript type definition

---

## Summary of Files Changed *(2026-06-30)*

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/src/routes/backup.ts` | Modified | 3-step safe restore pipeline; `--clean --if-exists` on all pg_dump calls; `ON_ERROR_STOP=1 --single-transaction` on psql restore |
| `frontend/src/pages/invoices/InvoicePrint.tsx` | Modified | Payment History always shown; "no payments" message in EN + AR |
| `info/VISION_FULL_DOCS.md` | Modified | Documented backup restore pipeline + invoice print payment history changes |
