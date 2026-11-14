"use client";

import { Calendar, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import DevelopmentSprintWorkspaceNav from "./DevelopmentSprintWorkspaceNav";
import { Badge } from "@/components/ui";

const STATUS_LABELS: Record<DevelopmentSprintStatus, string> = {
  PLANNED: "Geplant",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
};

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
        setError(typeof data.error === "string" ? data.error : "Sprint konnte nicht gestartet werden.");
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
      ? { label: "Sprint starten", onClick: startSprint }
      : status === "ACTIVE" && canManage && activeTab === "planung"
        ? { label: "Sprint abschließen", onClick: () => document.getElementById("sprint-close-panel")?.scrollIntoView({ behavior: "smooth" }) }
        : null;

  return (
    <header className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm" data-testid="sprint-workspace-header">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-[var(--foreground)]">{title}</h1>
            <Badge variant="info">{STATUS_LABELS[status]}</Badge>
          </div>
          {editingGoal ? (
            <div className="space-y-2">
              <textarea
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                rows={2}
                disabled={pending}
                className="w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                placeholder="Sprintziel beschreiben …"
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
              <span>Kein Sprintziel erfasst.</span>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setEditingGoal(true)}
                  className="inline-flex items-center gap-1 text-[var(--sce-primary)] hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Ziel bearbeiten
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
              Ziel bearbeiten
            </button>
          ) : null}
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

      <dl className="grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>Geplant: {period}</span>
        </div>
        {startedAt ? (
          <div>Gestartet: {formatSwissDate(startedAt) ?? "—"}</div>
        ) : null}
        <div>Verantwortlich: {owner?.trim() || "Nicht erfasst"}</div>
        <div>
          Aufgaben: {completedCount}/{totalCount} erledigt
        </div>
      </dl>

      {error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {error}
        </p>
      ) : null}

      <DevelopmentSprintWorkspaceNav slug={slug} />
    </header>
  );
}