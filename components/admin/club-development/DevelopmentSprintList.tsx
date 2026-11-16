import Link from "next/link";
import { ChevronRight, ClipboardCheck, Kanban } from "lucide-react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import { CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import { SCE_CD_RECORD_ROW_CLASS } from "./sce-club-development-surface-styles";

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
      <SceClubDevelopmentEmptyState message="Noch keine Umsetzungsphasen — legen Sie oben die erste Umsetzungsphase an." />
    );
  }

  return (
    <ul className="space-y-3" data-testid="development-sprint-list">
      {sprints.map((sprint) => (
        <li key={sprint.id}>
          <div className={`flex flex-col gap-2 ${SCE_CD_RECORD_ROW_CLASS} hover:border-[var(--sce-primary)]/40`}>
            <Link
              href={`/vereinsleitung/sprints/${sprint.slug}`}
              className="group flex items-center justify-between gap-3"
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
            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-2">
              <SprintBoardQuickLink slug={sprint.slug} />
              {sprint.status === "COMPLETED" || sprint.status === "ACTIVE" ? (
                <Link
                  href={`/vereinsleitung/sprints/${sprint.slug}/rueckblick`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)]"
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden />
                  {CD_SPRINT_WORKSPACE_COPY.reviewQuickLink}
                </Link>
              ) : null}
            </div>
          </div>
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
      {CD_SPRINT_WORKSPACE_COPY.boardQuickLink}
    </Link>
  );
}
