import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import {
  CD_SPRINT_STATUS_LABELS,
  CD_SPRINT_WORKSPACE_COPY,
  CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import type { UmsetzungsplanungPhaseOption } from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
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

type PhaseCardProps = {
  sprint: UmsetzungsplanungPhaseCardItem;
  canManageSprints: boolean;
  phaseOptions: UmsetzungsplanungPhaseOption[];
  readOnlyTasks?: boolean;
};

export default function UmsetzungsplanungPhaseCard({
  sprint,
  canManageSprints,
  phaseOptions,
  readOnlyTasks = false,
}: PhaseCardProps) {
  const planningLabel =
    sprint.status === "ACTIVE"
      ? CD_SPRINT_WORKSPACE_COPY.tabPlanning
      : CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.planningDetailLink;
  const allowTaskMoves = canManageSprints && !readOnlyTasks && sprint.status !== "COMPLETED";
  const moveTargets = phaseOptions.filter((p) => p.id !== sprint.id);

  return (
    <article
      className="space-y-2 border-b border-[var(--border)]/60 pb-3 last:border-b-0 last:pb-0"
      data-testid={`umsetzungsplanung-phase-${sprint.slug}`}
    >
      <Link
        href={`/vereinsleitung/sprints/${sprint.slug}`}
        className="group flex items-center justify-between gap-3 rounded-md px-1 py-1 transition hover:bg-[var(--surface-2)]/60"
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
      <div className="flex flex-wrap gap-2 px-1">
        <Link
          href={`/vereinsleitung/sprints/${sprint.slug}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)]/80 bg-[var(--surface-2)]/80 px-2.5 py-1.5 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)]"
        >
          {planningLabel}
        </Link>
        <SprintBoardQuickLink slug={sprint.slug} />
        {sprint.status === "COMPLETED" || sprint.status === "ACTIVE" ? (
          <Link
            href={`/vereinsleitung/sprints/${sprint.slug}/rueckblick`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)]/80 bg-[var(--surface-2)]/80 px-2.5 py-1.5 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)]"
          >
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
            {CD_SPRINT_WORKSPACE_COPY.reviewQuickLink}
          </Link>
        ) : null}
      </div>
      <UmsetzungsplanungPhaseAssignedTasksPanel
        sprintId={sprint.id}
        sprintSlug={sprint.slug}
        sprintStatus={sprint.status}
        canManageAssignments={allowTaskMoves}
        moveTargetPhases={moveTargets}
        defaultExpanded={sprint.status === "ACTIVE" || sprint.status === "PLANNED"}
      />
    </article>
  );
}

export function UmsetzungsplanungPhaseList({
  items,
  canManageSprints,
  phaseOptions,
  readOnlyTasks,
}: {
  items: UmsetzungsplanungPhaseCardItem[];
  canManageSprints: boolean;
  phaseOptions: UmsetzungsplanungPhaseOption[];
  readOnlyTasks?: boolean;
}) {
  return (
    <ul className="space-y-0">
      {items.map((sprint) => (
        <li key={sprint.id}>
          <UmsetzungsplanungPhaseCard
            sprint={sprint}
            canManageSprints={canManageSprints}
            phaseOptions={phaseOptions}
            readOnlyTasks={readOnlyTasks}
          />
        </li>
      ))}
    </ul>
  );
}