"use client";

import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { InitiativeDisposition, InitiativeStatus } from "@prisma/client";
import { CD_INITIATIVE_COPY } from "@/lib/club-development/product-copy";
import InitiativeBacklogCreateCard from "./InitiativeBacklogCreateCard";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { mapBacklogRowToVorhabenCardSummary } from "@/lib/club-development/vorhaben-workspace-card-mappers";
import type { VorhabenWorkspaceCardNextMilestone } from "@/lib/club-development/vorhaben-workspace-card-types";
import VorhabenWorkspaceCardList from "./VorhabenWorkspaceCardList";
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

type Props = {
  initialInitiatives: InitiativeBacklogRow[];
  canManage: boolean;
  canView: boolean;
  initialTargetId?: string | null;
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
}: Props) {
  const [rows, setRows] = useState<InitiativeBacklogRow[]>(initialInitiatives);
  const targetIdFilter = (initialTargetId ?? "").trim();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const skipInitialFetchRef = useRef(true);
  const filtersChangedRef = useRef(false);

  const fetchBacklog = useCallback(() => {
    if (!canView) {
      setError("Du hast keine Berechtigung, den Backlog zu laden.");
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
        return;
      }
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
  const showLoadFailureHint = Boolean(error) && rows.length === 0 && !filtersChangedRef.current;

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
      {targetIdFilter ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-2)]">
          Filter: Vorhaben, die mit dem gewählten strategischen Ziel verknüpft sind.{" "}
          <Link
            href="/vereinsleitung/initiativen/backlog"
            className="font-medium text-[var(--sce-primary)] hover:underline"
          >
            Filter entfernen
          </Link>
        </p>
      ) : null}
      <InitiativeBacklogCreateCard
        canCreate={canManage}
        onCreated={() => {
          filtersChangedRef.current = true;
          fetchBacklog();
        }}
      />

      <div className={SCE_CD_WORKSPACE_PANEL_CLASS}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen …"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Status</span>
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
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-xs text-[var(--muted)]">Verantwortlich (Textfilter)</span>
            <input
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        {error ? <ClubDevelopmentFormError message={error} className="mb-3" /> : null}

        {pending ? (
          <div className="mb-2 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
          </div>
        ) : null}

        {listEmpty ? (
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            {showLoadFailureHint
              ? "Backlog konnte nicht geladen werden. Bereits sichtbare Einträge bleiben erhalten, sobald vorhanden."
              : canManage
                ? CD_INITIATIVE_COPY.emptyBacklogManage
                : CD_INITIATIVE_COPY.emptyBacklogView}
          </div>
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