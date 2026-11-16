"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";

type Props = {
  sprintId: string;
  disabled?: boolean;
  onCreated: () => void;
};

export default function SprintInlineTaskCreate({ sprintId, disabled, onCreated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [retryTaskId, setRetryTaskId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submitCreate = (retryOnly = false) => {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      if (retryOnly && retryTaskId) {
        const res = await fetch(`/api/club-development/sprints/${sprintId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: retryTaskId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Zuordnung fehlgeschlagen.");
          return;
        }
        setRetryTaskId(null);
        setInfo(CD_SPRINT_WORKSPACE_COPY.taskAssignedToPhase);
        onCreated();
        return;
      }

      const trimmed = title.trim();
      if (!trimmed) {
        setError("Titel ist erforderlich.");
        return;
      }

      const res = await fetch(`/api/club-development/sprints/${sprintId}/tasks/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 207 && data.task?.id) {
        setRetryTaskId(data.task.id as string);
        setInfo(
          typeof data.allocationError === "string"
            ? data.allocationError
            : CD_SPRINT_WORKSPACE_COPY.phaseAssignmentFailed,
        );
        setTitle("");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Erstellen fehlgeschlagen.");
        return;
      }
      setTitle("");
      setExpanded(false);
      onCreated();
    });
  };

  return (
    <div className="mt-3" data-testid="sprint-inline-task-create">
      <SceClubDevelopmentContextualCreateCollapsibleShell
        actionLabel={CD_SPRINT_WORKSPACE_COPY.createNewTaskInPhase}
        expanded={expanded}
        onExpandedChange={(open) => {
          if (disabled && open) return;
          setExpanded(open);
        }}
        panelDomId="sprint-inline-task-create-body"
        cardTestId="sprint-inline-task-create-card"
        collapseToggleTestId="sprint-inline-task-create-toggle"
      >
        <div className="space-y-3 p-3">
          {error ? <ClubDevelopmentFormError message={error} /> : null}
          {info ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {info}
              {retryTaskId ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => submitCreate(true)}
                  className="ml-2 font-medium text-[var(--sce-primary)] underline"
                >
                  Erneut zuordnen
                </button>
              ) : null}
            </p>
          ) : null}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending || disabled}
            placeholder="Titel der Aufgabe"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || disabled}
            onClick={() => submitCreate(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--sce-primary)] bg-[var(--sce-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {CD_SPRINT_WORKSPACE_COPY.addTaskToPhase}
          </button>
        </div>
      </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}