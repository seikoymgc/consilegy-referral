import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// サーバー側（Server Component / Server Action）で使うSupabaseクライアント。
// ログインしている本人の権限で動く（RLSが効く）。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合は書き込めないが、proxy が更新するので無視してよい
          }
        },
      },
    },
  );
}
