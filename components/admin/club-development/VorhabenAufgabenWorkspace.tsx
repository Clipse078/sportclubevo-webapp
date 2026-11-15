"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { InitiativeStatus, TaskStatus } from "@prisma/client";
import { CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { buildVorhabenUndUmsetzungHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { VorhabenWorkspaceSnapshot, VorhabenWorkspaceTaskRow } from "@/lib/club-development/vorhaben-workspace";
import { mapWorkspaceInitiativeToVorhabenCardSummary } from "@/lib/club-development/vorhaben-workspace-card-mappers";
import VorhabenWorkspaceCardList from "./VorhabenWorkspaceCardList";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
import { Badge } from "@/components/ui";
import CreateInitiativeWorkspaceCollapsibleCard from "@/components/admin/initiatives/CreateInitiativeWorkspaceCollapsibleCard";
import VorhabenWorkspaceToolbar from "./VorhabenWorkspaceToolbar";
import VorhabenZielFilterChip, {
  buildVorhabenZielFilterRemoveHref,
} from "./VorhabenZielFilterChip";
import VorhabenWorkspaceLoadingState from "./VorhabenWorkspaceLoadingState";

export type VorhabenAufgabenWorkspaceVariant = "vorhaben" | "aufgaben";

type FilterTarget = {
  id: string;
  title: string;
};

type Props = {
  initialSnapshot: VorhabenWorkspaceSnapshot;
  initialTargetId?: string | null;
  initialInitiativeId?: string | null;
  variant: VorhabenAufgabenWorkspaceVariant;
  filterTarget?: FilterTarget | null;
  showPrioritaetenControl?: boolean;
  showPrioritaetenActive?: boolean;
};

const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  ON_TRACK: "On Track",
  ON_HOLD: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "OPEN", label: "Offen" },
  { value: "IN_PROGRESS", label: "In Arbeit" },
  { value: "DONE", label: "Erledigt" },
  { value: "CANCELLED", label: "Abgebrochen" },
];

const LINK_KIND_LABELS: Record<VorhabenWorkspaceTaskRow["linkKind"], string> = {
  INITIATIVE_CONTEXT: "Vorhaben-Kontext",
  PRIMARY_INITIATIVE: "Primäres Vorhaben",
  MEETING_DECISION: "Beschluss",
};

function TaskRowCard({ row }: { row: VorhabenWorkspaceTaskRow }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border)] py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <Link
          href={row.href}
          className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]"
        >
          {row.title}
        </Link>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {row.statusLabel}
          {row.assigneeLabels.length > 0 ? ` · ${row.assigneeLabels.join(", ")}` : ""}
          <span className="text-[var(--text-2)]"> · {LINK_KIND_LABELS[row.linkKind]}</span>
        </p>
        {row.initiativeTitle ? (
          <p className="mt-0.5 text-xs text-[var(--text-2)]">
            {row.initiativeSlug ? (
              <Link
                href={`/vereinsleitung/initiativen/${encodeURIComponent(row.initiativeSlug)}`}
                className="hover:text-[var(--sce-primary)]"
              >
                {row.initiativeTitle}
              </Link>
            ) : (
              row.initiativeTitle
            )}
          </p>
        ) : null}
      </div>
      <Badge variant="outline" size="sm">
        {row.statusLabel}
      </Badge>
    </li>
  );
}

export default function VorhabenAufgabenWorkspace({
  initialSnapshot,
  initialTargetId = null,
  initialInitiativeId = null,
  variant,
  filterTarget = null,
  showPrioritaetenControl = false,
  showPrioritaetenActive = false,
}: Props) {
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [search, setSearch] = useState("");
  const [initiativeId, setInitiativeId] = useState(initialInitiativeId ?? "");
  const [initiativeStatus, setInitiativeStatus] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [secondaryFiltersOpen, setSecondaryFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const skipInitialFetchRef = useRef(true);

  const targetIdFilter = (initialTargetId ?? "").trim();
  const isVorhabenView = variant === "vorhaben";

  const selectedInitiative = useMemo(
    () => snapshot.initiatives.find((row) => row.id === initiativeId) ?? null,
    [initiativeId, snapshot.initiatives],
  );

  const initiativeCards = useMemo(
    () => snapshot.initiatives.map((row) => mapWorkspaceInitiativeToVorhabenCardSummary(row)),
    [snapshot.initiatives],
  );

  const fetchWorkspace = useCallback(() => {
    if (!snapshot.canViewInitiatives && !snapshot.canViewTasks) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (initiativeId) params.set("initiativeId", initiativeId);
      if (targetIdFilter) params.set("targetId", targetIdFilter);
      if (initiativeStatus) params.set("initiativeStatus", initiativeStatus);
      if (taskStatus) params.set("taskStatus", taskStatus);

      const result = await clubDevelopmentFetchJson<VorhabenWorkspaceSnapshot>(
        `/api/club-development/vorhaben-workspace?${params.toString()}`,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSnapshot(result.data);
    });
  }, [
    initiativeId,
    initiativeStatus,
    search,
    snapshot.canViewInitiatives,
    snapshot.canViewTasks,
    targetIdFilter,
    taskStatus,
  ]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }
    const handle = window.setTimeout(() => fetchWorkspace(), 300);
    return () => window.clearTimeout(handle);
  }, [fetchWorkspace]);

  const showRestricted = Boolean(snapshot.restrictedReason);
  const tasksEmpty = snapshot.tasks.length === 0;
  const initiativesEmpty = snapshot.initiatives.length === 0;

  const filterBar = (
    <>
      <VorhabenWorkspaceToolbar
        search={search}
        onSearchChange={setSearch}
        secondaryFiltersOpen={secondaryFiltersOpen}
        onSecondaryFiltersToggle={() => setSecondaryFiltersOpen((open) => !open)}
        showPrioritaetenControl={isVorhabenView && showPrioritaetenControl}
        prioritaetenActive={showPrioritaetenActive}
      />
      {secondaryFiltersOpen ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!isVorhabenView ? (
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Vorhaben</span>
              <select
                value={initiativeId}
                onChange={(e) => setInitiativeId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                disabled={!snapshot.canViewInitiatives}
              >
                <option value="">{CD_VORHABEN_WORKSPACE_COPY.allInitiatives}</option>
                {snapshot.initiatives.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Vorhaben-Status</span>
            <select
              value={initiativeStatus}
              onChange={(e) => setInitiativeStatus(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              disabled={!snapshot.canViewInitiatives}
            >
              <option value="">Alle</option>
              {Object.entries(INITIATIVE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Aufgaben-Status</span>
            <select
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              disabled={!snapshot.canViewTasks}
            >
              <option value="">{CD_VORHABEN_WORKSPACE_COPY.anyOpenTaskStatus}</option>
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="space-y-4" data-testid="vorhaben-aufgaben-workspace" data-variant={variant}>
      {filterTarget ? (
        <VorhabenZielFilterChip
          targetTitle={filterTarget.title}
          removeHref={buildVorhabenZielFilterRemoveHref(variant, searchParams)}
        />
      ) : null}

      {showRestricted ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {snapshot.restrictedReason}
        </div>
      ) : null}

      {/* data-sce-contextual-create-flow="inline-collapsible" — CreateInitiativeWorkspaceCollapsibleCard */}
      {isVorhabenView && snapshot.canManageInitiatives ? (
        <CreateInitiativeWorkspaceCollapsibleCard
          canCreate
          filterTarget={filterTarget}
          onCreated={() => fetchWorkspace()}
        />
      ) : null}

      <div className={SCE_CD_WORKSPACE_PANEL_CLASS}>
        {filterBar}

        {selectedInitiative && !isVorhabenView ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
            <span className="text-[var(--text-2)]">{CD_VORHABEN_WORKSPACE_COPY.focusInitiative}</span>
            <Link
              href={selectedInitiative.detailHref}
              className="font-semibold text-[var(--sce-primary)] hover:underline"
            >
              {selectedInitiative.title}
            </Link>
            <Link
              href={selectedInitiative.detailHref}
              className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--sce-primary)]"
            >
              Details
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        ) : null}

        {error ? <ClubDevelopmentFormError message={error} className="mb-3" /> : null}

        {pending ? <VorhabenWorkspaceLoadingState /> : null}

        {isVorhabenView ? (
          <section aria-labelledby="vorhaben-workspace-initiatives-heading">
            {!snapshot.canViewInitiatives ? (
              <p className="text-sm text-[var(--muted)]">{CD_VORHABEN_WORKSPACE_COPY.noInitiativeAccess}</p>
            ) : initiativesEmpty ? (
              <SceClubDevelopmentEmptyState message={CD_VORHABEN_WORKSPACE_COPY.emptyInitiatives} />
            ) : (
              <VorhabenWorkspaceCardList items={initiativeCards} testId="vorhaben-aufgaben-cards" />
            )}
          </section>
        ) : (
          <SceClubDevelopmentSectionShell
            title={CD_VORHABEN_WORKSPACE_COPY.tasksHeading}
            href="/dashboard/aufgaben"
            linkLabel="Gesamt-Inbox"
            bodyClassName="px-5 py-3"
          >
            {!snapshot.canViewTasks ? (
              <p className="text-sm text-[var(--muted)]">{CD_VORHABEN_WORKSPACE_COPY.noTaskAccess}</p>
            ) : tasksEmpty ? (
              <SceClubDevelopmentEmptyState message={CD_VORHABEN_WORKSPACE_COPY.emptyTasks} />
            ) : (
              <ul>
                {snapshot.tasks.map((row) => (
                  <TaskRowCard key={row.id} row={row} />
                ))}
              </ul>
            )}
          </SceClubDevelopmentSectionShell>
        )}
      </div>
    </div>
  );
}