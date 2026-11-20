import Link from "next/link";
import { Calendar, ChevronRight, ClipboardCheck, ExternalLink } from "lucide-react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import {
  CD_SPRINT_STATUS_LABELS,
  CD_SPRINT_WORKSPACE_COPY,
  CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import type { UmsetzungsplanungPhaseOption } from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import { SprintBoardQuickLink } from "./DevelopmentSprintList";
import DevelopmentSprintPhaseEditMenu from "./DevelopmentSprintPhaseEditMenu";
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
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--border)]/60 bg-[var(--surface)] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <Link
            href={`/vereinsleitung/sprints/${sprint.slug}`}
            className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]"
          >
            {sprint.title}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            <span>
              {formatDate(sprint.startsAt)} – {formatDate(sprint.endsAt)}
            </span>
            <span aria-hidden>·</span>
            <span>{CD_SPRINT_STATUS_LABELS[sprint.status]}</span>
            {sprint.owner ? (
              <>
                <span aria-hidden>·</span>
                <span>{sprint.owner}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DevelopmentSprintPhaseEditMenu
            sprint={{
              id: sprint.id,
              slug: sprint.slug,
              title: sprint.title,
              goal: sprint.goal,
              status: sprint.status,
              startsAt: sprint.startsAt,
              endsAt: sprint.endsAt,
            }}
            canManage={canManageSprints}
          />
          <Link
            href={`/vereinsleitung/sprints/${sprint.slug}/board`}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-95"
          >
            Board öffnen
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href={`/vereinsleitung/sprints/${sprint.slug}`}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--sce-primary)]"
          >
            {planningLabel}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-1">
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