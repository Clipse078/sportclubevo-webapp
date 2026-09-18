"use client";

import { useRouter } from "next/navigation";
import type { TurniereFilterOption } from "@/lib/tournaments/management-view";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/tournaments/presentation";
import type { TournamentStatus } from "@/lib/tournaments/types";
import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";
import TurniereManagementViewSwitcher from "./TurniereManagementViewSwitcher";
import type { TournamentListView } from "@/lib/tournaments/workspace-view-model";

type Props = {
  searchDraft: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string | null;
  ageFilter: string | null;
  statusFilter: TournamentStatus | null;
  locationFilter: string | null;
  categoryOptions: TurniereFilterOption[];
  ageOptions: TurniereFilterOption[];
  locationOptions: TurniereFilterOption[];
  listView: TournamentListView;
  listeHref: string;
  kompaktHref: string;
  kalenderHref: string;
  buildCategoryHref: (value: string | null) => string;
  buildAgeHref: (value: string | null) => string;
  buildStatusHref: (value: TournamentStatus | null) => string;
  buildLocationHref: (value: string | null) => string;
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

export default function TurniereManagementToolbar({
  searchDraft,
  onSearchChange,
  categoryFilter,
  ageFilter,
  statusFilter,
  locationFilter,
  categoryOptions,
  ageOptions,
  locationOptions,
  listView,
  listeHref,
  kompaktHref,
  kalenderHref,
  buildCategoryHref,
  buildAgeHref,
  buildStatusHref,
  buildLocationHref,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-2.5" data-testid="turniere-toolbar">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <CenterWorkspaceSearchInput
          value={searchDraft}
          onChange={onSearchChange}
          placeholder="Turniere durchsuchen …"
          ariaLabel="Turniere durchsuchen"
          className="relative min-w-0 flex-1"
          data-testid="turniere-search"
        />
        <TurniereManagementViewSwitcher
          listView={listView}
          listeHref={listeHref}
          kompaktHref={kompaktHref}
          kalenderHref={kalenderHref}
          kalenderDisabled
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="fca-input min-w-[9rem] text-xs"
          value={categoryFilter ?? ""}
          aria-label="Kategorie filtern"
          data-testid="turniere-toolbar-category"
          onChange={(event) => {
            router.push(buildCategoryHref(event.target.value || null));
          }}
        >
          <option value="">Alle Kategorien</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="fca-input min-w-[9rem] text-xs"
          value={ageFilter ?? ""}
          aria-label="Altersklasse filtern"
          data-testid="turniere-toolbar-age"
          onChange={(event) => {
            router.push(buildAgeHref(event.target.value || null));
          }}
        >
          <option value="">Alle Altersklassen</option>
          {ageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="fca-input min-w-[8rem] text-xs"
          value={statusFilter ?? ""}
          aria-label="Status filtern"
          data-testid="turniere-toolbar-status"
          onChange={(event) => {
            const raw = event.target.value;
            router.push(buildStatusHref(raw ? (raw as TournamentStatus) : null));
          }}
        >
          <option value="">Alle Status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {TOURNAMENT_STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>

        <select
          className="fca-input min-w-[8rem] flex-1 text-xs sm:flex-none sm:min-w-[10rem]"
          value={locationFilter ?? ""}
          aria-label="Ort filtern"
          data-testid="turniere-toolbar-location"
          onChange={(event) => {
            router.push(buildLocationHref(event.target.value || null));
          }}
        >
          <option value="">Alle Orte</option>
          {locationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
