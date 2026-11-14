"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { DevelopmentSprintGoalResult, TaskStatus } from "@prisma/client";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import type { UnfinishedTaskDisposition } from "@/lib/club-development/sprints/sprint-close-types";
import { CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";

type MembershipPreview = {
  taskId: string;
  title: string;
  status: TaskStatus;
};

type FutureSprintOption = { id: string; title: string };

type Props = {
  sprintId: string;
  memberships: MembershipPreview[];
};

const GOAL_RESULTS: { value: DevelopmentSprintGoalResult; label: string }[] = [
  { value: "ACHIEVED", label: "Ziel erreicht" },
  { value: "PARTLY_ACHIEVED", label: "Ziel teilweise erreicht" },
  { value: "NOT_ACHIEVED", label: "Ziel nicht erreicht" },
];

const DEFAULT_DISPOSITIONS: { value: UnfinishedTaskDisposition; label: string }[] = [
  { value: "BACKLOG", label: "Offene Aufgaben ins Backlog zurückgeben" },
  { value: "RETAIN_HISTORICAL", label: "Offene Aufgaben in der Umsetzungsphase vermerken (historisch)" },
  { value: "FUTURE_SPRINT", label: `Ausgewählte Aufgaben in eine ${CD_SPRINT_WORKSPACE_COPY.futurePhase} verschieben` },
];

export default function SprintClosePanel({ sprintId, memberships }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [goalResult, setGoalResult] = useState<DevelopmentSprintGoalResult>("PARTLY_ACHIEVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [defaultDisposition, setDefaultDisposition] =
    useState<UnfinishedTaskDisposition>("RETAIN_HISTORICAL");
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [futureSprints, setFutureSprints] = useState<FutureSprintOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { finished, unfinished } = useMemo(() => {
    const finishedRows = memberships.filter((m) => m.status === "DONE");
    const unfinishedRows = memberships.filter((m) => m.status !== "DONE");
    return { finished: finishedRows, unfinished: unfinishedRows };
  }, [memberships]);

  useEffect(() => {
    if (!expanded) return;
    void (async () => {
      const res = await fetch("/api/club-development/sprints");
      const data = await res.json().catch(() => ({}));
      const options = (data.sprints ?? [])
        .filter((s: { id: string; status: string }) => s.id !== sprintId && s.status !== "COMPLETED")
        .map((s: { id: string; title: string }) => ({ id: s.id, title: s.title }));
      setFutureSprints(options);
    })();
  }, [expanded, sprintId]);

  const submitClose = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const taskDestinations =
        defaultDisposition === "FUTURE_SPRINT"
          ? unfinished
              .filter((row) => moveTargets[row.taskId])
              .map((row) => ({
                taskId: row.taskId,
                disposition: "FUTURE_SPRINT" as const,
                moveToSprintId: moveTargets[row.taskId],
              }))
          : undefined;

      const res = await fetch(`/api/club-development/sprints/${sprintId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalResult,
          reviewNotes: reviewNotes.trim() || null,
          defaultUnfinishedDisposition: defaultDisposition,
          taskDestinations,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Abschluss fehlgeschlagen.");
        return;
      }
      const report = data.report;
      setMessage(
        `Umsetzungsphase abgeschlossen. Erledigt: ${report?.finishedCount ?? 0}, offen: ${report?.unfinishedCount ?? 0}.`,
      );
      router.refresh();
    });
  };

  return (
    <section
      id="sprint-close-panel"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50"
      data-testid="sprint-close-panel"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-[var(--foreground)]">{CD_SPRINT_WORKSPACE_COPY.closePhase}</span>
        <ChevronDown className={`h-4 w-4 text-[var(--muted)] transition ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded ? (
        <div className="space-y-4 border-t border-[var(--border)] p-4">
          {error ? <ClubDevelopmentFormError message={error} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">Erledigte Aufgaben ({finished.length})</p>
              <ul className="mt-1 text-sm text-[var(--text-2)]">
                {finished.length === 0 ? (
                  <li className="text-[var(--muted)]">Keine</li>
                ) : (
                  finished.map((t) => <li key={t.taskId}>{t.title}</li>)
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">Offene Aufgaben ({unfinished.length})</p>
              <ul className="mt-1 text-sm text-[var(--text-2)]">
                {unfinished.length === 0 ? (
                  <li className="text-[var(--muted)]">Keine</li>
                ) : (
                  unfinished.map((t) => <li key={t.taskId}>{t.title}</li>)
                )}
              </ul>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[var(--muted)]">Zielergebnis</legend>
            {GOAL_RESULTS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="goalResult"
                  checked={goalResult === opt.value}
                  onChange={() => setGoalResult(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[var(--muted)]">Umgang mit offenen Aufgaben</legend>
            {DEFAULT_DISPOSITIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="defaultUnfinishedDisposition"
                  checked={defaultDisposition === opt.value}
                  onChange={() => setDefaultDisposition(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>

          {defaultDisposition === "FUTURE_SPRINT" && unfinished.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--muted)]">{CD_SPRINT_WORKSPACE_COPY.closeTargetPhasePerTask}</p>
              {unfinished.map((row) => (
                <label key={row.taskId} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-[8rem]">{row.title}</span>
                  <select
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                    value={moveTargets[row.taskId] ?? ""}
                    onChange={(e) =>
                      setMoveTargets((prev) => ({ ...prev, [row.taskId]: e.target.value }))
                    }
                  >
                    <option value="">{CD_SPRINT_WORKSPACE_COPY.chooseTargetPhase}</option>
                    {futureSprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Review-Notizen (optional)</span>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>

          <CloseActions pending={pending} message={message} onSubmit={submitClose} />
        </div>
      ) : null}
    </section>
  );
}

function CloseActions({
  pending,
  message,
  onSubmit,
}: {
  pending: boolean;
  message: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--sce-primary)] bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {CD_SPRINT_WORKSPACE_COPY.closePhase}
      </button>
      {message ? <p className="text-xs text-[var(--sce-success)]">{message}</p> : null}
    </div>
  );
}