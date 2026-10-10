# Setup on a new computer

These steps assume a new Windows laptop with no Node.js installed. The app itself does not need Docker. It talks to a Supabase project in the cloud.

Run every command from the project folder, the directory that contains `package.json`. On this machine that folder is `D:\Riddhi_Sewing`.

## 1. Install Git

Install [Git for Windows](https://git-scm.com/download/win). Close and reopen PowerShell after the installer finishes.

## 2. Install nvm-windows and Node 22

Windows uses [nvm-windows](https://github.com/coreybutler/nvm-windows/releases), not the macOS or Linux `nvm` installer. Download the latest `nvm-setup.exe`, run it, and let it manage the Node install path.

Close and reopen PowerShell, then install Node 22:

```powershell
nvm install 22
nvm use 22
node -v
npm -v
```

`node -v` should print a version starting with `v22`.

## 3. Get the project and install packages

```powershell
cd D:\Riddhi_Sewing
npm install
```

If you are cloning for the first time, clone the repository first, then `cd` into that folder before `npm install`.

## 4. Connect the app to Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` in the same folder as `package.json`.
3. Set the two values:
   - `VITE_SUPABASE_URL` is `https://<project-ref>.supabase.co`. In the dashboard, open **Connect**, or **Project Settings → Data API**. Do not use the `postgresql://` connection string.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` is the publishable key on that same page.
4. Do not put the service-role key in `.env` or in the frontend.

## 5. Create the database tables

The publishable key cannot create tables. In the Supabase dashboard, open the **SQL Editor** and run the whole file `supabase/migrations/20261010120000_init.sql` once.

## 6. Create the sign-in account

There is no built-in username or password.

1. In **Authentication**, add one user with an email and password.
2. Turn off public sign-up so strangers cannot register.
3. Copy that user's id.
4. In the SQL Editor, run this with the real id:

```sql
insert into public.authorized_users (user_id) values ('that-user-id');
```

Until that row exists, a correct password still will not open the app.

## 7. Start the app

```powershell
cd D:\Riddhi_Sewing
npm run dev
```

Open the local address Vite prints, usually http://localhost:5173/, and sign in with the email and password from step 6.

## 8. Checks you can run later

Unit tests do not need Supabase:

```powershell
npm test
```

A production build writes the site into `dist`:

```powershell
npm run build
```

Deploy that `dist` folder as a static site and set the same two `VITE_` variables on the host.
