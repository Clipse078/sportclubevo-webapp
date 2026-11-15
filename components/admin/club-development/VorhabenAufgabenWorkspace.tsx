"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { InitiativeStatus, TaskStatus } from "@prisma/client";
import {
  CD_NAV_COPY,
  CD_VORHABEN_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import type {
  VorhabenWorkspaceInitiativeRow,
  VorhabenWorkspaceSnapshot,
  VorhabenWorkspaceTaskRow,
} from "@/lib/club-development/vorhaben-workspace";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { Badge } from "@/components/ui";

type Props = {
  initialSnapshot: VorhabenWorkspaceSnapshot;
  initialTargetId?: string | null;
  initialInitiativeId?: string | null;
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
  { value: "BLOCKED", label: "Blockiert" },
];

const LINK_KIND_LABELS: Record<VorhabenWorkspaceTaskRow["linkKind"], string> = {
  INITIATIVE_CONTEXT: "Vorhaben-Kontext",
  PRIMARY_INITIATIVE: "Primäres Vorhaben",
  MEETING_DECISION: "Beschluss",
};

function NavShortcut({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:border-[var(--sce-primary)]/40"
    >
      <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[var(--sce-primary)]">
        {label}
      </span>
      <span className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">{description}</span>
    </Link>
  );
}

function InitiativeRowCard({ row }: { row: VorhabenWorkspaceInitiativeRow }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={row.detailHref}
            className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]"
          >
            {row.title}
          </Link>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {row.statusLabel} · {row.progress}% · {row.openRootTaskCount}{" "}
            {row.openRootTaskCount === 1 ? "offene Aufgabe" : "offene Aufgaben"}
          </p>
        </div>
        <Link
          href={row.workHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sce-primary)] hover:underline"
        >
          Fokus
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

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
        <p className="mt-1 text-[11px] text-[var(--muted)]">{CD_VORHABEN_WORKSPACE_COPY.rootTasksOnly}</p>
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
}: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [search, setSearch] = useState("");
  const [initiativeId, setInitiativeId] = useState(initialInitiativeId ?? "");
  const [initiativeStatus, setInitiativeStatus] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const skipInitialFetchRef = useRef(true);

  const targetIdFilter = (initialTargetId ?? "").trim();

  const selectedInitiative = useMemo(
    () => snapshot.initiatives.find((row) => row.id === initiativeId) ?? null,
    [initiativeId, snapshot.initiatives],
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

  return (
    <div className="space-y-6" data-testid="vorhaben-aufgaben-workspace">
      <p className="max-w-3xl text-sm text-[var(--text-2)] leading-relaxed">{CD_VORHABEN_WORKSPACE_COPY.intro}</p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <NavShortcut
          href="/vereinsleitung/strategie"
          label={CD_NAV_COPY.strategyOverview}
          description={CD_VORHABEN_WORKSPACE_COPY.shortcutStrategy}
        />
        <NavShortcut
          href={
            targetIdFilter
              ? `/vereinsleitung/initiativen/backlog?targetId=${encodeURIComponent(targetIdFilter)}`
              : "/vereinsleitung/initiativen/backlog"
          }
          label={CD_NAV_COPY.initiativeBacklog}
          description={CD_VORHABEN_WORKSPACE_COPY.shortcutBacklog}
        />
        <NavShortcut
          href="/vereinsleitung/sprints"
          label={CD_NAV_COPY.implementationPlanning}
          description={CD_VORHABEN_WORKSPACE_COPY.shortcutSprints}
        />
        <NavShortcut
          href="/dashboard/aufgaben"
          label="Aufgaben"
          description={CD_VORHABEN_WORKSPACE_COPY.shortcutTasksInbox}
        />
      </div>

      {targetIdFilter ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-2)]">
          {CD_VORHABEN_WORKSPACE_COPY.targetFilterHint}{" "}
          <Link href="/vereinsleitung/vorhaben" className="font-medium text-[var(--sce-primary)] hover:underline">
            Filter entfernen
          </Link>
        </p>
      ) : null}

      {showRestricted ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {snapshot.restrictedReason}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="relative block sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={CD_VORHABEN_WORKSPACE_COPY.searchPlaceholder}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm"
            />
          </label>
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

        {selectedInitiative ? (
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

        {pending ? (
          <div className="mb-3 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" aria-label="Lädt" />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="vorhaben-workspace-initiatives-heading">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="vorhaben-workspace-initiatives-heading" className="text-sm font-semibold text-[var(--foreground)]">
                {CD_VORHABEN_WORKSPACE_COPY.initiativesHeading}
              </h2>
              <Link
                href="/vereinsleitung/initiativen"
                className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
              >
                Vorhaben-Liste
              </Link>
            </div>
            {!snapshot.canViewInitiatives ? (
              <p className="text-sm text-[var(--muted)]">{CD_VORHABEN_WORKSPACE_COPY.noInitiativeAccess}</p>
            ) : initiativesEmpty ? (
              <p className="text-sm text-[var(--muted)]">{CD_VORHABEN_WORKSPACE_COPY.emptyInitiatives}</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.initiatives.map((row) => (
                  <li key={row.id}>
                    <InitiativeRowCard row={row} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="vorhaben-workspace-tasks-heading">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="vorhaben-workspace-tasks-heading" className="text-sm font-semibold text-[var(--foreground)]">
                {CD_VORHABEN_WORKSPACE_COPY.tasksHeading}
              </h2>
              <Link
                href="/dashboard/aufgaben"
                className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
              >
                Gesamt-Inbox
              </Link>
            </div>
            {!snapshot.canViewTasks ? (
              <p className="text-sm text-[var(--muted)]">{CD_VORHABEN_WORKSPACE_COPY.noTaskAccess}</p>
            ) : tasksEmpty ? (
              <p className="text-sm text-[var(--muted)]">{CD_VORHABEN_WORKSPACE_COPY.emptyTasks}</p>
            ) : (
              <ul>
                {snapshot.tasks.map((row) => (
                  <TaskRowCard key={row.id} row={row} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}