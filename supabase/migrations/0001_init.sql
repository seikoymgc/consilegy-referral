-- consilegy-referral: 初期スキーマ（短い版・実行済み）
-- 実行場所: Supabase SQL Editor（consilegy-referral プロジェクト）
-- 注意: 製品（Revenue CRM）のDBとは別プロジェクトで実行すること。
-- 方針: パートナー本人は自分の行を更新できない（承認・報酬率は管理者のみ）。

create extension if not exists pgcrypto;

create table if not exists public.partners (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_links (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  amount numeric(12,0) not null default 0,
  payout_status text not null default 'unpaid',
  created_at timestamptz not null default now()
);

alter table public.partners enable row level security;
alter table public.referral_links enable row level security;
alter table public.commissions enable row level security;

create policy "partners_select_own" on public.partners for select using (auth.uid() = id);
create policy "links_select_own" on public.referral_links for select using (auth.uid() = partner_id);
create policy "commissions_select_own" on public.commissions for select using (auth.uid() = partner_id);
