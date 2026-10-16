import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// サーバー側だけで使うSupabaseクライアント（service role）。
// ブラウザには絶対に渡さない。全テーブルはRLS有効・ポリシーなしなので、このクライアント以外からは触れない。
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL と SUPABASE_SECRET_KEY を環境変数に設定してください");
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

let operatorIdCache: string | null = null;

// 今は運営会社がConsilegyだけ。全クエリをこのIDで絞る。
export async function operatorId(): Promise<string> {
  if (operatorIdCache) return operatorIdCache;
  const slug = process.env.OPERATOR_SLUG ?? "consilegy";
  const { data, error } = await db().from("operators").select("id").eq("slug", slug).single();
  if (error || !data) throw new Error(`運営会社 ${slug} が見つかりません`);
  operatorIdCache = data.id as string;
  return operatorIdCache;
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
