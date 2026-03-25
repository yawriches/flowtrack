-- FlowTrack: Financial Management App Schema
-- Run this in your Supabase SQL Editor

-- 1. Wallets table
create table public.wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('mobile_money', 'bank', 'cash')),
  created_at timestamptz default now() not null
);

-- 2. Categories table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null
);

-- 3. Transactions table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  to_wallet_id uuid references public.wallets(id) on delete cascade,
  description text default '',
  created_at timestamptz default now() not null
);

-- 4. Enable Row Level Security
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- 5. RLS Policies: Users can only access their own data

-- Wallets policies
create policy "Users can view own wallets"
  on public.wallets for select
  using (auth.uid() = user_id);

create policy "Users can insert own wallets"
  on public.wallets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own wallets"
  on public.wallets for update
  using (auth.uid() = user_id);

create policy "Users can delete own wallets"
  on public.wallets for delete
  using (auth.uid() = user_id);

-- Categories policies
create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- Transactions policies
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- 6. View: Wallet balances derived from transactions
create or replace view public.wallet_balances as
select
  w.id as wallet_id,
  w.user_id,
  w.name,
  w.type,
  coalesce(
    (select sum(t.amount) from public.transactions t where t.wallet_id = w.id and t.type = 'income'),
    0
  )
  -
  coalesce(
    (select sum(t.amount) from public.transactions t where t.wallet_id = w.id and t.type = 'expense'),
    0
  )
  -
  coalesce(
    (select sum(t.amount) from public.transactions t where t.wallet_id = w.id and t.type = 'transfer'),
    0
  )
  +
  coalesce(
    (select sum(t.amount) from public.transactions t where t.to_wallet_id = w.id and t.type = 'transfer'),
    0
  ) as balance
from public.wallets w;
