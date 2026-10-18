"use client";

import { ClubCrest, type ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { cn } from "@/lib/cn";
import { SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens";

export type SceTournamentFixtureVisualDensity = "standard" | "compact";

/** Planung vs Spielplan crest scale — independent of compact typography on fixture cards. */
export type SceTournamentFixtureCrestVariant =
  | "spielplanStandard"
  | "spielplanCompact"
  | "planung"
  | "planungBoard";

export function crestVariantForFixtureDensity(
  density: SceTournamentFixtureVisualDensity,
): SceTournamentFixtureCrestVariant {
  return density === "compact" ? "spielplanCompact" : "spielplanStandard";
}

export function crestDensityForFixtureVariant(
  variant: SceTournamentFixtureCrestVariant,
): ClubCrestVisualSize {
  switch (variant) {
    case "spielplanStandard":
      return "compact";
    case "spielplanCompact":
      return "micro";
    case "planung":
      return "management";
    case "planungBoard":
      return "compact";
    default:
      return "compact";
  }
}

/** @deprecated Prefer crestVariantForFixtureDensity / crestDensityForFixtureVariant */
export function crestDensityForFixture(density: SceTournamentFixtureVisualDensity): ClubCrestVisualSize {
  return crestDensityForFixtureVariant(crestVariantForFixtureDensity(density));
}

type VsProps = {
  highlighted?: boolean;
  size?: SceTournamentFixtureVisualDensity;
  className?: string;
};

/** Restrained central VS separator — not home/away semantics. */
export function SceTournamentFixtureVs({
  highlighted = false,
  size = "standard",
  className,
}: VsProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-pill)] border font-semibold uppercase",
        SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
        "border-[var(--sce-surface-border)] bg-[var(--sce-surface-elevated)]",
        size === "standard"
          ? "min-w-[2rem] px-2.5 py-1 text-[10px] tracking-[0.14em]"
          : "min-w-[1.65rem] px-1.5 py-0.5 text-[9px] tracking-[0.12em]",
        highlighted && "border-[var(--sce-focus)] text-[var(--foreground)]",
        className,
      )}
      data-fixture-identity-segment="vs"
      aria-hidden
    >
      VS
    </span>
  );
}

type ParticipantProps = {
  identity: ClubIdentity;
  label: string;
  density: SceTournamentFixtureVisualDensity;
  crestVariant?: SceTournamentFixtureCrestVariant;
  align: "start" | "end";
  qualificationProvenanceLabel?: string | null;
  muted?: boolean;
  className?: string;
};

export function SceTournamentFixtureParticipant({
  identity,
  label,
  density,
  crestVariant,
  align,
  qualificationProvenanceLabel = null,
  muted = false,
  className,
}: ParticipantProps) {
  const crestSize = crestDensityForFixtureVariant(
    crestVariant ?? crestVariantForFixtureDensity(density),
  );
  const responsiveCrest = density === "standard";
  const nameTowardCenter = align === "start";

  const nameNode = (
    <span
      className={cn(
        "min-w-0 text-sm font-medium leading-snug [overflow-wrap:anywhere]",
        density === "compact"
          ? "line-clamp-2 text-xs"
          : "sm:line-clamp-2 lg:line-clamp-none",
        muted ? "text-[var(--muted)]" : "text-[var(--foreground)]",
      )}
      title={label}
      data-fixture-identity-segment="name"
    >
      {label}
      {qualificationProvenanceLabel ? (
        <span className="ml-1 text-xs font-normal text-[var(--muted)]">
          ({qualificationProvenanceLabel})
        </span>
      ) : null}
    </span>
  );

  const crestNode = (
    <span
      className="inline-flex shrink-0"
      data-fixture-identity-segment="crest"
      data-fixture-crest-size={crestSize}
    >
      <ClubCrest
        identity={identity}
        density={crestSize}
        decorative
        className={cn(
          responsiveCrest && "sm:!h-11 sm:!w-11 md:!h-12 md:!w-12",
        )}
      />
    </span>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "end" ? "flex-row justify-end text-right" : "flex-row text-left",
        className,
      )}
    >
      {nameTowardCenter ? (
        <>
          {nameNode}
          {crestNode}
        </>
      ) : (
        <>
          {crestNode}
          {nameNode}
        </>
      )}
    </div>
  );
}
