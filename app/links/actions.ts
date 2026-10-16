"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 8文字の短いコード（重複したらDBが弾く）
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

  const { error } = await supabase
    .from("referral_links")
    .insert({ partner_id: user.id, code });

  if (error) {
    throw new Error(`紹介リンクを作れませんでした: ${error.message}`);
  }

  revalidatePath("/links");
  revalidatePath("/dashboard");
}
