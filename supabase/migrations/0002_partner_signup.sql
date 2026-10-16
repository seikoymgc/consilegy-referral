-- consilegy-referral: 登録時にパートナー行を自動作成 / 紹介リンクの作成を許可
-- 実行場所: Supabase SQL Editor（consilegy-referral プロジェクト）
-- 0001_init.sql の後に実行すること。

-- 新規ユーザー登録時に partners 行を作る（登録フォームの名前を使う）
create or replace function public.handle_new_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.partners (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_partner();

-- 本人は、自分名義の紹介リンクだけ作れる
create policy "links_insert_own" on public.referral_links
  for insert with check (auth.uid() = partner_id);
