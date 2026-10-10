# Riddhi Sewing Machine Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working billing app where the owner maintains services and spare parts, creates bills only from those items, and prints or downloads saved bills.

**Architecture:** A Vite React TypeScript app talks to Supabase with the publishable key. Lists and search are row-level-security selects. Item numbers, bill numbers, snapshots, and totals are assigned inside Postgres functions. The browser calculates display totals in integer paise and treats the database response as the saved result.

**Tech Stack:** React, TypeScript strict, Vite, Tailwind CSS, React Router, React Hook Form, Zod, Lucide React, date-fns, Sonner, jsPDF, jsPDF-AutoTable, `@supabase/supabase-js`, Vitest, Testing Library, pgTAP.

**Spec:** `docs/superpowers/specs/2026-10-10-riddhi-sewing-billing-design.md`

## Global Constraints

- Quantity is a whole number from 1 to 9999.
- Item numbers are a database sequence starting at 1001, stored as text: `1001`, `1002`.
- Bill numbers are a separate sequence starting at 1001, stored as `B-1001`, `B-1002`. Gaps are acceptable. Numbers are never reused.
- Within one item type, names are unique after trim and case-folding. The same name may exist once as a service and once as a spare part.
- Description is optional, trimmed, and at most 500 characters. Blank becomes null.
- Item name is required, trimmed, and 1–100 characters.
- Customer name is optional, at most 120 characters. Customer address is optional, at most 500 characters. Blank becomes null.
- Default price, unit price, line amount, and grand total are `numeric(12,2)`, non-negative, with at most two decimal places. Zero is allowed.
- Unit price on a bill may differ from the master default. The master price does not change.
- Selecting the same master item twice on one unsaved bill increases that row’s quantity and keeps the current unit price. Separate rows for the same item are not allowed.
- Money on screen is calculated in integer paise. The database recalculates and stores `NUMERIC(12,2)`.
- Currency is INR (`₹`) only. No GST, discounts, payments, or tax lines.
- Do not seed the example rows Machine Service, Belt Replacement, or Needle Set.
- Do not put a service-role key in frontend code or git.
- Environment example contains only `VITE_SUPABASE_URL=` and `VITE_SUPABASE_PUBLISHABLE_KEY=`.
- Primary color is Tailwind `teal-800`. Page background is slate. Toasts use Sonner.
- Dates display as date-fns `d MMM yyyy`. Bill date is a PostgreSQL `DATE`.
- Lists request 20 rows per page. Billing search shows at most 20 matches and does not page.
- Search debounce is 300ms. Search trims text, escapes `\`, `%`, and `_`, then wraps the result in `%`.
- Draft storage key is `riddhi.billing.draft`.
- Printed and PDF thank-you line is exactly `Thank you for choosing Riddhi Sewing Machine.`
- PDF file name is the bill number plus `.pdf`.
- There is no registration screen, no delete control, and no edit or delete of a saved bill.
- Error messages raised by SQL start with a stable code, a colon, and a sentence. Codes: `not_authorized`, `name_required`, `name_too_long`, `description_too_long`, `invalid_item_type`, `invalid_price`, `duplicate_name`, `item_not_found`, `item_inactive`, `bill_date_required`, `customer_name_too_long`, `customer_address_too_long`, `no_line_items`, `duplicate_line`, `invalid_quantity`, `invalid_unit_price`.
- Out of scope: GST, discounts, payments, paid status, customer directory, stock, purchases, suppliers, multiple branches, multiple roles, WhatsApp, email, bill editing or deletion, analytics, and a native app.

## File structure

- `src/main.tsx` — React root, router, Sonner toaster.
- `src/app/router.tsx` — routes and auth gate.
- `src/app/auth.tsx` — session, sign-in, sign-out, authorization check.
- `src/components/layout/AppShell.tsx` — sidebar, mobile menu, outlet.
- `src/components/layout/Logo.tsx` — spool-and-needle mark.
- `src/components/ui/Button.tsx`, `TextField.tsx`, `TextArea.tsx`, `SelectField.tsx`, `Dialog.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `ConfirmDialog.tsx` — shared controls.
- `src/lib/currency.ts` — paise math and INR formatting.
- `src/lib/search.ts` — ILIKE pattern and PostgREST `or` filter.
- `src/lib/errors.ts` — parse `code: sentence` from Postgres.
- `src/lib/supabase.ts` — browser client.
- `src/lib/dates.ts` — today as `YYYY-MM-DD`, display format.
- `src/features/billing/draft.ts` — pure draft transitions.
- `src/features/billing/storage.ts` — sessionStorage draft.
- `src/features/billing/schema.ts` — Zod schema for the bill header.
- `src/features/billing/api.ts` — search active items and `create_bill`.
- `src/features/billing/BillingPage.tsx` — billing screen.
- `src/features/billing/ItemSearchDialog.tsx` — master-item picker.
- `src/features/services/schema.ts` — master-item form schema.
- `src/features/services/api.ts` — list, create, update, activate.
- `src/features/services/ServicesPage.tsx` — master list screen.
- `src/features/bills/invoice.ts` — print and PDF model.
- `src/features/bills/pdf.ts` — jsPDF download.
- `src/features/bills/api.ts` — list and detail selects.
- `src/features/bills/BillsPage.tsx`, `BillDetailPage.tsx`, `InvoiceSheet.tsx`.
- `src/features/auth/LoginPage.tsx`.
- `supabase/migrations/20261010120000_init.sql` — schema, RLS, functions.
- `supabase/tests/billing_db.test.sql` — pgTAP.
- `.env.example`, `README.md`.

---

### Task 1: Scaffold the app shell

**Files:**
- Create: `package.json` and the Vite React TypeScript project in the repo root
- Create: `src/test/setup.ts`
- Create: `src/components/layout/Logo.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/AppShell.test.tsx`
- Create: `src/app/router.tsx`
- Create: `src/styles/index.css`
- Modify: `vite.config.ts`, `src/main.tsx`, `index.html`
- Create: `.env.example`

**Interfaces:**
- Consumes: none
- Produces: `AppShell` renders the business name and navigation links to `/billing`, `/services`, and `/bills`. `router` exports `AppRouter`.

- [ ] **Step 1: Create the Vite project and test runner**

Run in `d:\Riddhi_Sewing`:

```bash
npm create vite@latest . -- --template react-ts
npm install react-router-dom @supabase/supabase-js react-hook-form @hookform/resolvers zod lucide-react date-fns sonner jspdf jspdf-autotable
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

Add to `tsconfig.app.json` compiler options: `"types": ["vitest/globals"]` is not required. Keep `"strict": true`. Add a `test` script to `package.json`: `"test": "vitest run"` and `"test:watch": "vitest"`.

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Create `.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Add `.env` and `.env.local` to `.gitignore` if they are missing.

- [ ] **Step 2: Write the failing shell test**

Create `src/components/layout/AppShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

test('shows the business name and the three modules', () => {
  render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  )
  expect(screen.getByText('Riddhi Sewing Machine')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/billing')
  expect(screen.getByRole('link', { name: 'Services & Parts' })).toHaveAttribute('href', '/services')
  expect(screen.getByRole('link', { name: 'Saved Bills' })).toHaveAttribute('href', '/bills')
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/layout/AppShell.test.tsx`

Expected: FAIL because `AppShell` is not defined.

- [ ] **Step 4: Implement the shell**

`src/styles/index.css`:

```css
@import "tailwindcss";

@media print {
  .no-print {
    display: none !important;
  }
  body {
    background: white !important;
  }
}
```

`src/components/layout/Logo.tsx`:

```tsx
export function Logo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8 text-teal-800">
      <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 4v6M16 22v6M22 10l6-4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
```

`src/components/layout/AppShell.tsx` renders a header with `Logo`, the text `Riddhi Sewing Machine`, a `Sign out` button that calls the optional `onSignOut` prop, and a `<nav>` with the three links. On viewports below `md`, the nav is behind a button labeled `Menu` that toggles `hidden` / `block`. The main area is `<main className="min-w-0 flex-1 p-4 md:p-6"><Outlet /></main>`. The outer layout is `min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[16rem_1fr]`. Nav links use `NavLink` and `aria-current` styling with `bg-teal-800 text-white` when active. Every control has `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800`.

`src/app/router.tsx` exports `AppRouter`, a `BrowserRouter` whose `/` route redirects to `/billing` with `<Navigate to="/billing" replace />`. Child routes `/billing`, `/services`, `/bills`, and `/bills/:id` render inside `AppShell`. Pages can be temporary text nodes until later tasks: `Billing`, `Services`, `Bills`, and `Bill`.

`src/main.tsx` imports `./styles/index.css`, renders `AppRouter`, and mounts `<Toaster position="top-center" />` from `sonner`. `index.html` title is `Riddhi Sewing Machine`.

- [ ] **Step 5: Run the test and commit**

Run: `npx vitest run src/components/layout/AppShell.test.tsx`

Expected: PASS

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json index.html src .env.example .gitignore
git commit -m "Add the application shell and test runner."
```

---

### Task 2: Money, dates, and search text

**Files:**
- Create: `src/lib/currency.ts`
- Create: `src/lib/currency.test.ts`
- Create: `src/lib/dates.ts`
- Create: `src/lib/dates.test.ts`
- Create: `src/lib/search.ts`
- Create: `src/lib/search.test.ts`
- Create: `src/lib/errors.ts`
- Create: `src/lib/errors.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `parseRupeesToPaise(value: string): number | null`
  - `paiseToRupeeString(paise: number): string`
  - `formatInr(paise: number): string`
  - `lineAmountPaise(quantity: number, unitPricePaise: number): number`
  - `sumPaise(amounts: number[]): number`
  - `todayIsoDate(now?: Date): string`
  - `formatBillDate(isoDate: string): string`
  - `toIlikePattern(raw: string): string`
  - `orIlikeFilter(columns: string[], pattern: string): string`
  - `parseDbError(error: { message?: string } | null): { code: string; message: string } | null`

- [ ] **Step 1: Write the failing tests**

`src/lib/currency.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { formatInr, lineAmountPaise, parseRupeesToPaise, paiseToRupeeString, sumPaise } from './currency'

describe('currency', () => {
  test('parses rupees into paise', () => {
    expect(parseRupeesToPaise('300')).toBe(30000)
    expect(parseRupeesToPaise('300.5')).toBe(30050)
    expect(parseRupeesToPaise('300.50')).toBe(30050)
    expect(parseRupeesToPaise('0')).toBe(0)
  })

  test('rejects negative, extra fraction digits, and blank values', () => {
    expect(parseRupeesToPaise('-1')).toBeNull()
    expect(parseRupeesToPaise('1.234')).toBeNull()
    expect(parseRupeesToPaise('')).toBeNull()
    expect(parseRupeesToPaise('abc')).toBeNull()
  })

  test('multiplies quantity by unit price in paise', () => {
    expect(lineAmountPaise(2, 30050)).toBe(60100)
    expect(sumPaise([30000, 5000, 10000])).toBe(45000)
  })

  test('formats INR and a two-decimal string', () => {
    expect(paiseToRupeeString(30050)).toBe('300.50')
    expect(formatInr(45000)).toMatch(/450\.00/)
    expect(formatInr(45000)).toMatch(/₹/)
  })
})
```

`src/lib/dates.test.ts`:

```ts
import { expect, test } from 'vitest'
import { formatBillDate, todayIsoDate } from './dates'

test('formats a stored date for display', () => {
  expect(formatBillDate('2026-10-10')).toBe('10 Oct 2026')
})

test('uses the local calendar date', () => {
  expect(todayIsoDate(new Date(2026, 9, 10, 23, 30))).toBe('2026-10-10')
})
```

`src/lib/search.test.ts`:

```ts
import { expect, test } from 'vitest'
import { orIlikeFilter, toIlikePattern } from './search'

test('trims and escapes like wildcards', () => {
  expect(toIlikePattern('  1001  ')).toBe('%1001%')
  expect(toIlikePattern('100%')).toBe('%100\\%%')
  expect(toIlikePattern('a_b')).toBe('%a\\_b%')
  expect(toIlikePattern('a\\b')).toBe('%a\\\\b%')
})

test('quotes the pattern so commas stay inside one filter', () => {
  expect(orIlikeFilter(['item_number', 'name'], '%a,b%')).toBe(
    'item_number.ilike."%a,b%",name.ilike."%a,b%"',
  )
})
```

`src/lib/errors.test.ts`:

```ts
import { expect, test } from 'vitest'
import { parseDbError } from './errors'

test('reads a stable code and sentence', () => {
  expect(parseDbError({ message: 'duplicate_name: An item with this name already exists for this type.' }))
    .toEqual({
      code: 'duplicate_name',
      message: 'An item with this name already exists for this type.',
    })
})

test('returns null when the message has no code', () => {
  expect(parseDbError({ message: 'network down' })).toBeNull()
  expect(parseDbError(null)).toBeNull()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/currency.test.ts src/lib/dates.test.ts src/lib/search.test.ts src/lib/errors.test.ts`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement the helpers**

`parseRupeesToPaise` trims, matches `/^\d+(\.\d{1,2})?$/`, splits on `.`, and returns `rupees * 100 + paise` where a missing fraction is 0 and one digit is tens of paise (`5` means 50). `paiseToRupeeString` returns `` `${Math.trunc(paise / 100)}.${String(Math.abs(paise % 100)).padStart(2, '0')}` ``. `formatInr` uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)`. `lineAmountPaise` returns `quantity * unitPricePaise`. `sumPaise` adds the array with integer addition starting at 0.

`todayIsoDate` reads `getFullYear`, `getMonth() + 1`, and `getDate` from the argument or `new Date()`, padded to `YYYY-MM-DD`. `formatBillDate` parses the `YYYY-MM-DD` string as a local date (`new Date(year, month - 1, day)`) and formats it with `format` from `date-fns` and the pattern `d MMM yyyy`.

`toIlikePattern` trims, removes `"`, escapes `\`, `%`, and `_` in that order, and wraps with `%`. `orIlikeFilter` joins `` `${column}.ilike."${pattern}"` `` with commas.

`parseDbError` matches `/^([a-z_]+):\s*(.+)$/s` on `error.message`. The code is group 1 and the sentence is group 2 trimmed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/currency.test.ts src/lib/dates.test.ts src/lib/search.test.ts src/lib/errors.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "Add money, date, search, and error helpers."
```

---

### Task 3: Billing draft rules

**Files:**
- Create: `src/features/billing/types.ts`
- Create: `src/features/billing/draft.ts`
- Create: `src/features/billing/draft.test.ts`
- Create: `src/features/billing/storage.ts`
- Create: `src/features/billing/storage.test.ts`
- Create: `src/features/billing/schema.ts`
- Create: `src/features/billing/schema.test.ts`

**Interfaces:**
- Consumes: `lineAmountPaise`, `sumPaise`, `parseRupeesToPaise` from `src/lib/currency.ts`
- Produces:

```ts
export type ItemType = 'service' | 'spare_part'

export type MasterPick = {
  id: string
  itemNumber: string
  name: string
  description: string | null
  itemType: ItemType
  defaultPrice: string
}

export type DraftLine = {
  serviceId: string
  itemNumber: string
  itemName: string
  itemDescription: string | null
  itemType: ItemType
  quantity: number
  unitPricePaise: number
}

export type Draft = {
  idempotencyKey: string
  billDate: string
  customerName: string
  customerAddress: string
  lines: DraftLine[]
}

export function createDraft(billDate: string, idempotencyKey?: string): Draft
export function addItem(draft: Draft, item: MasterPick): { draft: Draft; error: string | null }
export function setQuantity(draft: Draft, serviceId: string, quantity: number): Draft
export function setUnitPrice(draft: Draft, serviceId: string, unitPricePaise: number): Draft
export function removeLine(draft: Draft, serviceId: string): Draft
export function lineTotalPaise(line: DraftLine): number
export function grandTotalPaise(draft: Draft): number
export function canSave(draft: Draft): boolean
export function loadDraft(storage: Storage): Draft | null
export function saveDraft(storage: Storage, draft: Draft): void
export function clearDraft(storage: Storage): void
export const billHeaderSchema: ZodType<{ billDate: string; customerName: string; customerAddress: string }>
```

- [ ] **Step 1: Write the failing tests**

`src/features/billing/draft.test.ts` covers:

- `createDraft('2026-10-10', 'key-1')` has that date, that key, empty customer fields, and no lines.
- Adding a master item with `defaultPrice: '300.00'` creates one line, quantity 1, and `unitPricePaise` 30000.
- Adding the same `id` again makes quantity 2 and keeps an overridden price of 25000 after `setUnitPrice`.
- Adding when quantity is already 9999 returns the same draft and `error` `'Quantity cannot exceed 9999.'`
- `removeLine` drops the row. Remaining lines keep their relative order. `grandTotalPaise` is the sum of `quantity * unitPricePaise`.
- `canSave` is false when `lines` is empty and true when one valid line exists.
- `setQuantity` ignores values below 1, above 9999, and non-integers by leaving the line unchanged.

`src/features/billing/storage.test.ts` uses a `MemoryStorage` class with `getItem` and `setItem`. `saveDraft` then `loadDraft` returns the same draft. `loadDraft` returns null for `'not-json'` and for an object missing `lines`. `clearDraft` makes the next load return null. The key read from storage is `riddhi.billing.draft`.

`src/features/billing/schema.test.ts`:

- A valid header `{ billDate: '2026-10-10', customerName: '', customerAddress: '' }` parses.
- `billDate: ''` fails.
- `billDate: '10/10/2026'` fails.
- A 121-character customer name fails.
- A 501-character address fails.
- A 120-character name and a 500-character address parse.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/billing/draft.test.ts src/features/billing/storage.test.ts src/features/billing/schema.test.ts`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement draft, storage, and schema**

`addItem` finds an existing line by `serviceId === item.id`. If found and `quantity >= 9999`, return the original draft and the error string. If found, replace that line with `quantity + 1` and the same `unitPricePaise`. Otherwise append a line using `parseRupeesToPaise(item.defaultPrice)`. If that parse returns null, return the original draft and `'The master price is invalid.'`

`setQuantity` updates only when `Number.isInteger(quantity)` and quantity is from 1 to 9999. `setUnitPrice` updates only when `Number.isInteger(unitPricePaise)` and `unitPricePaise >= 0`.

`billHeaderSchema` is `z.object({ billDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), customerName: z.string().trim().max(120), customerAddress: z.string().trim().max(500) })`.

`loadDraft` parses JSON, checks `idempotencyKey`, `billDate`, `customerName`, `customerAddress`, and `Array.isArray(lines)`, and returns null on any failure. It does not throw.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/billing/draft.test.ts src/features/billing/storage.test.ts src/features/billing/schema.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing
git commit -m "Add billing draft rules and header validation."
```

---

### Task 4: Master-item schema and invoice model

**Files:**
- Create: `src/features/services/schema.ts`
- Create: `src/features/services/schema.test.ts`
- Create: `src/features/bills/invoice.ts`
- Create: `src/features/bills/invoice.test.ts`
- Create: `src/features/bills/types.ts`

**Interfaces:**
- Consumes: `formatBillDate`, `formatInr`, `parseRupeesToPaise`
- Produces:

```ts
export const masterItemSchema: ZodType<{
  name: string
  description: string
  itemType: 'service' | 'spare_part'
  defaultPrice: string
}>

export type SavedBill = {
  id: string
  billNumber: string
  billDate: string
  customerName: string | null
  customerAddress: string | null
  grandTotal: string
  lines: Array<{
    lineNumber: number
    itemNumber: string
    itemName: string
    itemDescription: string | null
    itemType: 'service' | 'spare_part'
    quantity: number
    unitPrice: string
    lineAmount: string
  }>
}

export type InvoiceModel = {
  businessName: 'Riddhi Sewing Machine'
  billNumber: string
  billDateLabel: string
  customerName: string
  customerAddress: string | null
  lines: Array<{
    itemNumber: string
    itemName: string
    itemDescription: string
    quantity: string
    unitPrice: string
    lineAmount: string
  }>
  grandTotal: string
  thankYou: 'Thank you for choosing Riddhi Sewing Machine.'
}

export function toInvoiceModel(bill: SavedBill): InvoiceModel
```

- [ ] **Step 1: Write the failing tests**

Master schema tests:

- `{ name: ' Needle Set ', description: '', itemType: 'spare_part', defaultPrice: '100' }` parses with name `Needle Set`.
- Empty name fails.
- A 101-character name fails.
- A 501-character description fails.
- `itemType: 'labor'` fails.
- `defaultPrice: '-1'` and `defaultPrice: '1.234'` fail.
- `defaultPrice: '0'` parses.

Invoice tests:

- A bill with `customerName: null` produces `customerName` `'Walk-in Customer'` and `customerAddress: null`.
- A line description of null becomes `''` on the invoice line. A 400-character description is preserved in full.
- `unitPrice`, `lineAmount`, and `grandTotal` are INR strings from the saved decimal strings, not from a separate master price argument. Pass `unitPrice: '50.00'` and assert the formatted invoice contains `50.00`.
- `thankYou` equals `Thank you for choosing Riddhi Sewing Machine.`
- `billDateLabel` for `2026-10-10` is `10 Oct 2026`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/services/schema.test.ts src/features/bills/invoice.test.ts`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement schema and invoice model**

`masterItemSchema` uses `z.object` with `name: z.string().trim().min(1).max(100)`, `description: z.string().trim().max(500)`, `itemType: z.enum(['service', 'spare_part'])`, and `defaultPrice: z.string().refine((value) => parseRupeesToPaise(value) !== null, 'Enter a valid price.')`.

`toInvoiceModel` maps each saved line. `itemDescription` is `line.itemDescription ?? ''`. Money fields pass through `formatInr(parseRupeesToPaise(value) ?? 0)`. Customer name uses `bill.customerName?.trim() ? bill.customerName.trim() : 'Walk-in Customer'`. Address uses `bill.customerAddress?.trim() ? bill.customerAddress.trim() : null`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/services/schema.test.ts src/features/bills/invoice.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/services/schema.ts src/features/services/schema.test.ts src/features/bills
git commit -m "Add master-item validation and the invoice model."
```

---

### Task 5: Database schema and trusted functions

**Files:**
- Create: `supabase/migrations/20261010120000_init.sql`

**Interfaces:**
- Consumes: none
- Produces: tables `authorized_users`, `services`, `bills`, `bill_items`; functions `is_authorized()`, `create_master_item(text, text, text, numeric)`, `update_master_item(uuid, text, text, text, numeric)`, `set_master_item_active(uuid, boolean)`, `create_bill(uuid, date, text, text, jsonb)`. `create_bill` and the master write functions return `table` rows. `create_master_item` and `update_master_item` return the `services` row. `set_master_item_active` returns the `services` row. `create_bill` returns `id uuid, bill_number text, bill_date date, grand_total numeric`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20261010120000_init.sql` with the statements below, in this order.

Extensions and allowlist:

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table public.authorized_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.authorized_users enable row level security;

create or replace function public.is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.authorized_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_authorized() from public;
grant execute on function public.is_authorized() to authenticated;
```

Sequences and `services`:

```sql
create sequence public.service_item_number_seq start with 1001;
create sequence public.bill_number_seq start with 1001;
revoke all on sequence public.service_item_number_seq from public, anon, authenticated;
revoke all on sequence public.bill_number_seq from public, anon, authenticated;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  item_number text not null unique,
  item_number_value bigint generated always as (item_number::bigint) stored,
  name text not null,
  description text,
  item_type text not null,
  default_price numeric(12,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_item_type_check check (item_type in ('service', 'spare_part')),
  constraint services_name_len check (char_length(name) between 1 and 100),
  constraint services_description_len check (description is null or char_length(description) <= 500),
  constraint services_price_check check (default_price >= 0)
);

create unique index services_type_name_unique
  on public.services (item_type, lower(btrim(name)));

create index services_item_number_trgm on public.services using gin (item_number gin_trgm_ops);
create index services_name_trgm on public.services using gin (name gin_trgm_ops);
create index services_description_trgm on public.services using gin (description gin_trgm_ops);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();
```

`bills` and `bill_items`:

```sql
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  bill_date date not null,
  customer_name text,
  customer_address text,
  grand_total numeric(12,2) not null,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  constraint bills_customer_name_len check (customer_name is null or char_length(customer_name) <= 120),
  constraint bills_customer_address_len check (customer_address is null or char_length(customer_address) <= 500),
  constraint bills_grand_total_check check (grand_total >= 0)
);

create index bills_bill_date_idx on public.bills (bill_date desc, created_at desc);
create index bills_bill_number_trgm on public.bills using gin (bill_number gin_trgm_ops);
create index bills_customer_name_trgm on public.bills using gin (customer_name gin_trgm_ops);

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  line_number integer not null,
  item_number text not null,
  item_name text not null,
  item_description text,
  item_type text not null,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  line_amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint bill_items_line_unique unique (bill_id, line_number),
  constraint bill_items_service_unique unique (bill_id, service_id),
  constraint bill_items_type_check check (item_type in ('service', 'spare_part')),
  constraint bill_items_quantity_check check (quantity >= 1 and quantity <= 9999),
  constraint bill_items_price_check check (unit_price >= 0 and line_amount >= 0),
  constraint bill_items_amount_check check (line_amount = quantity * unit_price)
);
```

Deferred total check. The function looks at `tg_table_name` so a bill insert uses `new.id` and a line insert uses `new.bill_id`.

```sql
create or replace function public.assert_bill_balanced()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target uuid;
  actual numeric(12,2);
  expected numeric(12,2);
  line_count integer;
begin
  if tg_table_name = 'bills' then
    target := new.id;
  else
    target := new.bill_id;
  end if;

  select grand_total into actual from public.bills where id = target;
  select coalesce(sum(line_amount), 0), count(*)
    into expected, line_count
  from public.bill_items
  where bill_id = target;

  if line_count < 1 or actual is distinct from expected then
    raise exception 'bill_total_mismatch: Saved bill total does not match its lines.';
  end if;
  return null;
end;
$$;

create constraint trigger bills_balanced
after insert on public.bills
deferrable initially deferred
for each row execute function public.assert_bill_balanced();

create constraint trigger bill_items_balanced
after insert on public.bill_items
deferrable initially deferred
for each row execute function public.assert_bill_balanced();
```

Privileges and policies:

```sql
alter table public.services enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;

create policy services_select on public.services
  for select to authenticated
  using (public.is_authorized());

create policy bills_select on public.bills
  for select to authenticated
  using (public.is_authorized());

create policy bill_items_select on public.bill_items
  for select to authenticated
  using (public.is_authorized());

revoke all on public.authorized_users from public, anon, authenticated;
revoke all on public.services from public, anon, authenticated;
revoke all on public.bills from public, anon, authenticated;
revoke all on public.bill_items from public, anon, authenticated;
grant select on public.services, public.bills, public.bill_items to authenticated;
```

Trusted functions, copied into the same migration:

```sql
create or replace function public.require_authorized()
returns void
language plpgsql
set search_path = public
as $$
begin
  if not public.is_authorized() then
    raise exception 'not_authorized: You are not allowed to change this data.';
  end if;
end;
$$;

create or replace function public.clean_money(value numeric, code text)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
begin
  if value is null or value < 0 or value > 9999999999.99 or value <> round(value, 2) then
    raise exception '%', code || ': Enter a non-negative amount with at most two decimal places.';
  end if;
  return value;
end;
$$;

create or replace function public.clean_name(value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  cleaned text := btrim(coalesce(value, ''));
begin
  if cleaned = '' then
    raise exception 'name_required: Enter an item name.';
  end if;
  if char_length(cleaned) > 100 then
    raise exception 'name_too_long: Item name must be 100 characters or fewer.';
  end if;
  return cleaned;
end;
$$;

create or replace function public.clean_description(value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  cleaned text := nullif(btrim(coalesce(value, '')), '');
begin
  if cleaned is not null and char_length(cleaned) > 500 then
    raise exception 'description_too_long: Description must be 500 characters or fewer.';
  end if;
  return cleaned;
end;
$$;

create or replace function public.clean_item_type(value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if value is null or value not in ('service', 'spare_part') then
    raise exception 'invalid_item_type: Choose Service or Spare Part.';
  end if;
  return value;
end;
$$;

create or replace function public.create_master_item(
  p_name text,
  p_description text,
  p_item_type text,
  p_default_price numeric
)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_name text;
  cleaned_description text;
  cleaned_type text;
  cleaned_price numeric(12,2);
  created public.services;
begin
  perform public.require_authorized();
  cleaned_name := public.clean_name(p_name);
  cleaned_description := public.clean_description(p_description);
  cleaned_type := public.clean_item_type(p_item_type);
  cleaned_price := public.clean_money(p_default_price, 'invalid_price');

  insert into public.services (item_number, name, description, item_type, default_price)
  values (
    nextval('public.service_item_number_seq')::text,
    cleaned_name,
    cleaned_description,
    cleaned_type,
    cleaned_price
  )
  returning * into created;

  return created;
exception
  when unique_violation then
    raise exception 'duplicate_name: An item with this name already exists for this type.';
end;
$$;

create or replace function public.update_master_item(
  p_id uuid,
  p_name text,
  p_description text,
  p_item_type text,
  p_default_price numeric
)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_name text;
  cleaned_description text;
  cleaned_type text;
  cleaned_price numeric(12,2);
  updated public.services;
begin
  perform public.require_authorized();
  cleaned_name := public.clean_name(p_name);
  cleaned_description := public.clean_description(p_description);
  cleaned_type := public.clean_item_type(p_item_type);
  cleaned_price := public.clean_money(p_default_price, 'invalid_price');

  update public.services
  set name = cleaned_name,
      description = cleaned_description,
      item_type = cleaned_type,
      default_price = cleaned_price
  where id = p_id
  returning * into updated;

  if not found then
    raise exception 'item_not_found: That item no longer exists.';
  end if;

  return updated;
exception
  when unique_violation then
    raise exception 'duplicate_name: An item with this name already exists for this type.';
end;
$$;

create or replace function public.set_master_item_active(p_id uuid, p_is_active boolean)
returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.services;
begin
  perform public.require_authorized();

  update public.services
  set is_active = p_is_active
  where id = p_id
  returning * into updated;

  if not found then
    raise exception 'item_not_found: That item no longer exists.';
  end if;

  return updated;
end;
$$;

create or replace function public.create_bill(
  p_idempotency_key uuid,
  p_bill_date date,
  p_customer_name text,
  p_customer_address text,
  p_lines jsonb
)
returns table (
  id uuid,
  bill_number text,
  bill_date date,
  grand_total numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.bills;
  cleaned_customer_name text;
  cleaned_customer_address text;
  line jsonb;
  line_index integer := 0;
  line_service_id uuid;
  line_quantity numeric;
  line_unit_price numeric;
  service_row public.services;
  new_bill public.bills;
  computed_total numeric(12,2) := 0;
  element_count integer;
  distinct_count integer;
begin
  perform public.require_authorized();

  select * into existing
  from public.bills
  where idempotency_key = p_idempotency_key;

  if found then
    id := existing.id;
    bill_number := existing.bill_number;
    bill_date := existing.bill_date;
    grand_total := existing.grand_total;
    return next;
    return;
  end if;

  if p_bill_date is null then
    raise exception 'bill_date_required: Choose a bill date.';
  end if;

  cleaned_customer_name := nullif(btrim(coalesce(p_customer_name, '')), '');
  cleaned_customer_address := nullif(btrim(coalesce(p_customer_address, '')), '');

  if cleaned_customer_name is not null and char_length(cleaned_customer_name) > 120 then
    raise exception 'customer_name_too_long: Customer name must be 120 characters or fewer.';
  end if;

  if cleaned_customer_address is not null and char_length(cleaned_customer_address) > 500 then
    raise exception 'customer_address_too_long: Customer address must be 500 characters or fewer.';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'no_line_items: Add at least one item.';
  end if;

  select count(*), count(distinct value->>'service_id')
    into element_count, distinct_count
  from jsonb_array_elements(p_lines);

  if element_count <> distinct_count then
    raise exception 'duplicate_line: Each item can appear only once on a bill.';
  end if;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    begin
      line_quantity := (line->>'quantity')::numeric;
    exception
      when invalid_text_representation then
        raise exception 'invalid_quantity: Quantity must be a whole number from 1 to 9999.';
    end;

    if line_quantity is null or line_quantity <> trunc(line_quantity) or line_quantity < 1 or line_quantity > 9999 then
      raise exception 'invalid_quantity: Quantity must be a whole number from 1 to 9999.';
    end if;

    begin
      line_unit_price := public.clean_money((line->>'unit_price')::numeric, 'invalid_unit_price');
    exception
      when invalid_text_representation then
        raise exception 'invalid_unit_price: Enter a non-negative amount with at most two decimal places.';
    end;

    computed_total := computed_total + (line_quantity * line_unit_price);
  end loop;

  insert into public.bills (
    bill_number,
    bill_date,
    customer_name,
    customer_address,
    grand_total,
    idempotency_key
  )
  values (
    'B-' || nextval('public.bill_number_seq')::text,
    p_bill_date,
    cleaned_customer_name,
    cleaned_customer_address,
    computed_total,
    p_idempotency_key
  )
  returning * into new_bill;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    line_index := line_index + 1;
    line_quantity := (line->>'quantity')::numeric;
    line_unit_price := public.clean_money((line->>'unit_price')::numeric, 'invalid_unit_price');

    begin
      line_service_id := (line->>'service_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'item_not_found: That item no longer exists.';
    end;

    select * into service_row
    from public.services
    where services.id = line_service_id
    for update;

    if not found then
      raise exception 'item_not_found: That item no longer exists.';
    end if;

    if not service_row.is_active then
      raise exception '%', format(
        'item_inactive: Item %s is inactive and cannot be billed.',
        service_row.item_number
      );
    end if;

    insert into public.bill_items (
      bill_id,
      service_id,
      line_number,
      item_number,
      item_name,
      item_description,
      item_type,
      quantity,
      unit_price,
      line_amount
    )
    values (
      new_bill.id,
      service_row.id,
      line_index,
      service_row.item_number,
      service_row.name,
      service_row.description,
      service_row.item_type,
      line_quantity::integer,
      line_unit_price,
      line_quantity * line_unit_price
    );
  end loop;

  id := new_bill.id;
  bill_number := new_bill.bill_number;
  bill_date := new_bill.bill_date;
  grand_total := new_bill.grand_total;
  return next;
exception
  when unique_violation then
    select * into existing
    from public.bills
    where idempotency_key = p_idempotency_key;

    if found then
      id := existing.id;
      bill_number := existing.bill_number;
      bill_date := existing.bill_date;
      grand_total := existing.grand_total;
      return next;
      return;
    end if;

    raise;
end;
$$;

revoke all on function public.require_authorized() from public, anon, authenticated;
revoke all on function public.clean_money(numeric, text) from public, anon, authenticated;
revoke all on function public.clean_name(text) from public, anon, authenticated;
revoke all on function public.clean_description(text) from public, anon, authenticated;
revoke all on function public.clean_item_type(text) from public, anon, authenticated;
revoke all on function public.create_master_item(text, text, text, numeric) from public;
revoke all on function public.update_master_item(uuid, text, text, text, numeric) from public;
revoke all on function public.set_master_item_active(uuid, boolean) from public;
revoke all on function public.create_bill(uuid, date, text, text, jsonb) from public;
grant execute on function public.create_master_item(text, text, text, numeric) to authenticated;
grant execute on function public.update_master_item(uuid, text, text, text, numeric) to authenticated;
grant execute on function public.set_master_item_active(uuid, boolean) to authenticated;
grant execute on function public.create_bill(uuid, date, text, text, jsonb) to authenticated;
```

- [ ] **Step 2: Review the SQL against the spec**

Confirm the file contains `start with 1001` twice, `'B-' || nextval`, `on delete restrict` twice, `security definer` on `is_authorized` and the four write functions, no `max(item_number)`, and no insert of sample catalog rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261010120000_init.sql
git commit -m "Add billing schema, row level security, and trusted functions."
```

---

### Task 6: Database tests

**Files:**
- Create: `supabase/tests/billing_db.test.sql`
- Create: `supabase/config.toml` only if `supabase init` does not already create one. Keep the generated config. Do not commit secrets.

**Interfaces:**
- Consumes: the functions and tables from Task 5
- Produces: a pgTAP file that rolls back its own data

- [ ] **Step 1: Write the pgTAP file**

`supabase/tests/billing_db.test.sql` begins with `begin;` and `select plan(12);`.

Helper statements inside the transaction:

- Insert two users into `auth.users` with fixed uuids `00000000-0000-0000-0000-000000000001` (owner) and `00000000-0000-0000-0000-000000000002` (stranger), using the minimum columns this Supabase version requires (`id`, `instance_id`, `aud`, `role`, `email`).
- Insert only the owner into `public.authorized_users`.
- A SQL function `public._test_as(uid uuid)` in this file is not required. Before each authorized call, set both `request.jwt.claim.sub` and `request.jwt.claims` to that user id and `set local role authenticated`.

Assertions:

1. As `anon`, `select * from public.services` throws SQLSTATE `42501`.
2. As `anon`, `select public.create_master_item('Needle', null, 'spare_part', 10)` throws SQLSTATE `42501`.
3. As the stranger, `select public.create_master_item('Needle', null, 'spare_part', 10)` throws with message starting `not_authorized:`.
4. As the owner, creating a spare part named `Needle Set` and a service named `Needle Set` both succeed, and the two `item_number` values are distinct.
5. A second spare part named ` needle set ` throws a message starting `duplicate_name:`.
6. `create_master_item` with default price `-1` throws a message starting `invalid_price:`.
7. Create an active service, then `set_master_item_active(id, false)`. `create_bill` with that service id throws a message starting `item_inactive:` and `select count(*) from public.bills` is still 0.
8. Reactivate the item. `create_bill` with quantity `1`, unit price `50.00`, a null customer, and a fresh idempotency key returns a `bill_number` like `B-%`. The `bill_items` row keeps `item_name` and `unit_price` 50.00. Then `update_master_item` changes the name and default price and deactivates the item. The saved `bill_items.item_name` and `unit_price` are unchanged, and `select` of that bill still returns one row.
9. Calling `create_bill` again with the same idempotency key and a different unit price returns the original `id` and `grand_total`. `select count(*) from public.bills` is 1.
10. Two further successful `create_bill` calls return different `bill_number` values.
11. `create_bill` with `p_lines` equal to `'[]'::jsonb` throws a message starting `no_line_items:`.
12. `pg_get_functiondef('public.create_bill(uuid,date,text,text,jsonb)'::regprocedure)` contains `nextval('public.bill_number_seq'` and does not contain `max(`.

End with `select * from finish();` and `rollback;`.

- [ ] **Step 2: Run the database tests**

Run: `supabase test db`

Expected: PASS, 12 tests. If the Supabase CLI or Docker is not installed, leave the SQL file unchanged and report that `supabase test db` could not be started. Do not delete or weaken an assertion.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/billing_db.test.sql supabase/config.toml
git commit -m "Test numbering, snapshots, idempotency, and anonymous denial."
```

---

### Task 7: Supabase client, auth, and shared controls

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/app/auth.tsx`
- Create: `src/features/auth/LoginPage.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/TextField.tsx`
- Create: `src/components/ui/TextArea.tsx`
- Create: `src/components/ui/SelectField.tsx`
- Create: `src/components/ui/Dialog.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/LoadingState.tsx`
- Create: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/features/auth/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `parseDbError`, `AppShell`
- Produces:
  - `supabase` browser client from `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
  - `AuthProvider`, `useAuth()` returning `{ session, authorized, loading, signIn(email, password), signOut() }`
  - `RequireAuth` redirects to `/login` when there is no session or `authorized` is false
  - UI components accept `id`, `label`, and `error` where they take input

- [ ] **Step 1: Write the failing login test**

Render `LoginPage` inside `MemoryRouter`. The page shows an email field, a password field, and a button named `Sign in`. It does not show a link or button named `Create account` or `Sign up`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/auth/LoginPage.test.tsx`

Expected: FAIL because the page module is missing.

- [ ] **Step 3: Implement auth and controls**

`src/lib/supabase.ts` calls `createClient` with the two env vars. If either is an empty string, the client still constructs; screens that call it surface the Supabase error.

`AuthProvider` subscribes to `supabase.auth.getSession()` and `onAuthStateChange`. After a session exists it calls `supabase.rpc('is_authorized')`. `authorized` is that boolean. `signIn` calls `signInWithPassword`. If the following `is_authorized` call is false, it calls `signOut` and throws `Error('This account is not authorized.')`. `signOut` calls `supabase.auth.signOut`.

`LoginPage` uses React Hook Form and `z.object({ email: z.string().email(), password: z.string().min(1) })`. Failed sign-in shows the error from `signIn` or `Invalid email or password.` There is no registration control.

`RequireAuth` shows `LoadingState` with the text `Checking your session…` while `loading` is true. Otherwise it renders `<Navigate to="/login" replace />` or `<Outlet />`.

`AppRouter` wraps protected routes in `AuthProvider` and `RequireAuth`. `/login` is outside `RequireAuth`. `AppShell` receives `onSignOut` from `useAuth`.

`Button` renders a `<button>` with `type` defaulting to `button`, `disabled` styling, and teal background for `variant="primary"`. `TextField`, `TextArea`, and `SelectField` connect a `<label htmlFor>` to the control and render `error` in a `<p>` with `role="alert"`. `Dialog` uses `role="dialog"`, `aria-modal="true"`, and closes on Escape through an `onClose` prop. `EmptyState` and `LoadingState` render their `title` prop. `ConfirmDialog` asks the `title` question and has buttons `Cancel` and `Confirm`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/auth/LoginPage.test.tsx src/components/layout/AppShell.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/app src/features/auth src/components/ui
git commit -m "Add sign-in and shared form controls."
```

---

### Task 8: Services and parts screen

**Files:**
- Create: `src/features/services/api.ts`
- Create: `src/features/services/ServicesPage.tsx`
- Create: `src/features/services/ServiceFormDialog.tsx`
- Test: `src/features/services/ServicesPage.test.tsx`

**Interfaces:**
- Consumes: `masterItemSchema`, `supabase`, `parseDbError`, `toIlikePattern`, `orIlikeFilter`, `formatInr`, `parseRupeesToPaise`
- Produces:

```ts
export type MasterItem = {
  id: string
  itemNumber: string
  name: string
  description: string | null
  itemType: 'service' | 'spare_part'
  defaultPrice: string
  isActive: boolean
}

export async function listMasterItems(query: {
  search: string
  itemType: 'all' | 'service' | 'spare_part'
  status: 'all' | 'active' | 'inactive'
  page: number
}): Promise<{ rows: MasterItem[]; total: number }>

export async function createMasterItem(input: {
  name: string
  description: string
  itemType: 'service' | 'spare_part'
  defaultPrice: string
}): Promise<MasterItem>

export async function updateMasterItem(id: string, input: {
  name: string
  description: string
  itemType: 'service' | 'spare_part'
  defaultPrice: string
}): Promise<MasterItem>

export async function setMasterItemActive(id: string, isActive: boolean): Promise<MasterItem>
```

- [ ] **Step 1: Write the failing page test**

Render `ServicesPage` with a stub `api` prop. The stub resolves `rows: []` and `total: 0`. The page shows `No items yet` and a button `Add Item`. A second test passes one inactive spare part and expects the row to show the item number, name, `Spare Part`, the INR price, and `Inactive`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/services/ServicesPage.test.tsx`

Expected: FAIL because the page module is missing.

- [ ] **Step 3: Implement the API and page**

`listMasterItems` selects `id, item_number, name, description, item_type, default_price, is_active` from `services`. When `search` is non-blank after trim, add `.or(orIlikeFilter(['item_number', 'name', 'description'], toIlikePattern(search)))`. Apply `.eq('item_type', itemType)` unless `all`. Apply `.eq('is_active', status === 'active')` unless `all`. Order by `item_number_value` descending. Use `{ count: 'exact' }` and `.range((page - 1) * 20, page * 20 - 1)`. Map `default_price` to a two-decimal string.

`createMasterItem` calls `supabase.rpc('create_master_item', { p_name, p_description: description or null, p_item_type, p_default_price: defaultPrice })`. `updateMasterItem` calls `update_master_item` with `p_id`. `setMasterItemActive` calls `set_master_item_active` with `p_id` and `p_is_active`. On `error`, throw `parseDbError(error)?.message ?? error.message`.

The SQL argument names in the migration must be `p_name`, `p_description`, `p_item_type`, `p_default_price`, `p_id`, and `p_is_active` so these RPC calls match. `create_bill` argument names are `p_idempotency_key`, `p_bill_date`, `p_customer_name`, `p_customer_address`, and `p_lines`.

`ServicesPage` holds search text, type filter, status filter, and page in state. Changing search, type, or status resets page to 1. Search input is debounced by 300ms before `listMasterItems`. The table columns are Item Number, Item Name, Description, Item Type, Default Price, Status, and Actions. A null description renders `—`. Type labels are `Service` and `Spare Part`. Actions are `Edit` plus `Deactivate` or `Activate`. Deactivate and Activate open `ConfirmDialog` with the title `Deactivate 1001, Needle Set?` or `Activate 1001, Needle Set?` using the row’s values. Confirm calls the API, shows `toast.success`, and reloads. `duplicate_name` from a failed save is passed to the form as the name field error. Other failures use `toast.error`. The empty catalog copy is `No items yet`. A search or filter with zero rows says `No matching items`. A failed load says `Could not load items.` and offers `Try again`.

`ServiceFormDialog` uses `masterItemSchema`. Add does not show an item number until `createMasterItem` resolves; then the dialog shows `Item number 1001` from the result and a `Close` button. Edit shows the item number in a read-only field.

The page title is `Services & Parts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/services/ServicesPage.test.tsx src/features/services/schema.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/services supabase/migrations/20261010120000_init.sql
git commit -m "Add the services and parts master list."
```

---

### Task 9: Billing screen

**Files:**
- Create: `src/features/billing/api.ts`
- Create: `src/features/billing/ItemSearchDialog.tsx`
- Create: `src/features/billing/ItemSearchDialog.test.tsx`
- Create: `src/features/billing/BillingPage.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `Draft`, `addItem`, `setQuantity`, `setUnitPrice`, `removeLine`, `canSave`, `grandTotalPaise`, `loadDraft`, `saveDraft`, `clearDraft`, `MasterItem`, `billHeaderSchema`, `parseRupeesToPaise`, `paiseToRupeeString`, `formatInr`
- Produces:

```ts
export async function searchActiveItems(search: string): Promise<MasterItem[]>
export async function createBill(draft: Draft): Promise<{
  id: string
  billNumber: string
  billDate: string
  grandTotal: string
}>
```

- [ ] **Step 1: Write the failing search-dialog test**

`ItemSearchDialog.test.tsx`:

- With `items: []`, `loading: false`, and `search: 'zzzz'`, the dialog shows `No matching items`.
- With one item `{ itemNumber: '1001', name: 'Machine Service', description: 'General machine servicing', itemType: 'service', defaultPrice: '300.00' }`, the dialog shows `1001`, `Machine Service`, `General machine servicing`, `Service`, and the INR amount.
- A null description shows `—`.
- The dialog has a button named `Clear search` and a button named `Close`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/billing/ItemSearchDialog.test.tsx`

Expected: FAIL because the dialog module is missing.

- [ ] **Step 3: Implement search, save, and the page**

`searchActiveItems` selects the same master columns, `.eq('is_active', true)`, orders by `item_number_value` ascending, and `.limit(20)`. A non-blank search adds the `or` ILIKE filter used by the master list. It does not request a second page.

`createBill` sends:

```ts
{
  p_idempotency_key: draft.idempotencyKey,
  p_bill_date: draft.billDate,
  p_customer_name: draft.customerName.trim() || null,
  p_customer_address: draft.customerAddress.trim() || null,
  p_lines: draft.lines.map((line) => ({
    service_id: line.serviceId,
    quantity: line.quantity,
    unit_price: paiseToRupeeString(line.unitPricePaise),
  })),
}
```

`BillingPage` loads a draft from `sessionStorage` through `loadDraft`. A missing draft uses `createDraft(todayIsoDate(), crypto.randomUUID())`. Every draft change calls `saveDraft`. The bill number reads `Generated on save` until `createBill` returns. The header form uses `billHeaderSchema`. Customer fields are optional.

`Add Item` opens `ItemSearchDialog`. The dialog input debounces `searchActiveItems` by 300ms. An empty query loads the first 20 active items. Arrow keys move `aria-activedescendant`, Enter calls `onSelect`, and Escape calls `onClose`. `Clear search` empties the query. Selecting an item calls `addItem`. A returned error is shown on that existing row.

The line region is a table from `md` upward and stacked cards below `md`. Columns are Sr. No., Item Number, Item Name, Item Description, Item Type, Quantity, Unit Price, Line Amount, and Remove. Quantity is an integer input. Unit price is a text input that commits through `parseRupeesToPaise` on blur. Item identity fields are text, not inputs. Remove calls `removeLine` and the visible serials are the array index plus 1.

The grand total uses `formatInr(grandTotalPaise(draft))`. `Save Bill` is disabled when `canSave` is false or a save is in progress. Failure shows `toast.error` with the parsed database message and leaves the draft in place. Success shows `toast.success('Bill saved.')`, clears the stored draft, and replaces the form with `View Bill` linking to `/bills/${id}` and `Create New Bill`. `Create New Bill` starts `createDraft(todayIsoDate(), crypto.randomUUID())`. Task 10 adds `Print` and `Download PDF` to this panel. The unsaved form does not show those actions.

A link `Add a missing item` points to `/services`. Because the draft is in `sessionStorage`, returning to `/billing` restores it.

Wire `/billing` to `BillingPage`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/billing`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing src/app/router.tsx
git commit -m "Add billing with master-item search and atomic save."
```

---

### Task 10: Saved bills, print, and PDF

**Files:**
- Create: `src/features/bills/api.ts`
- Create: `src/features/bills/pdf.ts`
- Create: `src/features/bills/InvoiceSheet.tsx`
- Create: `src/features/bills/BillsPage.tsx`
- Create: `src/features/bills/BillDetailPage.tsx`
- Create: `src/features/bills/BillsPage.test.tsx`
- Modify: `src/features/billing/BillingPage.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `SavedBill`, `toInvoiceModel`, `formatInr`, `formatBillDate`, `toIlikePattern`, `orIlikeFilter`
- Produces:

```ts
export async function listBills(query: {
  search: string
  billDate: string | null
  fromDate: string | null
  toDate: string | null
  sort: 'asc' | 'desc'
  page: number
}): Promise<{ rows: BillSummary[]; total: number }>

export async function getBill(id: string): Promise<SavedBill | null>

export function downloadBillPdf(bill: SavedBill): void
```

`BillSummary` is `SavedBill` without `customerAddress` and `lines`.

- [ ] **Step 1: Write the failing list test**

Render `BillsPage` with a stub that returns one bill `{ billNumber: 'B-1001', billDate: '2026-10-10', customerName: null, grandTotal: '450.00' }`. The row shows `B-1001`, `10 Oct 2026`, `Walk-in Customer`, and the INR total. A link named `View` points at `/bills/` plus the id. The page does not render a button named `Delete` or `Edit`.

A second render with `rows: []` and a non-empty search shows `No matching bills`. With an empty search and zero rows it shows `No bills yet`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/bills/BillsPage.test.tsx src/features/bills/invoice.test.ts`

Expected: FAIL because `BillsPage` is missing. The invoice test from Task 4 still passes.

- [ ] **Step 3: Implement list, detail, print, and PDF**

`listBills` selects `id, bill_number, bill_date, customer_name, grand_total` from `bills`. A non-blank search uses `orIlikeFilter(['bill_number', 'customer_name'], toIlikePattern(search))`. When `billDate` is set, `.eq('bill_date', billDate)`. Otherwise, when both range ends are set, `.gte('bill_date', fromDate)` and `.lte('bill_date', toDate)`. Order by `bill_date` using `sort`, then `created_at` descending. Page with the same 20-row range as the master list.

`getBill` selects the bill by `id` and its `bill_items` ordered by `line_number`. It returns null when the bill request finds no row. Map snake_case columns into `SavedBill`. The detail query must read `item_number`, `item_name`, `item_description`, `item_type`, `quantity`, `unit_price`, and `line_amount` from `bill_items`, not from `services`.

`BillsPage` title is `Saved Bills`. Controls are a search box, a single date, a from date, a to date, and a sort button `Newest first` / `Oldest first`. If the single date has a value, the range inputs are disabled. If either range input has a value, the single date is disabled. If from is after to, show `The start date must be on or before the end date.` and do not call `listBills`. Empty, no-match, loading (`Loading bills…`), and error (`Could not load bills.` plus `Try again`) states are separate. Customer null displays `Walk-in Customer`.

`BillDetailPage` calls `getBill`. A null result shows `Bill not found`. Otherwise it renders `InvoiceSheet` plus `Print` and `Download PDF`. Print calls `window.print()`. Download calls `downloadBillPdf`.

`InvoiceSheet` renders `toInvoiceModel`. It includes the business name, bill number, date label, customer name, address when present, and a table of item number, name, description, quantity, unit price, and line amount, then the grand total and the thank-you sentence. The table uses `break-inside-avoid` on rows and a repeating header. The sheet is the only content that remains visible in print because the shell and action buttons have `no-print`.

`downloadBillPdf` creates a jsPDF document, writes the same fields in the same order, uses autoTable for the lines with wrapping description cells, adds pages when autoTable overflows, writes the grand total and thank-you sentence after the table, and saves `${bill.billNumber}.pdf`.

`BillingPage` post-save `Print` loads nothing extra: it already has the returned id, so it navigates to `/bills/${id}` only for View. Print and Download on the success panel need the saved lines. After `createBill`, call `getBill(id)` and pass that bill to `downloadBillPdf` and to a printable `InvoiceSheet` on the success panel. If `getBill` fails, show `toast.error` and keep the success panel.

Wire `/bills` and `/bills/:id` in the router.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/bills src/features/billing`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/bills src/features/billing/BillingPage.tsx src/app/router.tsx
git commit -m "Add saved bills, printing, and PDF download."
```

---

### Task 11: README and production build

**Files:**
- Create: `README.md`
- Modify: none of the feature code unless the build reports a type error

**Interfaces:**
- Consumes: the finished app
- Produces: setup instructions and a passing `npm test` plus `npm run build`

- [ ] **Step 1: Write the README**

`README.md` includes these steps, in this order:

1. `npm install`
2. Create a Supabase project.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the project URL and the publishable key. Do not use the service-role key.
4. Apply `supabase/migrations/20261010120000_init.sql` with the Supabase CLI or the SQL editor.
5. In Authentication, create one vendor user and disable public sign-up.
6. Insert that user’s id into `public.authorized_users`.
7. `npm run dev`
8. `npm test` and, with local Supabase running, `supabase test db`
9. `npm run build`
10. Deploy the `dist` folder as a static site and set the same two environment variables in the host.
11. Enable Supabase backups and record how to restore the project.

Also state that item numbers start at 1001, bill numbers start at `B-1001`, and historical bills keep their snapshots when a master item changes.

- [ ] **Step 2: Run the full unit suite and the production build**

Run: `npx vitest run`

Expected: PASS

Run: `npx tsc -b --pretty false`

Expected: exit code 0

Run: `npm run build`

Expected: exit code 0 and a `dist` directory

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document setup, tests, and deployment."
```

---

## Self-review

Spec coverage:

- Access, allowlist, RLS, and revoked writes: Tasks 5 and 7.
- Sequences, item-name uniqueness, integer quantity, snapshots, idempotency, and deferred totals: Task 5, tested in Task 6.
- Paise display math, search escaping, draft quantity merge, and schemas: Tasks 2, 3, and 4.
- Master list search, filters, paging, add, edit, and activate: Task 8.
- Billing search, duplicate quantity, save, and draft restore: Task 9.
- Saved bills, walk-in label, print, and PDF: Task 10.
- README, unit tests, and production build: Task 11.
- Example catalog rows are not inserted. Task 5 says not to seed them.
- Pixel layout checks stay manual, matching the spec. Task 11 does not add a browser pixel suite.

Placeholder scan: every task names the files, the functions, and the assertions. SQL helper bodies are specified by their raise codes and control flow in Task 5. The implementer writes those helpers in that migration rather than inventing different codes.

Type consistency: `MasterItem.defaultPrice`, `DraftLine.unitPricePaise`, `SavedBill.grandTotal`, and the RPC argument names `p_name`, `p_description`, `p_item_type`, `p_default_price`, `p_id`, `p_is_active`, `p_idempotency_key`, `p_bill_date`, `p_customer_name`, `p_customer_address`, and `p_lines` are the same in Tasks 5, 8, 9, and 10.
