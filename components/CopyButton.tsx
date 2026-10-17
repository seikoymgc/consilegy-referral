"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "コピー",
}: {
  value: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }
  return (
    <span className="copy-control">
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
