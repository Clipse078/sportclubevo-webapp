"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition, type FormEventHandler } from "react";
import type { InitiativeMilestoneStatus } from "@prisma/client";

type MilestoneRow = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: InitiativeMilestoneStatus;
  sortOrder: number;
};

type Props = {
  initiativeId: string;
  canManage: boolean;
};

const STATUS_LABELS: Record<InitiativeMilestoneStatus, string> = {
  OPEN: "Offen",
  DONE: "Erledigt",
};

export default function InitiativeMilestonesSection({ initiativeId, canManage }: Props) {
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadMilestones = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/club-development/initiatives/${initiativeId}/milestones`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Meilensteine konnten nicht geladen werden.");
        return;
      }
      const rows = (data.milestones ?? []) as {
        id: string;
        title: string;
        description: string | null;
        targetDate: string | null;
        status: InitiativeMilestoneStatus;
        sortOrder: number;
      }[];
      setMilestones(
        rows.map((m) => ({
          ...m,
          targetDate: m.targetDate ? new Date(m.targetDate).toISOString() : null,
        })),
      );
    });
  }, [initiativeId]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const onCreate: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canManage) return;
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const targetDate = String(formData.get("targetDate") ?? "").trim();
    startTransition(async () => {
      const res = await fetch(`/api/club-development/initiatives/${initiativeId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          targetDate: targetDate || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Meilenstein konnte nicht erstellt werden.");
        return;
      }
      event.currentTarget.reset();
      setExpanded(false);
      loadMilestones();
    });
  };

  return (
    <div className="space-y-3" data-testid="initiative-milestones-section">
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      {milestones.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Noch keine Meilensteine erfasst.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30">
          {milestones.map((m) => (
            <li key={m.id} className="px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--foreground)]">{m.title}</p>
              <p className="text-xs text-[var(--muted)]">
                {STATUS_LABELS[m.status]}
                {m.targetDate
                  ? ` · Ziel ${new Intl.DateTimeFormat("de-CH").format(new Date(m.targetDate))}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            Meilenstein hinzufügen
          </button>
          {expanded ? (
            <form onSubmit={onCreate} className="space-y-3 border-t border-[var(--border)]/60 p-4">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">Titel *</span>
                <input
                  name="title"
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">Zieldatum</span>
                <input name="targetDate" type="date" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Speichern
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
