# FlowTrack — Financial Management App

A clean, minimal financial management web app built with Next.js, Supabase, Tailwind CSS, and Recharts.

## Features

- **Authentication** — Email + password via Supabase Auth
- **Wallets** — Create multiple accounts (Mobile Money, Bank, Cash) with auto-calculated balances
- **Categories** — Custom categories for organizing transactions
- **Transactions** — Income, Expense, and Transfer support with proper balance logic
- **Dashboard** — Summary cards, expense charts, and recent transactions
- **Mobile-friendly** — Responsive sidebar + floating action button

## Tech Stack

- **Frontend:** Next.js 16 (App Router, React 19, TypeScript)
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Icons:** Lucide React

## Setup Instructions

### 1. Clone and install

```bash
cd flowtrack
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **Anon Key** from Settings → API

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the database schema

1. Open the **SQL Editor** in your Supabase dashboard
2. Paste and run the contents of `supabase-schema.sql`

This creates:
- `wallets`, `categories`, `transactions` tables
- Row Level Security policies (users only see their own data)
- `wallet_balances` view (auto-calculates balances from transactions)

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

### 6. Register and start using

1. Create an account at `/register`
2. Create wallets at `/wallets`
3. Create categories at `/categories`
4. Add transactions at `/transactions`
5. View your dashboard at `/dashboard`

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated layout group
│   │   ├── layout.tsx      # Sidebar + main content layout
│   │   ├── dashboard/      # Dashboard with stats & charts
│   │   ├── transactions/   # Transaction list + add modal
│   │   ├── wallets/        # Wallet list + create form
│   │   └── categories/     # Category list + create form
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Redirects to /dashboard
│   └── globals.css
├── components/
│   └── Sidebar.tsx         # Navigation sidebar (responsive)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   ├── server.ts       # Server Supabase client
│   │   └── middleware.ts   # Auth session refresh
│   └── types.ts            # TypeScript interfaces
├── middleware.ts            # Next.js middleware (auth guard)
```

## Transaction Logic

| Type     | Effect                                          |
|----------|--------------------------------------------------|
| Income   | Adds amount to selected wallet                   |
| Expense  | Subtracts amount from selected wallet             |
| Transfer | Subtracts from source wallet, adds to destination |

Wallet balances are **always derived from transactions** via the `wallet_balances` database view — never manually edited.
