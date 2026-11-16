"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import SceInlineDestructiveConfirm from "@/components/sce/club-development/SceInlineDestructiveConfirm";
import { CD_TASK_WORKSPACE_COPY } from "@/lib/club-development/product-copy";

type Props = {
  taskId: string;
  taskTitle: string;
  canDelete: boolean;
  hasSubtasks: boolean;
  backHref: string;
};

export function TaskDeleteControl({
  taskId,
  taskTitle,
  canDelete,
  hasSubtasks,
  backHref,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canDelete) return null;

  function beginConfirm() {
    if (hasSubtasks) {
      setError(CD_TASK_WORKSPACE_COPY.deleteTaskBlockedSubtasks);
      setConfirming(true);
      return;
    }
    setError(null);
    setConfirming(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/permanent`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Löschen nicht möglich.");
        }
      } catch {
        setError("Netzwerkfehler.");
      }
    });
  }

  function performDelete() {
    if (hasSubtasks) return;
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ confirm: "true", returnTo: backHref });
        const res = await fetch(
          `/api/tasks/${encodeURIComponent(taskId)}/permanent?${params}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Löschen fehlgeschlagen.");
          return;
        }
        const target = typeof data.redirectTo === "string" ? data.redirectTo : backHref;
        router.push(target);
        router.refresh();
      } catch {
        setError("Netzwerkfehler.");
      }
    });
  }

  if (confirming) {
    if (hasSubtasks) {
      return (
        <SceInlineDestructiveConfirm
          title={CD_TASK_WORKSPACE_COPY.deleteTaskConfirmTitle}
          description={CD_TASK_WORKSPACE_COPY.deleteTaskBlockedSubtasks}
          error={error}
          confirmLabel="Verstanden"
          onConfirm={() => {
            setConfirming(false);
            setError(null);
          }}
          onCancel={() => {
            setConfirming(false);
            setError(null);
          }}
          testId="task-delete-confirm"
        />
      );
    }
    return (
      <SceInlineDestructiveConfirm
        title={CD_TASK_WORKSPACE_COPY.deleteTaskConfirmTitle}
        description={`${CD_TASK_WORKSPACE_COPY.deleteTaskConfirmBody} (${taskTitle})`}
        pending={pending}
        error={error}
        onConfirm={performDelete}
        onCancel={() => {
          if (!pending) {
            setConfirming(false);
            setError(null);
          }
        }}
        testId="task-delete-confirm"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={beginConfirm}
      disabled={pending}
      data-testid="task-delete-trigger"
      className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--sce-danger)] hover:bg-red-500/10 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {CD_TASK_WORKSPACE_COPY.deleteTask}
    </button>
  );
}