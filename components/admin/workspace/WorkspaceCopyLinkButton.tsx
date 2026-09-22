"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";

import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";

type WorkspaceCopyLinkButtonProps = {
  target:
    | { type: "folder"; folderId: string }
    | { type: "document"; documentId: string; versionId?: string | null };
  label?: string;
  className?: string;
};

export function WorkspaceCopyLinkButton({
  target,
  label = "Link kopieren",
  className = "",
}: WorkspaceCopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const path = buildWorkspaceInternalLink(target);
    const absolute =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void copyLink()}
      className={`inline-flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-[var(--foreground)] ${className}`}
    >
      <Link2 className="h-4 w-4" aria-hidden="true" />
      {copied ? "Kopiert" : label}
    </button>
  );
}
