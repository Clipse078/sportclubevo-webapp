"use client";

import { Loader2, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEventHandler } from "react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import {
  CD_SPRINT_WORKSPACE_COPY,
  CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";

type SprintSnapshot = {
  id: string;
  slug: string;
  title: string;
  goal: string | null;
  status: DevelopmentSprintStatus;
  startsAt: string | null;
  endsAt: string | null;
};

type Props = {
  sprint: SprintSnapshot;
  canManage: boolean;
};

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function DevelopmentSprintPhaseEditMenu({ sprint, canManage }: Props) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState(sprint.title);
  const [goal, setGoal] = useState(sprint.goal ?? "");
  const [startsAt, setStartsAt] = useState(toDateInputValue(sprint.startsAt));
  const [endsAt, setEndsAt] = useState(toDateInputValue(sprint.endsAt));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = canManage && sprint.status !== "COMPLETED";

  useEffect(() => {
    setTitle(sprint.title);
    setGoal(sprint.goal ?? "");
    setStartsAt(toDateInputValue(sprint.startsAt));
    setEndsAt(toDateInputValue(sprint.endsAt));
  }, [sprint.endsAt, sprint.goal, sprint.startsAt, sprint.title]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  if (!editable) return null;

  const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (pending) return;
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Titel ist erforderlich.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await clubDevelopmentFetchJson<{ sprint?: { slug: string } }>(
        `/api/club-development/sprints/${sprint.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nextTitle,
            goal: goal.trim() || null,
            startsAt: startsAt ? `${startsAt}T12:00:00.000Z` : null,
            endsAt: endsAt ? `${endsAt}T12:00:00.000Z` : null,
          }),
        },
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const slug = result.data.sprint?.slug ?? sprint.slug;
      setFormOpen(false);
      setMenuOpen(false);
      router.refresh();
      if (slug !== sprint.slug) {
        router.push(`/vereinsleitung/sprints/${slug}/board`);
      }
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        data-testid={`umsetzungsplanung-phase-menu-${sprint.slug}`}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
        <span className="sr-only">Aktionen</span>
      </button>
      {menuOpen ? (
        <button
          type="button"
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 text-left shadow-lg"
          onClick={() => {
            setMenuOpen(false);
            setFormOpen(true);
          }}
          data-testid={`umsetzungsplanung-phase-edit-action-${sprint.slug}`}
        >
          <span className="block px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]">
            {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.phaseEditAction}
          </span>
        </button>
      ) : null}
      {formOpen ? (
        <form
          onSubmit={onSubmit}
          className="mt-2 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/80 p-3"
          data-testid={`umsetzungsplanung-phase-edit-form-${sprint.slug}`}
        >
          {error ? <ClubDevelopmentFormError message={error} /> : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Name</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
              {CD_SPRINT_WORKSPACE_COPY.phaseGoalLabel}
            </span>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              disabled={pending}
              placeholder={CD_SPRINT_WORKSPACE_COPY.goalPlaceholder}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Start</span>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                disabled={pending}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Ende</span>
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={pending}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
              onClick={() => {
                setFormOpen(false);
                setTitle(sprint.title);
                setGoal(sprint.goal ?? "");
                setStartsAt(toDateInputValue(sprint.startsAt));
                setEndsAt(toDateInputValue(sprint.endsAt));
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Speichern
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}