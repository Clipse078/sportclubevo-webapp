"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEventHandler } from "react";

type Props = {
  canCreate: boolean;
  defaultExpanded?: boolean;
};

export default function DevelopmentSprintCreateCard({ canCreate, defaultExpanded = false }: Props) {
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
    const goal = String(formData.get("goal") ?? "").trim();
    const owner = String(formData.get("owner") ?? "").trim();
    const startsAt = String(formData.get("startsAt") ?? "").trim();
    const endsAt = String(formData.get("endsAt") ?? "").trim();

    startTransition(async () => {
      try {
        const res = await fetch("/api/club-development/sprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            goal: goal || undefined,
            owner: owner || undefined,
            startsAt: startsAt || undefined,
            endsAt: endsAt || undefined,
            status: "PLANNED",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Sprint konnte nicht erstellt werden.");
          return;
        }
        const slug = data.sprint?.slug as string | undefined;
        event.currentTarget.reset();
        setExpanded(false);
        router.refresh();
        if (slug) router.push(`/vereinsleitung/sprints/${slug}`);
      } catch {
        setError("Netzwerkfehler — bitte erneut versuchen.");
      }
    });
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50" data-testid="sprint-create-card">
      <SprintCreateCollapsibleHeader expanded={expanded} onToggle={() => setExpanded(!expanded)} />
      {expanded ? (
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          {error ? (
            <p className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200" role="alert">
              {error}
            </p>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Titel *</span>
            <input
              name="title"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Ziel</span>
            <textarea name="goal" rows={2} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Verantwortlich</span>
              <input name="owner" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Start</span>
              <input name="startsAt" type="date" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Ende</span>
              <input name="endsAt" type="date" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sprint anlegen
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function SprintCreateCollapsibleHeader({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)]/60 px-3 py-2.5">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-md"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Sprint erstellen</span>
      </button>
    </div>
  );
}
