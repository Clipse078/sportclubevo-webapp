"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEventHandler } from "react";

type Props = {
  defaultExpanded?: boolean;
  canCreate: boolean;
};

export default function InitiativeBacklogCreateCard({ defaultExpanded = false, canCreate }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canCreate) return null;

  const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const expectedOutcome = String(formData.get("expectedOutcome") ?? "").trim();
    const backlogPriorityRaw = String(formData.get("backlogPriority") ?? "0").trim();
    const backlogPriority = Number.parseInt(backlogPriorityRaw, 10);

    startTransition(async () => {
      try {
        const res = await fetch("/api/initiatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            summary: summary || undefined,
            expectedOutcome: expectedOutcome || undefined,
            backlogPriority: Number.isFinite(backlogPriority) ? backlogPriority : 0,
            status: "PLANNED",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Erstellung fehlgeschlagen.");
          return;
        }
        const slug = data.initiative?.slug as string | undefined;
        event.currentTarget.reset();
        setExpanded(false);
        router.refresh();
        if (slug) {
          router.push(`/vereinsleitung/initiativen/${slug}`);
        }
      } catch {
        setError("Netzwerkfehler — bitte erneut versuchen.");
      }
    });
  };

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50"
      data-testid="initiative-backlog-create-card"
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)]/60 px-3 py-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-md"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Initiative im Backlog erfassen
          </span>
        </button>
      </div>

      {expanded ? (
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          {error ? (
            <p className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200" role="alert">
              {error}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Titel *</span>
              <input
                name="title"
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Kurzbeschreibung</span>
              <input
                name="summary"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Erwartetes Outcome</span>
              <textarea
                name="expectedOutcome"
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Backlog-Priorität</span>
              <input
                name="backlogPriority"
                type="number"
                defaultValue={0}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Speichern
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
