-- 0003: 支払通知書・全銀データ・士業の確認・紹介キットの中身
-- 実行場所: Supabase SQL Editor（consilegy-referral プロジェクト）。何度実行しても同じ結果になる

alter table public.product_kits add column if not exists pricing text;
alter table public.partners add column if not exists tax_checked_at timestamptz;
alter table public.operators add column if not exists transfer_settings jsonb;
alter table public.operators add column if not exists company_info jsonb;

-- 支払通知書PDFの保存先（非公開。7年保存）
insert into storage.buckets (id, name, public) values ('statements', 'statements', false)
on conflict (id) do nothing;

-- 支払通知書の発行者
update public.operators
set company_info = '{"name":"Consilegy合同会社","address":"〒107-0061 東京都港区北青山1丁目3番1号 アールキューブ青山3階"}'::jsonb
where slug = 'consilegy';

-- 紹介リンクの行き先：紹介キットの文面どおりデモへ（crm.consilegy.com でも紹介Cookieを読める）
update public.products set destination_url = 'https://crm.consilegy.com/demos' where slug = 'revenue-crm';

-- Revenue CRMの紹介キット（consilegy.com/crm/referral/kit/ の文面をそのまま。デモのURLは紹介リンクに置き換え）
insert into public.product_kits (operator_id, product_id, tagline, forward_message, materials, screens, fit, pricing, faq)
select p.operator_id, p.id,
  $k$Revenue CRMは、入力がめんどくさくない中小企業向けのCRMです。名刺は撮るだけ、商談メモは貼るだけで、記録の下書きはAIが作ります。CRM・MA・SFAの導入を40社以上支援してきた山口聖子さんが作っています。$k$,
  $k$【メール用】
件名：顧客管理（CRM）のご紹介

〇〇さん

先日お話しした顧客管理の件で、知り合いの山口聖子さんをご紹介させてください。

山口さんは、CRM・MA・SFAの導入を40社以上支援してきた方で、中小企業向けのCRM「Revenue CRM」を自社で作っています。名刺は撮るだけ、商談メモは貼るだけで、記録の下書きはAIが作ります。入力の手間を減らすことに振り切った設計です。

メールアドレスだけで、実際の画面を触れるデモがあります。
{link}

話を聞いてみたいと思ったら、このメールにご返信ください。山口さんにおつなぎします。合わなければ合わないと言ってくれる人なので、気軽に話してみてください。

【LINE・Messenger用】
この前話してた顧客管理の件、知り合いの山口聖子さんが作ってるCRMが合いそうだったので共有します。名刺は撮るだけ、メモは貼るだけで、記録はAIが下書きしてくれるやつです。
デモはメールアドレスだけで触れます：{link}
話を聞いてみたかったら言ってください。山口さんにつなぎます。$k$,
  $k$[{"title": "サービス紹介資料（PDF）", "url": "https://consilegy.com/downloads/revenue-crm-service-guide.pdf"}, {"title": "スクール版の紹介資料（PDF）", "url": "https://consilegy.com/downloads/revenue-crm-school-guide.pdf"}, {"title": "デモ", "url": "https://crm.consilegy.com/demos"}, {"title": "製品一覧（画面つき）", "url": "https://consilegy.com/products/"}, {"title": "製品ページ", "url": "https://consilegy.com/crm/"}, {"title": "スクール版のページ", "url": "https://consilegy.com/crm/school/"}, {"title": "料金", "url": "https://consilegy.com/crm/pricing/"}]$k$::jsonb,
  $k$[{"title": "B2B版：ダッシュボード", "url": "https://consilegy.com/images/crm/screen-dashboard-2026-10c.webp"}, {"title": "スクール版：レッスン記録", "url": "https://consilegy.com/images/crm/school/screen-lessons-v3.webp"}]$k$::jsonb,
  $k$営業担当がいて、顧客や商談をExcel・スプレッドシートで管理している会社
CRMを入れたが、入力が続かずに止まっている会社
見積・受注・納品・請求までを案件ごとに追いたい制作会社・受託開発の会社
SaaSを再販していて、契約更新や解約の兆しを見落としたくない代理店
生徒の在籍・継続・休会・退会を、LINEやスプレッドシートで追っている教室・スクール$k$,
  $k$ユーザープラン：1人あたり月額3,000円（B2B・受託開発・代理店版）
生徒数プラン：在籍生徒50人まで月額9,800円から（スクール版。講師・スタッフは何人でも同じ料金）
プリペイドプラン：月額3,000円から（使う頻度が低い会社・スクール向け）
初期費用はありません。どのプランも、最初のログインから30日間は月額無料です。
ユーザープランと生徒数プランの契約期間は1年です。個別の初期設定支援は12万円からの有償です。$k$,
  $k$[{"q": "導入実績は？ 何社が使っているの？", "a": "2026年9月に正式リリースしたばかりの製品です。導入企業名は、各社の了承を得たものから公開しています。作っている山口聖子さんは、個人事業の時代を含めて40社以上のCRM・MA・SFAの導入を支援してきた人で、その経験から作った製品です。まずデモで画面を触って判断してみてください、と答えてください。"}, {"q": "他のCRMと何が違うの？", "a": "入力の手間を減らすことに振り切っている点です。名刺は撮るだけ、商談メモは貼るだけ、議事録は自動で入る。記録の下書きをAIが作ります。商談の段階と用途別の自動化が入った状態から始まるので、白紙から設計する必要もありません。"}, {"q": "いくらかかるの？", "a": "上の「料金の要点」のとおりです。初期費用はなく、30日間は月額無料で試せます。細かいご質問は、山口さんにつなぐ形で構いません。"}, {"q": "データは安全？", "a": "データは会社ごとに分けて管理しています。詳しい仕組みは山口さんから説明します。"}, {"q": "売り込まれない？", "a": "紹介先の同意がない限り、山口さんから連絡はしません。話を聞いて合わないと判断したら、契約は勧めずにそう伝えます。"}]$k$::jsonb
from public.products p where p.slug = 'revenue-crm'
on conflict (product_id) do update set
  tagline = excluded.tagline, forward_message = excluded.forward_message, materials = excluded.materials,
  screens = excluded.screens, fit = excluded.fit, pricing = excluded.pricing, faq = excluded.faq, updated_at = now();
