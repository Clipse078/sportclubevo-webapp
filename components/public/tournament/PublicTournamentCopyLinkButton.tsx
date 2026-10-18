"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";

type Props = {
  absoluteUrl: string;
  label?: string;
  className?: string;
};

export default function PublicTournamentCopyLinkButton({
  absoluteUrl,
  label = "Link kopieren",
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url: absoluteUrl, title: document.title });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyLink();
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
        data-testid="public-tournament-copy-link"
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
        {copied ? "Kopiert" : label}
      </button>
      {typeof navigator !== "undefined" && "share" in navigator ? (
        <button
          type="button"
          onClick={() => void shareLink()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          data-testid="public-tournament-share"
        >
          Teilen
        </button>
      ) : null}
    </div>
  );
}
