"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  reference: string | null | undefined;
  testId?: string;
  className?: string;
  label?: string;
};

/**
 * Copyable public reference shown beside or below record titles on detail surfaces.
 */
export default function SceRecordPublicReferenceDetail({
  reference,
  testId = "sce-record-public-reference",
  className,
  label = "Referenz",
}: Props) {
  const [copied, setCopied] = useState(false);
  const value = reference?.trim() ?? "";
  if (!value) return null;

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <p
      className={cn("text-sm font-medium text-[var(--text-2)]", className)}
      data-testid={testId}
    >
      {label}:{" "}
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="font-mono text-[var(--foreground)]">{value}</span>
        <button
          type="button"
          onClick={() => void copyReference()}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          aria-label={`${label} kopieren`}
        >
          <Copy className="h-3 w-3" aria-hidden />
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </span>
    </p>
  );
}