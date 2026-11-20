"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";

type Props = {
  label: string;
};

export function buildOrgEinheitFilterClearHref(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const next = new URLSearchParams(searchParams.toString());
  next.delete(CD_WORKSPACE_ORG_UNIT_QUERY);
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export default function VereinsentwicklungOrgEinheitFilterChip({ label }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clearHref = buildOrgEinheitFilterClearHref(pathname, searchParams);

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm"
      data-testid="vereinsentwicklung-org-einheit-filter"
    >
      <span className="text-[var(--muted)]">Org-Einheit</span>
      <span className="font-medium text-[var(--foreground)]">{label}</span>
      <Link
        href={clearHref}
        className="inline-flex rounded-md p-0.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        aria-label="Org-Einheit-Filter entfernen"
        data-testid="vereinsentwicklung-org-einheit-filter-clear"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}