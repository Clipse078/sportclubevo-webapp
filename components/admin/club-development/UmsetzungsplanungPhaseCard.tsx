import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import {
  CD_SPRINT_STATUS_LABELS,
  CD_SPRINT_WORKSPACE_COPY,
  CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import { SCE_CD_RECORD_ROW_CLASS } from "./sce-club-development-surface-styles";
import { SprintBoardQuickLink } from "./DevelopmentSprintList";
import UmsetzungsplanungPhaseAssignedTasksPanel from "./UmsetzungsplanungPhaseAssignedTasksPanel";

export type UmsetzungsplanungPhaseCardItem = {
  id: string;
  slug: string;
  title: string;
  goal: string | null;
  status: DevelopmentSprintStatus;
  owner: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(value),
  );
}

export default function UmsetzungsplanungPhaseCard({ sprint }: { sprint: UmsetzungsplanungPhaseCardItem }) {
  const planningLabel =
    sprint.status === "ACTIVE"
      ? CD_SPRINT_WORKSPACE_COPY.tabPlanning
      : CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.planningDetailLink;

  return (
    <div className={`flex flex-col gap-2 ${SCE_CD_RECORD_ROW_CLASS}`} data-testid={`umsetzungsplanung-phase-${sprint.slug}`}>
      <Link
        href={`/vereinsleitung/sprints/${sprint.slug}`}
        className="group flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--sce-primary)]">
            {sprint.title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {CD_SPRINT_STATUS_LABELS[sprint.status]} · {formatDate(sprint.startsAt)} – {formatDate(sprint.endsAt)}
            {sprint.owner ? ` · ${sprint.owner}` : ""}
          </p>
          {sprint.goal ? <p className="mt-1 line-clamp-1 text-xs text-[var(--text-2)]">{sprint.goal}</p> : null}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
      </Link>
      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-2">
        <Link
          href={`/vereinsleitung/sprints/${sprint.slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)]"
        >
          {planningLabel}
        </Link>
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
      <UmsetzungsplanungPhaseAssignedTasksPanel sprintId={sprint.id} sprintSlug={sprint.slug} />
    </div>
  );
}

export function UmsetzungsplanungPhaseList({ items }: { items: UmsetzungsplanungPhaseCardItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((sprint) => (
        <li key={sprint.id}>
          <UmsetzungsplanungPhaseCard sprint={sprint} />
        </li>
      ))}
    </ul>
  );
}