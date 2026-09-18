"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TurniereFilterOption } from "@/lib/tournaments/management-view";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/tournaments/presentation";
import type { TournamentStatus } from "@/lib/tournaments/types";

type Props = {
  resetHref: string;
  categoryFilter: string | null;
  ageFilter: string | null;
  statusFilter: TournamentStatus | null;
  locationFilter: string | null;
  ownOnly: boolean;
  publicOnly: boolean;
  categoryOptions: TurniereFilterOption[];
  ageOptions: TurniereFilterOption[];
  locationOptions: TurniereFilterOption[];
  buildCategoryHref: (value: string | null) => string;
  buildAgeHref: (value: string | null) => string;
  buildStatusHref: (value: TournamentStatus | null) => string;
  buildLocationHref: (value: string | null) => string;
  buildOwnOnlyHref: (enabled: boolean) => string;
  buildPublicOnlyHref: (enabled: boolean) => string;
};

const STATUS_OPTIONS: TournamentStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
  "POSTPONED",
  "ARCHIVED",
];

function SelectFilter({
  label,
  value,
  options,
  allLabel,
  buildHref,
  router,
}: {
  label: string;
  value: string | null;
  options: TurniereFilterOption[];
  allLabel: string;
  buildHref: (value: string | null) => string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <select
        className="fca-input w-full text-sm"
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value || null;
          router.push(buildHref(next));
        }}
        aria-label={label}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function TurniereManagementFilterRail(props: Props) {
  const router = useRouter();
  const {
    resetHref,
    categoryFilter,
    ageFilter,
    statusFilter,
    locationFilter,
    ownOnly,
    publicOnly,
    categoryOptions,
    ageOptions,
    locationOptions,
    buildCategoryHref,
    buildAgeHref,
    buildStatusHref,
    buildLocationHref,
    buildOwnOnlyHref,
    buildPublicOnlyHref,
  } = props;

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Filter"
      data-testid="turniere-filter-rail"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Filter</h3>
        <Link
          href={resetHref}
          className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
          data-testid="turniere-filter-reset"
        >
          Zurücksetzen
        </Link>
      </div>

      <div className="space-y-3">
        <SelectFilter
          label="Kategorie"
          value={categoryFilter}
          options={categoryOptions}
          allLabel="Alle Kategorien"
          buildHref={buildCategoryHref}
          router={router}
        />
        <SelectFilter
          label="Altersklasse"
          value={ageFilter}
          options={ageOptions}
          allLabel="Alle Altersklassen"
          buildHref={buildAgeHref}
          router={router}
        />
        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Status
          </span>
          <select
            className="fca-input w-full text-sm"
            value={statusFilter ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              router.push(buildStatusHref(raw ? (raw as TournamentStatus) : null));
            }}
            aria-label="Status"
          >
            <option value="">Alle Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {TOURNAMENT_STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </select>
        </label>
        <SelectFilter
          label="Ort"
          value={locationFilter}
          options={locationOptions}
          allLabel="Alle Orte"
          buildHref={buildLocationHref}
          router={router}
        />

        <div className="space-y-2 border-t border-[var(--border)]/60 pt-2">
          <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
            <input
              type="checkbox"
              checked={ownOnly}
              onChange={() => {
                router.push(buildOwnOnlyHref(!ownOnly));
              }}
              data-testid="turniere-filter-own-only"
            />
            Nur eigene Turniere
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
            <input
              type="checkbox"
              checked={publicOnly}
              onChange={() => {
                router.push(buildPublicOnlyHref(!publicOnly));
              }}
              data-testid="turniere-filter-public-only"
            />
            Nur öffentliche Turniere
          </label>
        </div>
      </div>
    </section>
  );
}
