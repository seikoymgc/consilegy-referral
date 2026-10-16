-- consilegy-referral: 初期スキーマ（紹介パートナー・紹介リンク・成果・報酬）
-- 実行場所: Supabase 管理画面 > SQL Editor（consilegy-referral プロジェクト）
-- 注意: 製品（Revenue CRM）のDBとは別プロジェクトで実行すること。

create extension if not exists "pgcrypto";

-- 製品（紹介対象）
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,          -- 例: jade, otayori-secretary
  name        text not null,
  commission_rate numeric(5,4) not null default 0.10,  -- 報酬率（例: 0.10 = 10%）
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 紹介パートナー（認証ユーザーと1対1）
create table if not exists public.partners (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email       text not null,
  status      text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at  timestamptz not null default now()
);

-- 紹介リンク（パートナー × 製品）
create table if not exists public.referral_links (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partners(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  code        text not null unique,          -- URLに使う短いコード
  created_at  timestamptz not null default now()
);

-- 紹介による成果（商談・契約）
create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references public.referral_links(id) on delete cascade,
  status      text not null default 'lead' check (status in ('lead','won','lost')),
  amount      numeric(12,0),                 -- 成約金額（円）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 報酬（成果1件につき1行）
create table if not exists public.commissions (
  id          uuid primary key default gen_random_uuid(),
  referral_id uuid not null unique references public.referrals(id) on delete cascade,
  partner_id  uuid not null references public.partners(id) on delete cascade,
  amount      numeric(12,0) not null,
  payout_status text not null default 'unpaid' check (payout_status in ('unpaid','scheduled','paid')),
  created_at  timestamptz not null default now()
);

create index if not exists referral_links_partner_idx on public.referral_links(partner_id);
create index if not exists referrals_link_idx on public.referrals(link_id);
create index if not exists commissions_partner_idx on public.commissions(partner_id);

-- RLS: パートナーは自分のデータだけ見える
alter table public.products       enable row level security;
alter table public.partners       enable row level security;
alter table public.referral_links enable row level security;
alter table public.referrals      enable row level security;
alter table public.commissions    enable row level security;

create policy "products: 有効な製品は誰でも読める"
  on public.products for select using (is_active);

create policy "partners: 自分の行だけ読める"
  on public.partners for select using (auth.uid() = id);

create policy "partners: 自分の行だけ更新できる"
  on public.partners for update using (auth.uid() = id);

create policy "referral_links: 自分のリンクだけ読める"
  on public.referral_links for select using (auth.uid() = partner_id);

create policy "referrals: 自分のリンク経由の成果だけ読める"
  on public.referrals for select using (
    exists (select 1 from public.referral_links l
            where l.id = referrals.link_id and l.partner_id = auth.uid())
  );

create policy "commissions: 自分の報酬だけ読める"
  on public.commissions for select using (auth.uid() = partner_id);

-- 書き込み（referrals / commissions / products の作成・更新）は、管理者が
-- service role 経由で行う前提。クライアントからの insert/update policy は作らない。
