"use client";

import { SoccerPitchLineIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { cn } from "@/lib/cn";

type Props = {
  label: string | null;
  venueName?: string | null;
  resourceLabel?: string | null;
  extraCount?: number;
  className?: string;
};

export default function TrainingFacilityManagementCell({
  label,
  venueName = null,
  resourceLabel = null,
  extraCount = 0,
  className,
}: Props) {
  const venue = venueName?.trim() || null;
  const resource = resourceLabel?.trim() || null;
  const displayLabel = label?.trim() || null;

  if (!displayLabel && !venue && !resource) {
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
      <div className="min-w-0">
        {venue && resource && venue.toLowerCase() !== resource.toLowerCase() ? (
          <>
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{venue}</p>
            <p className="truncate text-xs text-[var(--text-2)]">{resource}</p>
          </>
        ) : (
          <span className="block min-w-0 truncate text-sm font-medium text-[var(--foreground)]">
            {venue ?? resource ?? displayLabel}
          </span>
        )}
        {extraCount > 0 ? (
          <span className="text-xs font-normal text-[var(--muted)]" aria-label={`${extraCount} weitere Anlagen`}>
            +{extraCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}
