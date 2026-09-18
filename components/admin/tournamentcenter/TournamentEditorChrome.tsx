"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { PageBreadcrumbs, PageHeader, PageActions } from "@/components/ui/page";
import type { BreadcrumbItem } from "@/components/ui/page";
import { cn } from "@/lib/cn";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  sticky?: boolean;
};

export default function TournamentEditorChrome({
  eyebrow,
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  sticky = true,
}: Props) {
  return (
    <div
      className={cn(
        "mb-5 space-y-3 border-b border-[var(--border)] pb-3",
        sticky &&
          "sticky top-0 z-20 -mx-5 bg-[var(--background)]/92 px-5 shadow-[0_4px_12px_-8px_rgba(0,0,0,0.25)] backdrop-blur-sm md:-mx-8 md:px-8",
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 ? <PageBreadcrumbs items={breadcrumbs} /> : null}

      <Link
        href="/dashboard/tournamentcenter"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Zurück zum TournamentCenter
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Trophy className="h-3 w-3" aria-hidden />
              </span>
              {eyebrow}
            </span>
          }
          title={title}
          description={description}
          className="mb-0"
        />
        {(primaryAction || secondaryActions) && (
          <PageActions className="shrink-0">
            {secondaryActions}
            {primaryAction}
          </PageActions>
        )}
      </div>
    </div>
  );
}
