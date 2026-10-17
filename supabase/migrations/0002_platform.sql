-- consilegy-referral: 設計書どおりの11テーブル（運営会社つき）
-- 実行場所: Supabase SQL Editor（consilegy-referral プロジェクト）
-- 0001_init.sql の3テーブルとトリガー（データは空）を削除してから作り直す。
-- 全テーブルRLS有効・ポリシーなし。読み書きはアプリのサーバー側（service role）だけ。

-- 1) 0001 と旧トリガーの片付け
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_partner();
drop table if exists public.commissions cascade;
drop table if exists public.referral_links cascade;
drop table if exists public.partners cascade;

create extension if not exists pgcrypto;

-- 2) 運営会社
create table public.operators (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- 3) 紹介できる製品
create table public.products (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  slug text not null,
  name text not null,
  status text not null default 'hidden' check (status in ('public','preparing','hidden')),
  destination_url text,
  signing_key_encrypted text,
  fit_summary text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (operator_id, slug)
);

-- 4) 製品ごとの報酬ルール
create table public.reward_rules (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  product_id uuid not null references public.products(id),
  kind text not null check (kind in ('monthly_rate','service_rate','fixed')),
  label text not null,
  rate numeric(6,4),
  fixed_amount integer,
  fixed_months numeric(4,1),
  period_months int,
  once boolean not null default false,
  excluded_plans text[] not null default '{}',
  effective_from date not null default current_date,
  created_at timestamptz not null default now()
);

-- 5) 製品ごとの紹介キット
create table public.product_kits (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  product_id uuid not null unique references public.products(id),
  tagline text,
  forward_message text,
  materials jsonb not null default '[]',
  screens jsonb not null default '[]',
  fit text,
  faq jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- 6) 紹介者
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  email text not null,
  name text not null,
  company text,
  phone text,
  referral_code text not null,
  payout_method text not null default 'bank' check (payout_method in ('bank','none')),
  invoice_number text,
  is_professional boolean not null default false,
  bank_encrypted text,
  bank_last4 text,
  terms_version text not null,
  terms_agreed_at timestamptz not null,
  marketing_opt_in boolean not null default false,
  role text not null default 'partner' check (role in ('partner','admin')),
  status text not null default 'active' check (status in ('active','suspended','withdrawn')),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  unique (operator_id, email),
  unique (operator_id, referral_code)
);

-- 7) ログインリンク（ハッシュだけ保存、15分・1回きり）
create table public.login_tokens (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  partner_id uuid not null references public.partners(id) on delete cascade,
  token_hash text not null unique,
  request_ip text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- 8) セッション（ハッシュだけ保存、30日・使うたびに延長）
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  partner_id uuid not null references public.partners(id) on delete cascade,
  session_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- 9) 紹介案件（状態は9つ）
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  partner_id uuid not null references public.partners(id),
  product_id uuid not null references public.products(id),
  company_name text not null,
  contact_name text,
  contact_title text,
  contact_info text,
  note text,
  connection_method text,
  consent_at timestamptz,
  channel text not null check (channel in ('form','link')),
  status text not null default 'pending' check (status in (
    'pending',          -- 受理待ち
    'accepted',         -- 受理
    'existing_contact', -- 既存接点あり
    'out_of_scope',     -- 対象外
    'confirmed',        -- 紹介者確定
    'paying',           -- 有料契約中
    'ended',            -- 報酬期間終了
    'expired',          -- 失効
    'cancelled'         -- 解約
  )),
  accepted_at timestamptz,
  confirmed_at timestamptz,
  paid_started_at date,
  reward_period_end date,
  product_contract_id text,
  has_in_product_referral boolean not null default false,
  rule_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, product_contract_id)
);

-- 10) 支払い（commissions より先に作る）
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  partner_id uuid not null references public.partners(id),
  month date not null,
  amount integer not null,
  status text not null default 'draft' check (status in ('draft','approved','paid')),
  paid_on date,
  statement_number text,
  statement_pdf_path text,
  bank_snapshot_encrypted text,
  invoice_number_snapshot text,
  created_at timestamptz not null default now(),
  unique (partner_id, month)
);

-- 11) 製品からの通知の記録
create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  product_id uuid not null references public.products(id),
  kind text not null check (kind in ('signup','payment','refund')),
  external_id text not null,
  referral_code text,
  product_contract_id text,
  charge_type text check (charge_type in ('monthly','service')),
  amount_excl_tax integer,
  plan text,
  has_in_product_referral boolean not null default false,
  company_name text,
  occurred_at timestamptz not null,
  result text not null default 'held' check (result in ('applied','held','ignored')),
  created_at timestamptz not null default now(),
  unique (product_id, external_id)
);

-- 12) 報酬の台帳（1行＝1回の取引）
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  partner_id uuid not null references public.partners(id),
  referral_id uuid not null references public.referrals(id),
  product_id uuid not null references public.products(id),
  kind text not null check (kind in ('monthly_rate','service_rate','fixed')),
  event_id uuid unique references public.product_events(id),
  base_amount integer not null,
  rate numeric(6,4),
  amount integer not null,
  status text not null default 'held' check (status in ('held','confirmed','paid','cancelled','offset')),
  payout_id uuid references public.payouts(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.referrals (partner_id);
create index on public.referrals (status);
create index on public.commissions (partner_id, status);
create index on public.login_tokens (partner_id, created_at);
create index on public.login_tokens (request_ip, created_at);
create index on public.sessions (partner_id);

-- 13) RLS: 全テーブル有効・ポリシーなし（ブラウザからは一切触れない）
alter table public.operators      enable row level security;
alter table public.products       enable row level security;
alter table public.reward_rules   enable row level security;
alter table public.product_kits   enable row level security;
alter table public.partners       enable row level security;
alter table public.login_tokens   enable row level security;
alter table public.sessions       enable row level security;
alter table public.referrals      enable row level security;
alter table public.payouts        enable row level security;
alter table public.product_events enable row level security;
alter table public.commissions    enable row level security;

-- 14) 初期データ（運営会社・製品・報酬ルール）
insert into public.operators (slug, name) values ('consilegy', 'Consilegy合同会社');

insert into public.products (operator_id, slug, name, status, destination_url, fit_summary, sort_order)
select id, 'revenue-crm', 'Revenue CRM', 'public', 'https://consilegy.com/crm/',
       null, 1
from public.operators where slug = 'consilegy';

insert into public.products (operator_id, slug, name, status, sort_order)
select id, 'otayori', 'おたより秘書', 'preparing', 2
from public.operators where slug = 'consilegy';

insert into public.reward_rules (operator_id, product_id, kind, label, rate, period_months, once, excluded_plans)
select p.operator_id, p.id, 'monthly_rate', '基本プランの月額（税抜・実際の支払額）の20%を12か月', 0.20, 12, false,
       array['prepaid','fuel','option']
from public.products p where p.slug = 'revenue-crm';

insert into public.reward_rules (operator_id, product_id, kind, label, rate, once)
select p.operator_id, p.id, 'service_rate', '導入・定着・運用支援（有償）の税抜支払額の10%を一度', 0.10, true
from public.products p where p.slug = 'revenue-crm';
