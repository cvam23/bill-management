# Riddhi Sewing Billing

Vendor billing app for master items, draft bills, saved bills, and PDF export. Backend is Supabase (PostgreSQL, Auth, RLS).

## Business rules

- Item numbers start at **1001**.
- Bill numbers start at **`B-1001`**.
- Saved bills store snapshot columns on `bill_items`. If a master item changes later, historical bills keep the values that were saved at billing time.

## Setup

1. Run `npm install`.

2. Create a Supabase project.

3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to your project URL and the **publishable** (anon) key. Do **not** use the service-role key in this app.

4. Apply the database schema by running `supabase/migrations/20261010120000_init.sql` with the Supabase CLI or the SQL editor in the Supabase dashboard.

5. In **Authentication**, create one vendor user (email/password or your chosen provider) and **disable public sign-up** so only that account can sign in.

6. Insert that user’s UUID into `public.authorized_users` (for example: `insert into public.authorized_users (user_id) values ('<auth-user-uuid>');`).

7. Run `npm run dev` and open the local URL shown in the terminal.

## Tests

8. Run unit tests:

   ```bash
   npm test
   ```

   With local Supabase running, also run database tests:

   ```bash
   supabase test db
   ```

## Production build

9. Run:

   ```bash
   npm run build
   ```

   This runs TypeScript project references (`tsc -b`) and then `vite build`. Output goes to the `dist` folder.

10. Deploy the **`dist`** folder as a static site (Vercel, Netlify, Cloudflare Pages, S3 + CDN, etc.). Configure the host with the same two environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Backups

11. Enable **Supabase backups** for the project (Pro plan or your org’s backup policy). Document how to restore:

    - From the dashboard: **Database → Backups** (or **Point-in-time recovery** if enabled), choose a restore point, and follow Supabase’s restore flow to a new project or branch as supported by your plan.
    - Keep a copy of this repo, the applied migration file, and your deployment env var names (not secret values) so you can redeploy after a restore.
