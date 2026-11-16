"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { buildVorhabenUndUmsetzungHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { VorhabenAufgabenWorkspaceVariant } from "./VorhabenAufgabenWorkspace";

type Props = {
  targetTitle: string;
  removeHref: string;
  variant?: VorhabenAufgabenWorkspaceVariant;
};

export default function VorhabenZielFilterChip({ targetTitle, removeHref }: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="vorhaben-ziel-filter-chip"
      role="status"
    >
      <span className="text-xs text-[var(--muted)]">Filter:</span>
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-3 pr-1.5 text-sm text-[var(--foreground)]">
        <span className="truncate">
          Ziel <span className="font-medium">{targetTitle}</span>
        </span>
        <Link
          href={removeHref}
          className="inline-flex shrink-0 rounded-full p-0.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-label={`Ziel-Filter „${targetTitle}“ entfernen`}
          data-testid="vorhaben-ziel-filter-remove"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </span>
    </div>
  );
}

export function buildVorhabenZielFilterRemoveHref(
  variant: VorhabenAufgabenWorkspaceVariant,
  searchParams: URLSearchParams,
): string {
  const params: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    if (key === "targetId") return;
    params[key] = value;
  });
  return buildVorhabenUndUmsetzungHref(variant, params);
}