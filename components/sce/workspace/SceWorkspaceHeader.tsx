import type { ReactNode } from "react";
import { PageActions, PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

export type SceWorkspaceHeaderProps = {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  badge?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  metadata?: ReactNode;
  className?: string;
};

/**
 * Canonical workspace / page header — object identity + calm actions.
 * Does not duplicate breadcrumb or tab hierarchy (`PREMIUM_DOES_NOT_MEAN_OVERSIZED`).
 */
export function SceWorkspaceHeader({
  eyebrow,
  title,
  description,
  badge,
  primaryAction,
  secondaryActions,
  metadata,
  className,
}: SceWorkspaceHeaderProps) {
  const hasActions = Boolean(primaryAction || secondaryActions);

  return (
    <div className={cn("mb-6 space-y-3", className)}>
      <div
        className={cn(
          "flex flex-col gap-4",
          hasActions && "lg:flex-row lg:items-start lg:justify-between",
        )}
      >
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          badge={badge}
          className="mb-0 flex-1"
        />
        {hasActions ? (
          <PageActions className="shrink-0 lg:pt-1">
            {secondaryActions}
            {primaryAction}
          </PageActions>
        ) : null}
      </div>
      {metadata ? <div className="min-w-0">{metadata}</div> : null}
    </div>
  );
}
