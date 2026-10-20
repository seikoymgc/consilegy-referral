"use client";

import { useState } from "react";

// 文言は呼び出し側（サーバー）から言語に合わせて渡す
export function CopyButton({
  value,
  label = "コピー",
  copiedLabel = "✓ コピーしました",
  failedLabel = "コピーできませんでした。文字を選択してコピーしてください。",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
}) {
  const [feedback, setFeedback] = useState<{
    value: string;
    result: "copied" | "error";
  } | null>(null);
  const status = feedback?.value === value ? feedback.result : "idle";
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ value, result: "copied" });
    } catch {
      setFeedback({ value, result: "error" });
    }
  }
  return (
    <span className="copy-control" aria-live="polite">
      <button type="button" className="secondary copy-button" onClick={copy}>
        {status === "copied" ? copiedLabel : label}
      </button>
      <span className="copy-feedback" role="status">
        {status === "error"
          ? failedLabel
          : ""}
      </span>
    </span>
  );
}
