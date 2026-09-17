"use client";

import { SoccerPitchLineIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { cn } from "@/lib/cn";

type Props = {
  label: string | null;
  extraCount?: number;
  className?: string;
};

export default function TrainingFacilityManagementCell({ label, extraCount = 0, className }: Props) {
  if (!label) {
    return <span className={cn("text-sm text-[var(--muted)]", className)}>Nicht zugewiesen</span>;
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} data-testid="training-facility-cell">
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/30"
        aria-hidden="true"
      >
        <SoccerPitchLineIcon className="h-[14px] w-[18px]" />
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">
        {label}
        {extraCount > 0 ? (
          <span className="ml-1 text-xs font-normal text-[var(--muted)]" aria-label={`${extraCount} weitere Anlagen`}>
            +{extraCount}
          </span>
        ) : null}
      </span>
    </div>
  );
}
