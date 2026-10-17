"use client";

import { useEffect } from "react";

// 開いた人のブラウザでだけ、ログインのフォームを自動で送る。
// メールの安全確認（リンクを先に開くだけのもの）はここを動かさないので、トークンを使い切らない。
export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    form?.requestSubmit();
  }, [formId]);
  return null;
}
