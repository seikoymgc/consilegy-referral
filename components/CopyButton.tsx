"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "コピー",
}: {
  value: string;
  label?: string;
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
        {status === "copied" ? "✓ コピーしました" : label}
      </button>
      <span className="copy-feedback" role="status">
        {status === "error"
          ? "コピーできませんでした。文字を選択してコピーしてください。"
          : ""}
      </span>
    </span>
  );
}
