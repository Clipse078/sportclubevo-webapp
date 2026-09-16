"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
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

const SEGMENT_CLASS =
  "rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]";

function SegmentGroup<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: { key: T; label: string }[];
  onSelect: (key: T) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSelect(opt.key)}
            className={cn(
              SEGMENT_CLASS,
              value === opt.key
                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
            data-testid={`vereine-filter-${label}-${opt.key}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ClubDirectoryFilterBar({ showArchived, provider, teams }: ClubDirectoryFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? undefined;
  const filtersActive = clubDirectoryFiltersActive(provider, teams);

  function navigate(nextProvider: ClubDirectoryProviderFilter, nextTeams: ClubDirectoryTeamsFilter) {
    router.push(buildVereineHref(showArchived, nextProvider, nextTeams, q));
  }

  const providerOptions = (["all", "linked", "manual"] as const).map((key) => ({
    key,
    label: CLUB_DIRECTORY_PROVIDER_FILTER_LABELS[key],
  }));

  const teamsOptions = (["all", "with", "without"] as const).map((key) => ({
    key,
    label: CLUB_DIRECTORY_TEAMS_FILTER_LABELS[key],
  }));

  return (
    <div className="space-y-3" data-testid="vereine-directory-filters">
      <div className="grid gap-3 sm:grid-cols-2">
        <SegmentGroup
          label="provider"
          value={provider}
          options={providerOptions}
          onSelect={(key) => navigate(key, teams)}
        />
        <SegmentGroup
          label="teams"
          value={teams}
          options={teamsOptions}
          onSelect={(key) => navigate(provider, key)}
        />
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
