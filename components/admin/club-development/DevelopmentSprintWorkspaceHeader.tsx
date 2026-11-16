"use client";

import { Calendar, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import DevelopmentSprintWorkspaceNav from "./DevelopmentSprintWorkspaceNav";
import DevelopmentSprintSecondaryDelete from "./DevelopmentSprintSecondaryDelete";
import { Badge } from "@/components/ui";
import { CD_SPRINT_STATUS_LABELS, CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";

type Props = {
  sprintId: string;
  slug: string;
  title: string;
  goal: string | null;
  status: DevelopmentSprintStatus;
  owner: string | null;
  startsAt: string | null;
  endsAt: string | null;
  startedAt: string | null;
  completedCount: number;
  totalCount: number;
  canManage: boolean;
  canDelete: boolean;
  activeTab: "planung" | "board" | "rueckblick";
};

function formatSwissDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function DevelopmentSprintWorkspaceHeader({
  sprintId,
  slug,
  title,
  goal,
  status,
  owner,
  startsAt,
  endsAt,
  startedAt,
  completedCount,
  totalCount,
  canManage,
  canDelete,
  activeTab,
}: Props) {
  const router = useRouter();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(goal ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const period =
    startsAt || endsAt
      ? `${formatSwissDate(startsAt) ?? "—"} – ${formatSwissDate(endsAt) ?? "—"}`
      : "Kein Zeitraum geplant";

  const startSprint = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/club-development/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Umsetzungsphase konnte nicht gestartet werden.");
        return;
      }
      router.refresh();
    });
  };

  const saveGoal = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/club-development/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalDraft.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Speichern fehlgeschlagen.");
        return;
      }
      setEditingGoal(false);
      router.refresh();
    });
  };

  const primaryAction =
    status === "PLANNED" && canManage && activeTab === "planung"
      ? { label: CD_SPRINT_WORKSPACE_COPY.startPhase, onClick: startSprint }
      : status === "ACTIVE" && canManage && activeTab === "planung"
        ? {
            label: CD_SPRINT_WORKSPACE_COPY.closePhase,
            onClick: () => document.getElementById("sprint-close-panel")?.scrollIntoView({ behavior: "smooth" }),
          }
        : null;

  return (
    <header
      className={`${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-3`}
      data-testid="sprint-phase-summary"
    >
      <p className="sr-only">{CD_SPRINT_WORKSPACE_COPY.phaseGoalLabel}</p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{CD_SPRINT_STATUS_LABELS[status]}</Badge>
          <span className="text-xs text-[var(--muted)]">
            Aufgaben: {completedCount}/{totalCount} erledigt
          </span>
        </div>
        {primaryAction ? (
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--sce-primary)] bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {primaryAction.label}
          </button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {CD_SPRINT_WORKSPACE_COPY.phaseGoalLabel}
        </p>
        {editingGoal ? (
          <div className="space-y-2">
            <textarea
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              rows={2}
              disabled={pending}
              className="w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              placeholder={CD_SPRINT_WORKSPACE_COPY.goalPlaceholder}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={saveGoal}
                className="rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-medium text-white"
              >
                Speichern
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditingGoal(false);
                  setGoalDraft(goal ?? "");
                }}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : goal ? (
          <p className="max-w-2xl text-sm text-[var(--text-2)]">{goal}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <span>{CD_SPRINT_WORKSPACE_COPY.noGoalRecorded}</span>
            {canManage ? (
              <button
                type="button"
                onClick={() => setEditingGoal(true)}
                className="inline-flex items-center gap-1 text-[var(--sce-primary)] hover:underline"
              >
                <Pencil className="h-3.5 w-3.5" />
                {CD_SPRINT_WORKSPACE_COPY.phaseGoalEditAction}
              </button>
            ) : null}
          </div>
        )}
        {!editingGoal && goal && canManage ? (
          <button
            type="button"
            onClick={() => setEditingGoal(true)}
            className="inline-flex items-center gap-1 text-xs text-[var(--sce-primary)] hover:underline"
          >
            <Pencil className="h-3.5 w-3.5" />
            {CD_SPRINT_WORKSPACE_COPY.phaseGoalEditAction}
          </button>
        ) : null}
      </div>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          <span>Geplant: {period}</span>
        </div>
        {startedAt ? <div>Gestartet: {formatSwissDate(startedAt) ?? "—"}</div> : null}
        <div>Verantwortlich: {owner?.trim() || "Nicht erfasst"}</div>
      </dl>

      {error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {error}
        </p>
      ) : null}

      {canDelete ? (
        <div className="flex justify-end border-t border-[var(--border)]/60 pt-2">
          <DevelopmentSprintSecondaryDelete
            sprintId={sprintId}
            sprintTitle={title}
            canDelete={canDelete}
          />
        </div>
      ) : null}

      <DevelopmentSprintWorkspaceNav slug={slug} />
    </header>
  );
}