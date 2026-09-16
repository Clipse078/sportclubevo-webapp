"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import {
  CLUB_DIRECTORY_PROVIDER_FILTER_LABELS,
  CLUB_DIRECTORY_TEAMS_FILTER_LABELS,
  clubDirectoryFiltersActive,
  type ClubDirectoryProviderFilter,
  type ClubDirectoryTeamsFilter,
} from "@/lib/club-directory/directory-view-filters";

type ClubDirectoryFilterBarProps = {
  showArchived: boolean;
  provider: ClubDirectoryProviderFilter;
  teams: ClubDirectoryTeamsFilter;
};

function buildVereineHref(
  showArchived: boolean,
  provider: ClubDirectoryProviderFilter,
  teams: ClubDirectoryTeamsFilter,
  q?: string,
): string {
  const params = new URLSearchParams();
  if (showArchived) params.set("view", "archived");
  if (provider !== "all") params.set("provider", provider);
  if (teams !== "all") params.set("teams", teams);
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return qs ? `/dashboard/vereine?${qs}` : "/dashboard/vereine";
}

const PROVIDER_OPTIONS = (["all", "linked", "manual"] as const).map((key) => ({
  value: key,
  label: CLUB_DIRECTORY_PROVIDER_FILTER_LABELS[key],
}));

const TEAMS_OPTIONS = (["all", "with", "without"] as const).map((key) => ({
  value: key,
  label: CLUB_DIRECTORY_TEAMS_FILTER_LABELS[key],
}));

export function ClubDirectoryFilterBar({ showArchived, provider, teams }: ClubDirectoryFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? undefined;
  const filtersActive = clubDirectoryFiltersActive(provider, teams);

  function navigate(nextProvider: ClubDirectoryProviderFilter, nextTeams: ClubDirectoryTeamsFilter) {
    router.push(buildVereineHref(showArchived, nextProvider, nextTeams, q));
  }

  return (
    <div className="space-y-3" data-testid="vereine-directory-filters">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Anbieter
          </span>
          <SceSegmentedControl
            options={PROVIDER_OPTIONS}
            value={provider}
            onChange={(key) => navigate(key, teams)}
            aria-label="Anbieter filtern"
            testId="vereine-filter-provider"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Teams
          </span>
          <SceSegmentedControl
            options={TEAMS_OPTIONS}
            value={teams}
            onChange={(key) => navigate(provider, key)}
            aria-label="Teams filtern"
            testId="vereine-filter-teams"
          />
        </div>
      </div>

      {filtersActive ? (
        <div className="flex flex-wrap items-center gap-2">
          {provider !== "all" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--text-2)]">
              {CLUB_DIRECTORY_PROVIDER_FILTER_LABELS[provider]}
              <Link
                href={buildVereineHref(showArchived, "all", teams, q)}
                className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Anbieter-Filter entfernen"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          ) : null}
          {teams !== "all" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--text-2)]">
              {CLUB_DIRECTORY_TEAMS_FILTER_LABELS[teams]}
              <Link
                href={buildVereineHref(showArchived, provider, "all", q)}
                className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Team-Filter entfernen"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          ) : null}
          <Link
            href={buildVereineHref(showArchived, "all", "all", q)}
            className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
            data-testid="vereine-filter-reset"
          >
            Alle Filter zurücksetzen
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export { buildVereineHref };
