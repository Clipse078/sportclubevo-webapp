"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TaskPriority } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";
import { createAufgabeFullAction } from "@/app/(admin)/dashboard/aufgaben/actions";

type Props = {
  assigneeOptions: TaskAssigneeOption[];
  backHref: string;
};

export default function AufgabenFullCreateClient({ assigneeOptions, backHref }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAufgabeFullAction(formData);
      if (result.ok && result.taskId) {
        router.push(`/dashboard/aufgaben/${result.taskId}`);
        return;
      }
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <div className={cn(SCE_DIALOG_WORKSPACE_PANEL, "min-h-[60vh] w-full")} data-testid="task-workspace-create">
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
          <Link
            href={backHref}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--surface-2)]"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Neue Aufgabe</h1>
            <p className="text-xs text-[var(--muted)]">Alle Details für eine operative Aufgabe.</p>
          </div>
        </header>

        <div className="px-6 py-5">
          {error ? (
            <p className="mb-4 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <form action={onSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
                <input name="title" required className="fca-input w-full text-sm" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Beschreibung</span>
                <textarea name="description" rows={5} className="fca-input w-full text-sm" />
              </label>
            </div>
            <aside className="space-y-4 lg:border-l lg:border-[var(--border)]/60 lg:pl-5">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Verantwortlich</span>
                <select name="assigneeUserIds" className="fca-input w-full text-sm">
                  <option value="">Optional</option>
                  {assigneeOptions.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.firstName} {a.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Priorität</span>
                <select name="priority" className="fca-input w-full text-sm" defaultValue="NORMAL">
                  {(["LOW", "NORMAL", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Termin</span>
                <input type="date" name="dueAt" className="fca-input w-full text-sm" />
              </label>
              <button type="submit" className="fca-button-primary w-full text-sm" disabled={pending}>
                {pending ? "Erstellen …" : "Aufgabe erstellen"}
              </button>
            </aside>
          </form>
        </div>
      </div>
    </div>
  );
}
