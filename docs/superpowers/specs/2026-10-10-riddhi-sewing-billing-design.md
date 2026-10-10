# Riddhi Sewing Machine Billing — Design

Date: 2026-10-10

Status: approved for implementation

## Purpose

A single-business web app for Riddhi Sewing Machine. The owner creates bills for services and spare parts, maintains the master list those bills must use, and later finds, prints, and downloads saved bills.

The app is a Vite + React + TypeScript (strict) single-page application. Supabase PostgreSQL is the system of record. The browser uses `@supabase/supabase-js` with the publishable key.

## Locked decisions

- Quantity is a whole number from 1 to 9999.
- Item numbers are a database sequence starting at 1001, stored as text: `1001`, `1002`.
- Bill numbers are a separate sequence starting at 1001, stored as `B-1001`, `B-1002`. Gaps are acceptable. Numbers are never reused.
- Within one item type, names are unique after trim and case-folding. The same name may exist once as a service and once as a spare part.
- Description is optional.
- Unit price on a bill may differ from the master default. The master price does not change.
- Selecting the same master item twice on one unsaved bill increases that row’s quantity. Separate rows for the same item are not allowed.
- Money on screen is calculated in integer paise. The database recalculates and stores `NUMERIC(12,2)`.
- Currency is INR (`₹`) only. No GST, discounts, payments, or tax lines.

## Access

### Login

`/login` is email and password. There is no registration screen and no link to create an account. The owner’s user is created in the Supabase dashboard, and public sign-up is disabled there.

`/` redirects to `/billing`. Signed-out visits to `/billing`, `/services`, `/bills`, and `/bills/:id` redirect to `/login`. A session that fails `is_authorized()` is treated the same way.

### Allowlist

`authorized_users` stores `user_id` (uuid, primary key, references `auth.users`) and `created_at`.

`is_authorized()` returns true only when `auth.uid()` is in that table. It is `SECURITY DEFINER`, `STABLE`, with `search_path = public`. Row-level security is enabled on `authorized_users`, `services`, `bills`, and `bill_items`. Policies and every privileged function call `is_authorized()`.

`authorized_users` has no client policies, so the browser cannot read or change the allowlist. The owner’s id is inserted with the SQL editor after the Auth user exists. `is_authorized()` can read the table because its owner bypasses row-level security. Privileged functions also run as that owner, which is why each one checks `is_authorized()` before doing anything else. An authenticated user who is not on the list cannot read or write business data.

### What the browser may do

The browser may select from `services`, `bills`, and `bill_items` when `is_authorized()` is true. Filters are query parameters. The app never concatenates user text into SQL.

The browser may not insert, update, or delete those tables. There are no write policies. `INSERT`, `UPDATE`, and `DELETE` are revoked from `anon` and `authenticated`. Sequences are not usable by those roles. The service-role key never appears in frontend code or in git.

### Privileged functions

These functions are `SECURITY DEFINER` with `search_path = public`. `EXECUTE` is granted to `authenticated` and revoked from `PUBLIC` and `anon`. Each function raises `not_authorized` unless `is_authorized()` is true. The one authorized user can read every master item and every bill.

| Function | Effect |
|---|---|
| `create_master_item` | Inserts one master row and assigns the item number |
| `update_master_item` | Updates name, description, type, and default price |
| `set_master_item_active` | Sets `is_active` |
| `create_bill` | Inserts one bill and its lines, or returns the bill for an existing idempotency key |

## Data model

### `services`

Master rows for both services and spare parts.

| Column | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key, `gen_random_uuid()` |
| `item_number` | text | Not null, unique, assigned once |
| `name` | text | Not null, trimmed, 1–100 characters |
| `description` | text | Null when blank, otherwise trimmed, at most 500 characters |
| `item_type` | text | `service` or `spare_part` |
| `default_price` | numeric(12,2) | Not null, `>= 0` |
| `is_active` | boolean | Not null, default true |
| `created_at` | timestamptz | Not null, default `now()` |
| `updated_at` | timestamptz | Not null, set on insert and update |

Unique index on `(item_type, lower(btrim(name)))`.

Item numbers come from `service_item_number_seq`, which starts at 1001. The function stores `nextval(...)::text`. Nothing uses `max(item_number) + 1`.

There is no delete function and no delete grant. `bill_items.service_id` references `services(id)` with `ON DELETE RESTRICT`.

`updated_at` is maintained by a trigger.

### `bills`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key, `gen_random_uuid()` |
| `bill_number` | text | Not null, unique |
| `bill_date` | date | Not null |
| `customer_name` | text | Null when blank, otherwise trimmed, at most 120 characters |
| `customer_address` | text | Null when blank, otherwise trimmed, at most 500 characters |
| `grand_total` | numeric(12,2) | Not null, `>= 0` |
| `idempotency_key` | uuid | Not null, unique |
| `created_at` | timestamptz | Not null, default `now()` |

Bill numbers come from `bill_number_seq`, which starts at 1001. The stored value is `'B-' || nextval(...)::text`.

Bills are insert-only. There is no update or delete function.

### `bill_items`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key, `gen_random_uuid()` |
| `bill_id` | uuid | Not null, references `bills(id)` `ON DELETE RESTRICT` |
| `service_id` | uuid | Not null, references `services(id)` `ON DELETE RESTRICT` |
| `line_number` | integer | Not null, `>= 1`, unique per bill |
| `item_number` | text | Not null, snapshot |
| `item_name` | text | Not null, snapshot |
| `item_description` | text | Snapshot, null if the master description was null |
| `item_type` | text | Snapshot, `service` or `spare_part` |
| `quantity` | integer | Not null, `>= 1` and `<= 9999` |
| `unit_price` | numeric(12,2) | Not null, `>= 0` |
| `line_amount` | numeric(12,2) | Not null, `>= 0`, must equal `quantity * unit_price` |
| `created_at` | timestamptz | Not null, default `now()` |

Unique `(bill_id, service_id)`.

A deferred constraint trigger checks, at the end of the transaction, that every bill’s `grand_total` equals the sum of its line amounts and that every bill has at least one line.

### Indexes and search

Partial, case-insensitive search uses `ILIKE` on parameters. The application trims the typed text, escapes `\`, `%`, and `_`, then wraps the result in `%`.

Trigram GIN indexes (`pg_trgm`) on:

- `services.item_number`, `services.name`, `services.description`
- `bills.bill_number`, `bills.customer_name`

`bills.bill_date` has a btree index. Master-list ordering casts `item_number` to bigint.

## Trusted write behavior

The client calls these functions with `supabase.rpc`. Validation failures raise an exception whose message starts with a stable code, a colon, and a short sentence. The transaction rolls back. The screen keeps what the user typed.

| Code | When |
|---|---|
| `not_authorized` | Caller is missing from `authorized_users` |
| `name_required` | Name is empty after trim |
| `name_too_long` | Name is longer than 100 characters |
| `description_too_long` | Description is longer than 500 characters |
| `invalid_item_type` | Type is not `service` or `spare_part` |
| `invalid_price` | Price is missing, negative, has more than two decimal places, or overflows `numeric(12,2)` |
| `duplicate_name` | Another row of the same type already has that normalized name |
| `item_not_found` | Master id does not exist |
| `item_inactive` | Master row exists and `is_active` is false. The sentence includes the item number |
| `bill_date_required` | Bill date is missing or not a real calendar date |
| `customer_name_too_long` | Customer name is longer than 120 characters |
| `customer_address_too_long` | Customer address is longer than 500 characters |
| `no_line_items` | The line array is empty |
| `duplicate_line` | The same `service_id` appears twice in one bill |
| `invalid_quantity` | Quantity is not an integer from 1 to 9999 |
| `invalid_unit_price` | Unit price fails the same rules as `invalid_price` |

### Master items

`create_master_item(name, description, item_type, default_price)` trims text, stores a blank description as null, checks type and price, takes the next item number, and inserts. A unique-index violation on the name becomes `duplicate_name`.

`update_master_item(id, name, description, item_type, default_price)` applies the same checks and does not change `item_number`. The name uniqueness check ignores the row being edited. Snapshots already stored on bills stay as they are. A missing id raises `item_not_found`.

`set_master_item_active(id, is_active)` updates only the flag.

Price must be a non-negative decimal with at most two fractional digits and must fit `numeric(12,2)`. Zero is allowed.

### `create_bill`

Arguments:

- `idempotency_key` uuid
- `bill_date` date
- `customer_name` text, optional
- `customer_address` text, optional
- `lines` jsonb array

Each line object contains only `service_id`, `quantity`, and `unit_price`. `unit_price` is a decimal string with two places, such as `"300.00"`, so the browser does not send a binary float. The function ignores any name, description, type, item number, or total in that payload.

If `idempotency_key` already exists, the function returns that bill’s id, bill number, bill date, and grand total and inserts nothing. The response is the source of truth even when the caller’s current form differs.

Otherwise, inside one transaction:

1. Reject a missing or invalid bill date (`bill_date_required`). Any real calendar date is accepted.
2. Normalize customer fields. Empty becomes null. Over-long text is rejected.
3. Reject an empty line list (`no_line_items`).
4. Reject a repeated `service_id` (`duplicate_line`).
5. For each line, load the master row. Missing becomes `item_not_found`. Inactive becomes `item_inactive`. The message includes the item number when the row exists.
6. Require an integer quantity from 1 to 9999 and a valid unit price.
7. Copy `item_number`, `name`, `description`, and `item_type` from the master row.
8. Set `line_amount` to `quantity * unit_price` and `line_number` from the array order, starting at 1.
9. Set `grand_total` to the sum of the line amounts.
10. Assign the next bill number and insert the bill and lines.

The function returns `id`, `bill_number`, `bill_date`, and `grand_total`.

## Screens

Shared chrome: slate page background, slate text, one primary color (`teal-800`). A small spool-and-needle mark and the words “Riddhi Sewing Machine” sit in the sidebar. Desktop shows the sidebar. A phone uses a collapsible menu. Focus rings are visible. Toasts use Sonner.

Shared components: button, text input, textarea, select, dialog, data table, loading indicator, empty state, confirmation dialog, toast.

Dates are edited with a date input and displayed with date-fns as `d MMM yyyy` (for example, 10 Oct 2026). Money is displayed with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

Lists request 20 rows per page from the database.

### Billing (`/billing`)

The bill number reads “Generated on save” until a save returns a number. The date defaults to the current local calendar date and can be changed. Customer name and address are optional.

**Add Item** opens a dialog. Search is debounced by 300ms and matches item number, name, and description together. Only active items are queried. An empty query loads the first 20 active items by item number ascending. The dialog shows at most 20 matches and does not page; a narrower query is how the owner reaches a row that did not fit. Each result shows item number, name, description (an em dash when blank), type, and default price. The dialog shows loading, a clear-search control, and a no-match message. Arrow keys move, Enter selects, Escape closes. On a phone the dialog fits the viewport. The page itself does not scroll horizontally.

A chosen item becomes a row. Item number, name, description, and type are read-only. Quantity starts at 1. Unit price starts at the master default and can be edited for this bill. Line amount and grand total update immediately. Prices are parsed into integer paise and multiplied as integers. The screen sends prices to the database as decimal strings with two places, such as `"300.00"`.

Selecting an item that is already on the bill adds 1 to that row’s quantity and leaves its current unit price unchanged. If that would pass 9999, the quantity stays and the row shows an error. Remove deletes the row, renumbers the serials from 1, and updates the total.

The form holds one idempotency key, a UUID created when the draft starts. Save is disabled while the request runs and while there are no rows. Failure shows the error and leaves the draft in place. Success shows a toast only after the database responds, then offers View Bill, Print, Download PDF, and Create New Bill. Create New Bill clears the draft and creates a new idempotency key.

If a response is lost and the same key is sent again, the screen replaces the draft view with the bill returned by the function and shows the post-save actions.

Leaving for `/services` in the same tab stores the draft in `sessionStorage` under `riddhi.billing.draft`. Returning to `/billing` restores it. A corrupt payload is ignored. A new browser tab does not see that draft. Successful save and Create New Bill remove the stored draft.

### Services and parts (`/services`)

The table shows item number, name, description, type, default price, status, and actions. A blank description is an em dash. Search matches item number, name, and description with the same escaping and case-insensitive partial rules. An empty search box shows the current filters, page 1. Filters are type (all, service, spare part) and status (all, active, inactive). Default order is item number descending, as a number. States: loading, empty catalog, no matches, and error. Narrow screens scroll the table, not the page.

Add and edit open a dialog. Add collects name, description, type, and default price, then shows the item number returned by the database. Edit shows the item number as read-only and updates the four editable fields. `duplicate_name` is shown on the name field.

Activate and deactivate ask for confirmation that names the item number and name, then call `set_master_item_active`. There is no Delete control.

The billing page links here in the same tab so the draft can be restored.

### Saved bills (`/bills`, `/bills/:id`)

The list shows bill number, date, customer, and grand total. A null customer name is “Walk-in Customer.” Search covers bill number and customer name. An empty search shows all bills for the active date filter, page 1. The user filters by one date or by a from–to range, not both controls at once. A single date means that date only. If the from date is after the to date, the form shows an error and does not query. Default sort is `bill_date` descending, then `created_at` descending. The user can flip the date direction. Paging, search, and filters run in the database. There is no edit or delete.

The detail page loads the bill and its `bill_items` ordered by `line_number`. It shows the business name, bill number, date, customer name and address when present, and each snapshot field plus quantity, unit price, line amount, and grand total. An unknown id is a not-found state. Deactivating or editing a master item does not change this page.

### Print and PDF

Both actions exist on the detail page and on the post-save panel. They are absent on an unsaved draft.

Print uses `window.print()` and a print stylesheet that hides navigation, buttons, and other chrome. The sheet contains:

- Riddhi Sewing Machine
- Bill number and bill date
- Customer name and address when present
- Item number, name, description, quantity, unit price, and line amount
- Grand total
- “Thank you for choosing Riddhi Sewing Machine.”

Table headers repeat on later pages. Rows do not split. The thank-you line stays with the total when it fits. The layout does not add a trailing blank page.

PDF download uses jsPDF and jsPDF-AutoTable with the same fields and order. Descriptions wrap. The file name is the bill number plus `.pdf`, for example `B-1001.pdf`.

## Client structure

```text
src/
  app/router.tsx
  components/layout/
  components/ui/
  features/billing/
  features/services/
  features/bills/
  lib/supabase.ts
  lib/currency.ts
  lib/date.ts
  styles/index.css
  main.tsx
supabase/migrations/
supabase/tests/
```

Database calls live in each feature’s `api.ts`. Draft math lives in a pure function that adds a line, increments quantity, removes a line, and totals paise. Components do not talk to Supabase directly.

Environment example:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The README documents: install, create the Supabase project, set environment variables, apply migrations, create the vendor user, insert that user into `authorized_users`, disable public sign-up, start the dev server, run tests, build, deploy the frontend, and configure backups. Real keys are not committed.

## Tests

`npm test` (Vitest) does not need a live database:

- Paise parse, multiply, sum, and INR format.
- Draft rules: default quantity 1, duplicate selection increments quantity and keeps the overridden price, the 9999 cap, remove renumbers and retotals, empty draft cannot save.
- Zod schemas for master-item and bill fields, including optional customer fields and optional description.
- Search text trimming and escaping of `%`, `_`, and `\`.
- Invoice model: walk-in label, snapshot fields rather than master fields, long description, grand total.

`supabase/tests` runs against the local Supabase stack:

- Item numbers and bill numbers come from sequences and stay unique under concurrent calls.
- Duplicate normalized names in the same type fail. The same name in the other type succeeds.
- Negative prices and zero quantities fail.
- `create_bill` rejects an inactive or unknown `service_id` and leaves no bill behind.
- A saved bill still shows the original item number, name, description, and unit price after the master row’s price, name, and active flag change.
- Repeating `idempotency_key` returns the original bill and does not insert a second one.
- `anon` cannot read or write the tables and cannot execute the functions.

Phone, tablet, and desktop layout is verified by using the three modules at those widths. The automated suite does not assert pixel positions.

## Out of scope

GST and other taxes, discounts, payment collection, paid or unpaid status, a customer directory, stock, purchases, suppliers, multiple branches, multiple roles, WhatsApp, email, editing or deleting a saved bill, analytics, and a native mobile app.

## Documentation note

The suggested `bill_items.quantity` of `numeric(12,3)` is intentionally an integer. The business bills whole units only.
