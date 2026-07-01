# Today's Updates — 2026-07-01

> Session work performed on the **OptiVision** Optical Shop Management System.

---

## 1. Invoices Page — Period Filter: Filter by Payment Date Instead of Invoice Creation Date

### Problem
The date range filter on `/invoices` was filtering by `invoice.createdAt` — only showing invoices *created* within the selected range. The user wanted to see every invoice that has **at least one payment** recorded within the selected date range (regardless of when the invoice was created).

### Changes Made

#### `backend/src/routes/invoices.ts`
Replaced the `createdAt` WHERE condition with a payment-date OR condition:
```typescript
OR: [
  { payments: { some: { date: { gte, lte } } } },  // invoices with a payment in range
  { status: 'UNPAID' },                              // genuinely unpaid invoices (always visible)
]
```
- Invoices with any payment in the range are returned
- Genuinely UNPAID invoices (status = UNPAID) always appear regardless of date range
- Old PAID invoices with no payment records (paid via admin override) are correctly excluded

---

## 2. Invoices Page — Summary Cards Are Period-Aware (Admin)

### Problem
When a period filter was active, the summary cards (Total Billed / Total Collected / Outstanding) still showed all-time totals based on `invoice.paidAmount` — not the amounts specific to the selected period.

### Changes Made

#### `frontend/src/pages/invoices/InvoicesPage.tsx`
When admin + period active, summary cards switch to period-specific values:
- **Period Billed** = sum `totalAmount` of invoices that have ≥1 payment in the range
- **Period Collected** = sum of `payment.amount` where `payment.date` is in the range only
- **Period Outstanding** = Period Billed − Period Collected
- Card labels and subtitles update to reflect period scope
- Outside a period (or for employees), original behavior is unchanged

---

## 3. Invoices Page — Payment History Shows Only In-Range Payments When Period Active

### Problem
When a period filter was active, expanding an invoice showed ALL its payments — including payments from outside the selected range. This was confusing: an invoice that appeared because it had a June 30 payment also showed its June 29 payment, making it look like it shouldn't be in the results.

### Changes Made

#### `frontend/src/pages/invoices/InvoicesPage.tsx`
When period is active:
- Payment history table only renders payments whose `date` is within the range
- Section header changes to "Payments in Period (N)"
- Footer shows "Collected in Period" instead of "Total Paid" with the period-only sum
- A small note below the table: "+ N payment(s) outside this period · total ever paid: KWD X.XXX"

#### `frontend/src/pages/invoices/PeriodCollectiveReport.tsx`
Same treatment in the Period Invoice Summary report:
- Per-invoice payment list only shows in-range payments
- "Collected in Period" subtotal shown per invoice
- Hidden count note shown if there are out-of-range payments
- Grand totals (Billed, Collected, Outstanding) are now period-specific

---

## 4. Invoices Page — Timezone Fix in Date Range API Request

### Problem
`toApiDateRange("2026-06-30", "2026-06-30")` was sending `dateFrom=2026-06-29T21:00:00.000Z` to the backend — a 3-hour shift caused by `new Date("2026-06-30")` being parsed as UTC midnight, then `setHours(0,0,0,0)` converting it to Kuwait local midnight (UTC+3 → UTC−3hrs).

### Changes Made

#### `frontend/src/pages/invoices/InvoicesPage.tsx`
```typescript
// Before (timezone shift bug)
function toApiDateRange(from: string, to: string) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);        // shifts by local timezone offset
  ...
}

// After (UTC-direct, no shift)
function toApiDateRange(from: string, to: string) {
  return {
    dateFrom: `${from}T00:00:00.000Z`,
    dateTo:   `${to}T23:59:59.999Z`,
  };
}
```
- Selecting "2026-06-30" now sends `dateFrom=2026-06-30T00:00:00.000Z` exactly
- `periodStart` / `periodEnd` frontend helpers updated with the same UTC approach
- `PeriodCollectiveReport` `isPaymentInRange` boundaries updated to match

---

## 5. Invoices Page — Old PAID Invoices No Longer Bleed Into Period Filters

### Problem
`{ payments: { none: {} } }` in the backend OR condition caught ANY invoice without Payment records — including old PAID invoices where `paidAmount` was set directly via admin override (no Payment row exists in the DB). This caused a May 2026 PAID invoice to appear in a June 30 filter.

### Fix
Changed `{ payments: { none: {} } }` → `{ status: 'UNPAID' as any }` in the backend filter so only invoices with `status = UNPAID` (genuinely awaiting payment) always appear. Admin-overridden PAID invoices without Payment records are correctly hidden.

---

## Summary of Files Changed *(2026-07-01)*

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/src/routes/invoices.ts` | Modified | Filter by payment date (not createdAt); UNPAID always shown; old PAID with no records excluded |
| `frontend/src/pages/invoices/InvoicesPage.tsx` | Modified | UTC date fix; period-aware summary cards; payment history filtered to in-range only when period active |
| `frontend/src/pages/invoices/PeriodCollectiveReport.tsx` | Modified | Period-specific totals; per-invoice payment list filtered to in-range; hidden payment note |
