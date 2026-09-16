import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui";
import type { ClubDirectoryListItem } from "@/lib/club-directory/directory-view-filters";
import { ClubLogo } from "./ClubLogo";

export type { ClubDirectoryListItem };

type ClubDirectoryRowProps = {
  club: ClubDirectoryListItem;
  showArchivedScope?: boolean;
};

export function ClubDirectoryRow({ club, showArchivedScope }: ClubDirectoryRowProps) {
  const secondaryIdentity = club.shortName ?? club.alternativeName;

  return (
    <Link
      href={`/dashboard/vereine/${club.id}`}
      className="group grid grid-cols-1 gap-3 px-4 py-3.5 transition hover:bg-[var(--surface-2)] sm:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,0.9fr)_auto] sm:items-center sm:gap-4 sm:px-5"
      data-testid={`vereine-club-row-${club.id}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ClubLogo logoUrl={club.logoUrl} name={club.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--sce-primary)]">
            {club.name}
          </p>
          {secondaryIdentity ? (
            <p className="truncate text-xs text-[var(--muted)]">{secondaryIdentity}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] sm:justify-end">
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="tabular-nums">
          {club.teamCount} Team{club.teamCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        <Badge variant={club.hasProviderMapping ? "info" : "outline"} size="sm" className="font-normal">
          {club.hasProviderMapping ? "Anbieter-verknüpft" : "Manuell"}
        </Badge>
        {showArchivedScope && club.archivedAt ? (
          <Badge variant="default" size="sm">Archiviert</Badge>
        ) : null}
      </div>

      <ChevronRight
        className="hidden h-5 w-5 shrink-0 text-[var(--muted)] group-hover:text-[var(--foreground)] sm:block"
        aria-hidden
      />
    </Link>
  );
}
