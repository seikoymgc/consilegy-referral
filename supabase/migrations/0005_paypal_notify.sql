-- 0005: PayPalでの支払い（海外の方も含め、誰でも選べる。手数料は当社負担）
-- 実行場所: Supabase SQL Editor（consilegy-referral プロジェクト）。0004 のあとに実行する。何度実行しても同じ結果になる

-- 1) 紹介者の受け取り方に PayPal を足す
alter table public.partners drop constraint if exists partners_payout_method_check;
alter table public.partners add constraint partners_payout_method_check
  check (payout_method in ('bank', 'paypal', 'none'));
alter table public.partners add column if not exists paypal_email text;

-- 2) 支払いごとに、どの方法で払うかを固定する（下書きを作った時点の受け取り方）
alter table public.payouts add column if not exists method text not null default 'bank';
do $$ begin
  alter table public.payouts add constraint payouts_method_check check (method in ('bank', 'paypal'));
exception when duplicate_object then null; end $$;
alter table public.payouts add column if not exists paypal_email_snapshot text;
