-- 0004: 英語版（紹介者ごとの言語・製品の英語の文言）
-- 実行場所: Supabase SQL Editor（consilegy-referral プロジェクト）。何度実行しても同じ結果になる
-- 0003 のあとに実行する。英語の文言は公開前に代表が確認する（PRの説明を参照）

-- 1) 紹介者の言語。マイページ・メール・支払通知書をこの言語で出す
alter table public.partners add column if not exists locale text not null default 'ja';
do $$ begin
  alter table public.partners add constraint partners_locale_check check (locale in ('ja', 'en'));
exception when duplicate_object then null; end $$;

-- 2) 製品・報酬ルール・紹介キットの英語の文言（空なら日本語をそのまま出す）
alter table public.products add column if not exists fit_summary_en text;
alter table public.reward_rules add column if not exists label_en text;
-- tagline / forward_message / fit / pricing / materials / screens / faq を英語で持つ（形は日本語の列と同じ）
alter table public.product_kits add column if not exists content_en jsonb;

-- 3) Revenue CRM の報酬ルールの英語
update public.reward_rules r
set label_en = 'Monthly plan: 20% of the base plan''s monthly fee (excl. tax, the amount actually paid), for 12 months'
from public.products p
where r.product_id = p.id and p.slug = 'revenue-crm' and r.kind = 'monthly_rate' and r.label_en is null;

update public.reward_rules r
set label_en = 'Support services: 10% of paid setup, adoption, and operations support (excl. tax), once'
from public.products p
where r.product_id = p.id and p.slug = 'revenue-crm' and r.kind = 'service_rate' and r.label_en is null;

-- 4) Revenue CRM の紹介キットの英語（consilegy.com/en/crm/ の英語の文面に合わせる。{link} は紹介リンクに置き換わる）
update public.product_kits k
set content_en = $k${
  "tagline": "Revenue CRM is a customer management system for small businesses where entering data isn't a chore. Snap a business card, paste your meeting notes, and AI drafts the record. It is built by Seiko Yamaguchi, who has supported 40+ CRM, MA, and SFA rollouts.",
  "forward_message": "[For email]\nSubject: An introduction about customer management\n\nHi ___,\n\nFollowing up on our conversation about managing customers, I'd like to introduce you to Seiko Yamaguchi, someone I know.\n\nSeiko has supported more than 40 CRM, MA, and SFA rollouts, and her company builds Revenue CRM, a customer management system for small businesses. You snap a business card or paste your meeting notes, and AI drafts the record for you. It is designed around cutting the time spent on data entry. The screens switch between Japanese, English, and Traditional Chinese.\n\nHere is the product page, where you can also try the real screens in a demo with just your email address:\n{link}\n\nIf you'd like to talk to her, just reply to this email and I'll connect you. She will tell you honestly if it isn't a fit, so feel free to have a conversation.\n\n[For chat (LINE, WhatsApp, Messenger)]\nAbout the customer management thing we talked about: a CRM that Seiko Yamaguchi, someone I know, is building looks like a good fit, so I'm sharing it. You snap business cards, paste notes, and AI drafts the record.\nDetails, and a demo you can try with just your email: {link}\nLet me know if you want to talk to her and I'll connect you.",
  "fit": "Companies with salespeople who track customers and deals in Excel or spreadsheets\nCompanies that bought a CRM but stopped using it because data entry didn't stick\nAgencies and contract developers who want to follow quotes, orders, delivery, and invoicing per project\nResellers of SaaS who don't want to miss renewals or signs of churn\nClasses and schools tracking student enrollment, continuation, pauses, and withdrawals in LINE or spreadsheets",
  "pricing": "User plan: ¥3,000 per user per month (B2B, agency & contract work, and reseller editions)\nStudent plan: from ¥9,800 per month for up to 50 enrolled students (school edition; any number of teachers and staff at the same price)\nPrepaid plan: from ¥3,000 per month (for companies and schools that use it less often)\nNo setup fee. Every plan is free for the first 30 days from the first sign-in.\nThe User plan and Student plan are 1-year contracts. Individual setup support is paid, from ¥120,000.\nAll prices exclude tax.",
  "materials": [
    {"title": "Product page (English)", "url": "https://consilegy.com/en/crm/"},
    {"title": "Features (English)", "url": "https://consilegy.com/en/crm/features/"},
    {"title": "Pricing (English)", "url": "https://consilegy.com/en/crm/pricing/"},
    {"title": "School edition (English)", "url": "https://consilegy.com/en/crm/school/"},
    {"title": "Demo", "url": "https://crm.consilegy.com/demos"},
    {"title": "Service guide (PDF, Japanese)", "url": "https://consilegy.com/downloads/revenue-crm-service-guide.pdf"}
  ],
  "screens": [
    {"title": "B2B edition: dashboard", "url": "https://consilegy.com/images/crm/screen-dashboard-2026-10c.webp"},
    {"title": "School edition: lesson records", "url": "https://consilegy.com/images/crm/school/screen-lessons-v3.webp"}
  ],
  "faq": [
    {"q": "Who uses it? How many companies?", "a": "It is a new product, officially released in September 2026. Customer names are published only with each company's permission. Seiko Yamaguchi, who builds it, has supported more than 40 CRM, MA, and SFA rollouts (including her years as an independent consultant), and the product comes from that experience. Suggest they try the screens in the demo and decide for themselves."},
    {"q": "How is it different from other CRMs?", "a": "It goes all in on cutting data entry. Snap a business card, paste meeting notes, and transcripts come in on their own. AI drafts the record. It starts with deal stages and automations for each use case already in place, so nobody has to design it from a blank page."},
    {"q": "Is it available in English?", "a": "Yes. The screens switch between Japanese, English, and Traditional Chinese, and support is available in English."},
    {"q": "How much does it cost?", "a": "See the pricing summary above. There is no setup fee, and every plan is free for 30 days. For detailed questions, it's fine to connect them with Seiko."},
    {"q": "Is the data safe?", "a": "Each company's data is kept separate. Seiko can explain how it works in detail."},
    {"q": "Will they get a hard sell?", "a": "Seiko never contacts them without their consent. If, after talking, it isn't a fit, she will tell them so rather than push a contract."}
  ]
}$k$::jsonb
from public.products p
where k.product_id = p.id and p.slug = 'revenue-crm' and k.content_en is null;
