"use client";

/**
 * FacilityResourceIdentity — line-based facility resource glyphs and compact
 * identity rows for Planning surfaces (TournamentCenter, TrainingCenter,
 * MatchCenter). Distinct from PitchVisual, which encodes availability state
 * with fill colors for card pickers.
 */

import type { FacilityResourceType } from "@prisma/client";
import { DoorOpen, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  RESOURCE_SEMANTIC_DRESSING_ICON_CLASS,
  RESOURCE_SEMANTIC_PITCH_ICON_CLASS,
} from "@/components/admin/shared/planning/resource-card-selection-style";

export type FacilityResourceVisualKind = "pitch" | "hall" | "dressing_room" | "other";

export function resolveFacilityResourceVisualKind(
  resourceType: FacilityResourceType,
  facilityType?: string,
): FacilityResourceVisualKind {
  if (resourceType === "DRESSING_ROOM") return "dressing_room";
  if (facilityType === "INDOOR_HALL") return "hall";
  if (resourceType === "FULL_PITCH" || resourceType === "HALF_PITCH") return "pitch";
  return "other";
}

type IconProps = {
  className?: string;
  title?: string;
};

/** Restrained line football pitch — currentColor, ~16–20px. */
export function SoccerPitchLineIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 14"
      width={20}
      height={14}
      className={cn("shrink-0 text-current", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="1" y="1" width="18" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <line x1="10" y1="2" x2="10" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.85" />
      <circle cx="10" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.85" />
      <rect x="2" y="4.5" width="2.5" height="5" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
      <rect x="15.5" y="4.5" width="2.5" height="5" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
    </svg>
  );
}

export function IndoorHallLineIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 14"
      width={20}
      height={14}
      className={cn("shrink-0 text-current", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="1" y="1" width="18" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <line x1="10" y1="3" x2="10" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.75" />
      <rect x="5" y="3" width="10" height="8" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.65" rx="0.5" />
    </svg>
  );
}

export function FacilityResourceGlyph({
  resourceType,
  facilityType,
  className,
  title,
}: {
  resourceType: FacilityResourceType;
  facilityType?: string;
  className?: string;
  title?: string;
}) {
  const kind = resolveFacilityResourceVisualKind(resourceType, facilityType);
  if (kind === "pitch") return <SoccerPitchLineIcon className={className} title={title ?? "Spielfeld"} />;
  if (kind === "hall") return <IndoorHallLineIcon className={className} title={title ?? "Halle"} />;
  if (kind === "dressing_room") {
    return <DoorOpen className={cn("h-4 w-4 shrink-0", className)} aria-hidden={!title} />;
  }
  return <LayoutGrid className={cn("h-4 w-4 shrink-0 opacity-70", className)} aria-hidden={!title} />;
}

/** Compact semantic icon tile for assignment rows (Training, Match, Tournament, Veranstaltung). */
export function PlanningResourceSemanticIconTile({
  resourceType,
  facilityType,
  compact = false,
  className,
  testId = "planning-resource-semantic-icon-tile",
  semanticColors = true,
}: {
  resourceType: FacilityResourceType;
  facilityType?: string;
  compact?: boolean;
  className?: string;
  testId?: string;
  /** When false, use neutral tile styling (non-planning pickers). */
  semanticColors?: boolean;
}) {
  const visualKind = resolveFacilityResourceVisualKind(resourceType, facilityType);
  const isPitch = visualKind === "pitch" || visualKind === "hall";
  const isDressing = visualKind === "dressing_room";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border bg-[var(--surface-2)]",
        compact ? "h-7 w-7" : "h-8 w-8",
        semanticColors && isPitch && "border-emerald-500/30 text-emerald-400",
        semanticColors && isDressing && "border-[var(--blue)]/30 text-[var(--blue)]",
        (!semanticColors || (!isPitch && !isDressing)) && "border-[var(--border)] text-[var(--text-2)]",
        className,
      )}
      data-testid={testId}
    >
      <FacilityResourceGlyph
        resourceType={resourceType}
        facilityType={facilityType}
        className={cn(
          "opacity-90",
          semanticColors && isPitch && RESOURCE_SEMANTIC_PITCH_ICON_CLASS,
          semanticColors && isDressing && RESOURCE_SEMANTIC_DRESSING_ICON_CLASS,
        )}
      />
    </span>
  );
}

export type FacilityResourceIdentityProps = {
  name: string;
  resourceType: FacilityResourceType;
  facilityType?: string;
  /** e.g. facility name or "Spielfeld" */
  subtitle?: string | null;
  availability?: "FREE" | "OCCUPIED" | null;
  /** e.g. conflict context when occupied */
  detail?: string | null;
  compact?: boolean;
  className?: string;
  /** When true, pitch/hall and dressing tiles use Planning resource semantics (green / blue). */
  semanticResourceColors?: boolean;
};

export function FacilityResourceIdentity({
  name,
  resourceType,
  facilityType,
  subtitle,
  availability,
  detail,
  compact = false,
  className,
  semanticResourceColors = false,
}: FacilityResourceIdentityProps) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2.5", className)}>
      <PlanningResourceSemanticIconTile
        resourceType={resourceType}
        facilityType={facilityType}
        compact={compact}
        semanticColors={semanticResourceColors}
        className="mt-0.5"
        testId={semanticResourceColors ? "facility-resource-semantic-icon-tile" : "planning-resource-semantic-icon-tile"}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-semibold text-[var(--foreground)]", compact ? "text-xs" : "text-sm")}>
          {name}
        </p>
        {subtitle ? (
          <p className={cn("truncate text-[var(--text-2)]", compact ? "text-[10px]" : "text-xs")}>{subtitle}</p>
        ) : null}
        {detail ? (
          <p className={cn("truncate text-[var(--muted)]", compact ? "text-[10px]" : "text-xs")}>{detail}</p>
        ) : null}
      </div>
      {availability ? (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            availability === "FREE"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
          )}
        >
          {availability === "FREE" ? "Frei" : "Belegt"}
        </span>
      ) : null}
    </div>
  );
}
