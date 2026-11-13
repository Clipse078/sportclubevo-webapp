import Link from "next/link";
import { ChevronRight, Kanban } from "lucide-react";
import type { DevelopmentSprintStatus } from "@prisma/client";

export type DevelopmentSprintListItem = {
  id: string;
  slug: string;
  title: string;
  goal: string | null;
  status: DevelopmentSprintStatus;
  owner: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

const STATUS_LABELS: Record<DevelopmentSprintStatus, string> = {
  PLANNED: "Geplant",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(value),
  );
}

type Props = {
  sprints: DevelopmentSprintListItem[];
};

export default function DevelopmentSprintList({ sprints }: Props) {
  if (sprints.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-10 text-center text-sm text-[var(--muted)]">
        Noch keine Entwicklungssprints erfasst.
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-testid="development-sprint-list">
      {sprints.map((sprint) => (
        <li key={sprint.id}>
          <Link
            href={`/vereinsleitung/sprints/${sprint.slug}`}
            className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:border-[var(--sce-primary)]/40"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--sce-primary)]">
                {sprint.title}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {STATUS_LABELS[sprint.status]} · {formatDate(sprint.startsAt)} – {formatDate(sprint.endsAt)}
                {sprint.owner ? ` · ${sprint.owner}` : ""}
              </p>
              {sprint.goal ? <p className="mt-1 text-xs text-[var(--text-2)] line-clamp-1">{sprint.goal}</p> : null}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SprintBoardQuickLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/vereinsleitung/sprints/${slug}/board`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)]"
    >
      <Kanban className="h-4 w-4" />
      Zum Board
    </Link>
  );
}
