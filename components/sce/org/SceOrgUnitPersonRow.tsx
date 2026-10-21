"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import { cn } from "@/lib/cn";

type Props = {
  personId: string;
  displayName: string;
  functionTitle?: string | null;
  metaLine?: string | null;
  badge?: string | null;
  className?: string;
  onNavigate?: () => void;
};

export default function SceOrgUnitPersonRow({
  personId,
  displayName,
  functionTitle,
  metaLine,
  badge,
  className,
  onNavigate,
}: Props) {
  return (
    <Link
      href={`/dashboard/persons/${personId}`}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg py-1.5 pr-1 pl-0.5 transition",
        "hover:bg-[var(--surface-2)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]",
        className,
      )}
      data-testid={`sce-org-person-row-${personId}`}
      onClick={() => onNavigate?.()}
    >
      <AdminAvatar name={displayName} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--text-1)]" title={displayName}>
          {displayName}
        </p>
        {functionTitle ? (
          <p className="truncate text-xs text-[var(--text-2)]" title={functionTitle}>
            {functionTitle}
          </p>
        ) : null}
        {metaLine ? (
          <p className="truncate text-[10px] text-[var(--muted)]" title={metaLine}>
            {metaLine}
          </p>
        ) : null}
      </div>
      {badge ? (
        <span className="shrink-0 rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
          {badge}
        </span>
      ) : null}
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] opacity-60 group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}
