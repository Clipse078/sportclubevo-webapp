"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  Bus,
  DoorOpen,
  Globe2,
  LayoutGrid,
  Monitor,
  Trophy,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  RESOURCE_SEMANTIC_DRESSING_ICON_CLASS,
  RESOURCE_SEMANTIC_PITCH_ICON_CLASS,
} from "@/components/admin/shared/planning/resource-card-selection-style";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import {
  FacilityResourceGlyph,
  resolveFacilityResourceVisualKind,
} from "@/components/admin/shared/planning/FacilityResourceIdentity";
import type { FacilityResourceType } from "@prisma/client";

export type TournamentSectionIconVariant =
  | "grunddaten"
  | "participants"
  | "resources"
  | "publication"
  | "status"
  | "danger";

const SECTION_ICON_TILE =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)]";

const SECTION_VARIANTS: Record<
  TournamentSectionIconVariant,
  { icon: ReactNode; tileClassName?: string; iconClassName?: string }
> = {
  grunddaten: {
    icon: <Trophy className="h-3.5 w-3.5" aria-hidden />,
    tileClassName: "border-amber-500/30 bg-amber-500/10",
    iconClassName: "text-amber-400",
  },
  participants: {
    icon: <UsersRound className="h-3.5 w-3.5" aria-hidden />,
    tileClassName: "border-[var(--blue)]/30 bg-[var(--blue)]/10",
    iconClassName: "text-[var(--blue)]",
  },
  resources: {
    icon: <LayoutGrid className="h-3.5 w-3.5" aria-hidden />,
    tileClassName: "border-emerald-500/30 bg-emerald-500/10",
    iconClassName: RESOURCE_SEMANTIC_PITCH_ICON_CLASS,
  },
  publication: {
    icon: <Globe2 className="h-3.5 w-3.5" aria-hidden />,
    tileClassName: "border-[var(--border-strong)] bg-[var(--surface-2)]",
    iconClassName: "text-[var(--text-2)]",
  },
  status: {
    icon: <Ban className="h-3.5 w-3.5" aria-hidden />,
    tileClassName: "border-amber-500/25 bg-amber-500/8",
    iconClassName: "text-amber-400",
  },
  danger: {
    icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
    tileClassName: "border-rose-500/30 bg-rose-500/10",
    iconClassName: "text-rose-400",
  },
};

export function TournamentSectionIcon({ variant }: { variant: TournamentSectionIconVariant }) {
  const config = SECTION_VARIANTS[variant];
  return (
    <span
      className={cn(SECTION_ICON_TILE, config.tileClassName, config.iconClassName)}
      aria-hidden
    >
      {config.icon}
    </span>
  );
}

export function TournamentTeamLogo({
  logoUrl,
  name,
  className,
  size = "sm",
}: {
  logoUrl: string | null;
  name: string;
  className?: string;
  size?: "sm" | "md";
}) {
  if (logoUrl) {
    return <ClubLogo logoUrl={logoUrl} name={name} size={size} bare className={className} />;
  }

  const sizeClass = size === "md" ? "h-10 w-10" : "h-7 w-7";
  const iconClass = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div
      className={cn(
        sizeClass,
        "flex shrink-0 items-center justify-center rounded-md border border-[var(--blue)]/30 bg-[var(--blue)]/10 text-[var(--blue)]",
        className,
      )}
      aria-hidden
      data-testid="tournament-team-logo-fallback"
    >
      <UsersRound className={iconClass} />
    </div>
  );
}

export function TournamentFacilityResourceIconTile({
  resourceType,
  facilityType,
  className,
}: {
  resourceType: FacilityResourceType;
  facilityType?: string;
  className?: string;
}) {
  const kind = resolveFacilityResourceVisualKind(resourceType, facilityType);
  const isDressing = kind === "dressing_room";
  const isPitch = kind === "pitch" || kind === "hall";

  return (
    <span
      className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-[var(--surface-2)]",
        isPitch && "border-emerald-500/30 text-emerald-400",
        isDressing && "border-[var(--blue)]/30 text-[var(--blue)]",
        !isPitch && !isDressing && "border-[var(--border)] text-[var(--text-2)]",
        className,
      )}
      aria-hidden
    >
      <FacilityResourceGlyph
        resourceType={resourceType}
        facilityType={facilityType}
        className={cn(
          isPitch && RESOURCE_SEMANTIC_PITCH_ICON_CLASS,
          isDressing && RESOURCE_SEMANTIC_DRESSING_ICON_CLASS,
        )}
      />
    </span>
  );
}

export function TournamentDressingRoomLabelIcon({ className }: { className?: string }) {
  return (
    <DoorOpen
      className={cn("h-3 w-3 shrink-0", RESOURCE_SEMANTIC_DRESSING_ICON_CLASS, className)}
      aria-hidden
    />
  );
}

export const TOURNAMENT_PUBLICATION_CHANNEL_ICONS = {
  websiteVisible: Globe2,
  infoboardVisible: Monitor,
  homepageVisible: Globe2,
  wochenplanVisible: LayoutGrid,
  teamPageVisible: UsersRound,
} as const;

export { Bus };
