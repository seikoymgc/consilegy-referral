# consilegy-referral

Consilegy 紹介パートナープラットフォーム（referral.consilegy.com）。
設計書：Claude Docs「紹介パートナープラットフォーム 設計書」。

## 構成

- Next.js 16（App Router）1つで画面とAPI。Vercelに置く
- データは製品から独立したSupabaseプロジェクト。全テーブルRLS有効・ポリシーなし
- Supabaseを呼ぶのはサーバー側だけ（service role / secret キー）。ブラウザには出さない
- ログインはメールのログインリンク（15分・1回きり）。セッションは30日、使うたびに延長

## 画面

| 紹介者向け | 管理用（role=admin のみ） |
|---|---|
| `/` 案内・申込 | `/admin/` 概要 |
| `/login/` ログイン | `/admin/products/` 製品・報酬ルール・紹介キット・通知キー |
| `/my/` ホーム | `/admin/partners/` 紹介者 |
| `/my/products/` 紹介する | `/admin/referrals/` 紹介案件（受理・確定・紐づけ・手入力） |
| `/my/referrals/` 紹介案件 | `/admin/payouts/` 支払い（承認・振込済み・CSV） |
| `/my/rewards/` 報酬・支払い | |
| `/my/settings/` 登録情報 | |

紹介リンク：`/r/紹介コード/製品`（`.consilegy.com` 全体で読めるCookie `cns_partner_ref` に30日）

## 製品からの通知

`POST /api/events/`（ヘッダー `X-Product: 識別名`、`X-Signature: 本文のHMAC-SHA256 hex`）
本文：`{ type: "signup"|"payment"|"refund", id, referral_code?, contract_id, charge_type?: "monthly"|"service", amount_excl_tax?, plan?, occurred_at, in_product_referral?, company_name?, refund_of? }`
通知キーは管理画面の「製品と報酬ルール」で発行する（1回だけ表示）。

## 定期処理（Vercel Cron）

- `/api/cron/daily/`：リンク経由の自動受理（3営業日）、フォームの受理期限の通知、90日失効、12か月見送り、報酬期間終了
- `/api/cron/monthly/`：前月分の締め、5,000円以上で支払いの下書き

## セットアップ

1. Supabaseの SQL Editor で `supabase/migrations/0002_platform.sql` を実行（`0001_init.sql` は旧版。0002 が削除して作り直す）
2. `.env.example` を見て環境変数を設定（Vercelでは Project Settings → Environment Variables）
3. 最初の管理者：申込んだあと、SQL Editor で `update partners set role = 'admin' where email = '...';`

## 未実装（設計書の範囲で残っているもの）

- 支払通知書PDF（`/api/payouts/{id}/statement/` は今は501を返す）
- 振込用CSVの全銀協形式（当社口座の委託者コードなどが必要。今は項目CSV）
- Revenue CRM側の通知の実装（別リポジトリ）
- 今の `/crm/referral/kit/` からの転送（consilegy-astro 側）
- 祝日を考慮した営業日の計算（今は土日だけ除外）
