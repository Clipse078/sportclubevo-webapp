"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { InitiativeDisposition, InitiativeStatus } from "@prisma/client";
import { CD_INITIATIVE_COPY, CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import CreateInitiativeWorkspaceCollapsibleCard from "@/components/admin/initiatives/CreateInitiativeWorkspaceCollapsibleCard";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { mapBacklogRowToVorhabenCardSummary } from "@/lib/club-development/vorhaben-workspace-card-mappers";
import type { VorhabenWorkspaceCardNextMilestone } from "@/lib/club-development/vorhaben-workspace-card-types";
import VorhabenWorkspaceCardList from "./VorhabenWorkspaceCardList";
import VorhabenWorkspaceToolbar from "./VorhabenWorkspaceToolbar";
import VorhabenZielFilterChip, { buildVorhabenZielFilterRemoveHref } from "./VorhabenZielFilterChip";
import VorhabenWorkspaceLoadingState from "./VorhabenWorkspaceLoadingState";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";

export type InitiativeBacklogRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: InitiativeStatus;
  owner: string | null;
  expectedOutcome: string | null;
  backlogPriority: number;
  disposition: InitiativeDisposition;
  dueDate: string | null;
  updatedAt: string;
  deliveryProgressPercent: number;
  nextMilestone: VorhabenWorkspaceCardNextMilestone | null;
};

type FilterTarget = {
  id: string;
  title: string;
};

type Props = {
  initialInitiatives: InitiativeBacklogRow[];
  canManage: boolean;
  canView: boolean;
  initialTargetId?: string | null;
  filterTarget?: FilterTarget | null;
  showPrioritaetenActive?: boolean;
};

const DISPOSITION_LABELS: Record<Exclude<InitiativeDisposition, "NONE">, string> = {
  DEFERRED: "Zurückgestellt",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  ON_TRACK: "On Track",
  ON_HOLD: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

function serializeRows(
  rows: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    status: InitiativeStatus;
    owner: string | null;
    expectedOutcome: string | null;
    backlogPriority: number;
    disposition: InitiativeDisposition;
    dueDate: Date | null;
    updatedAt: Date;
    deliveryProgressPercent?: number;
    progress?: number | null;
    nextMilestone?: VorhabenWorkspaceCardNextMilestone | null;
  }[],
): InitiativeBacklogRow[] {
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: row.status,
    owner: row.owner,
    expectedOutcome: row.expectedOutcome,
    backlogPriority: row.backlogPriority,
    disposition: row.disposition,
    dueDate: row.dueDate?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    deliveryProgressPercent: row.deliveryProgressPercent ?? 0,
    nextMilestone: row.nextMilestone ?? null,
  }));
}

type BacklogResponse = {
  initiatives: Parameters<typeof serializeRows>[0];
  error?: string;
};

export default function InitiativeBacklogWorkspace({
  initialInitiatives,
  canManage,
  canView,
  initialTargetId = null,
  filterTarget = null,
  showPrioritaetenActive = true,
}: Props) {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<InitiativeBacklogRow[]>(initialInitiatives);
  const targetIdFilter = (initialTargetId ?? "").trim();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState<string>("");
  const [secondaryFiltersOpen, setSecondaryFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipInitialFetchRef = useRef(true);
  const filtersChangedRef = useRef(false);

  const fetchBacklog = useCallback(() => {
    if (!canView) {
      setError("Du hast keine Berechtigung, Vorhaben zu laden.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (dispositionFilter) params.set("disposition", dispositionFilter);
      if (targetIdFilter) params.set("targetId", targetIdFilter);
      const result = await clubDevelopmentFetchJson<BacklogResponse>(
        `/api/club-development/initiatives/backlog?${params.toString()}`,
      );
      if (!result.ok) {
        setError(result.message);
        setLoadFailed(true);
        return;
      }
      setLoadFailed(false);
      const initiatives = (result.data.initiatives ?? []) as Parameters<typeof serializeRows>[0];
      setRows(serializeRows(initiatives));
    });
  }, [canView, dispositionFilter, search, statusFilter, targetIdFilter]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      filtersChangedRef.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      filtersChangedRef.current = true;
      fetchBacklog();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [fetchBacklog]);

  const filteredRows = useMemo(() => {
    const ownerQ = ownerFilter.trim().toLowerCase();
    if (!ownerQ) return rows;
    return rows.filter((row) => (row.owner ?? "").toLowerCase().includes(ownerQ));
  }, [ownerFilter, rows]);

  const listEmpty = filteredRows.length === 0;

  const cardSummaries = useMemo(
    () =>
      filteredRows.map((row) =>
        mapBacklogRowToVorhabenCardSummary({
          ...row,
          deliveryProgressPercent: row.deliveryProgressPercent,
          nextMilestone: row.nextMilestone,
        }),
      ),
    [filteredRows],
  );

  return (
    <div className="space-y-4" data-testid="initiative-backlog-workspace">
      {filterTarget ? (
        <VorhabenZielFilterChip
          targetTitle={filterTarget.title}
          removeHref={buildVorhabenZielFilterRemoveHref("vorhaben", searchParams)}
        />
      ) : null}

      {/* data-sce-contextual-create-flow="inline-collapsible" — CreateInitiativeWorkspaceCollapsibleCard */}
      <CreateInitiativeWorkspaceCollapsibleCard
        canCreate={canManage}
        filterTarget={filterTarget}
        variant="prioritaeten"
        onCreated={() => {
          filtersChangedRef.current = true;
          fetchBacklog();
        }}
      />

      <div className={SCE_CD_WORKSPACE_PANEL_CLASS}>
        <VorhabenWorkspaceToolbar
          search={search}
          onSearchChange={setSearch}
          secondaryFiltersOpen={secondaryFiltersOpen}
          onSecondaryFiltersToggle={() => setSecondaryFiltersOpen((open) => !open)}
          showPrioritaetenControl
          prioritaetenActive={showPrioritaetenActive}
          searchPlaceholder={CD_VORHABEN_WORKSPACE_COPY.searchPlaceholder}
        />

        {secondaryFiltersOpen ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Vorhaben-Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              >
                <option value="">Alle</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">{CD_INITIATIVE_COPY.dispositionFilter}</span>
              <select
                value={dispositionFilter}
                onChange={(e) => setDispositionFilter(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              >
                <option value="">Alle</option>
                {Object.entries(DISPOSITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="mb-1 block text-xs text-[var(--muted)]">{CD_INITIATIVE_COPY.ownerTextFilterLabel}</span>
              <input
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        {error ? (
          <ClubDevelopmentFormError message={error} className="mb-3" />
        ) : null}
        {error && loadFailed ? (
          <button
            type="button"
            onClick={() => fetchBacklog()}
            className="mb-3 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)]"
            data-testid="vorhaben-backlog-retry"
          >
            Erneut laden
          </button>
        ) : null}

        {pending ? <VorhabenWorkspaceLoadingState label="Vorhaben werden geladen …" /> : null}

        {listEmpty ? (
          <SceClubDevelopmentEmptyState
            message={
              loadFailed && !filtersChangedRef.current
                ? "Vorhaben konnten nicht geladen werden."
                : canManage
                  ? CD_INITIATIVE_COPY.emptyBacklogManage
                  : CD_INITIATIVE_COPY.emptyBacklogView
            }
          />
        ) : (
          <VorhabenWorkspaceCardList
            items={cardSummaries}
            showBacklogMeta
            testId="initiative-backlog-cards"
          />
        )}
      </div>
    </div>
  );
}