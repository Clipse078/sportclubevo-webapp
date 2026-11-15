import Link from "next/link";
import type { ReactNode } from "react";
import type { TaskWorkspaceAssociations } from "@/lib/tasks/task-workspace-associations";
import {
  CD_SPRINT_STATUS_LABELS,
  CD_TASK_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import { Badge } from "@/components/ui";

type Props = {
  associations: TaskWorkspaceAssociations;
};

function AssociationBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
  <section className="rounded-lg border border-[var(--border)]/70 px-3 py-2.5">
    <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
      {label}
    </p>
    <div className="mt-1.5 space-y-1 text-sm text-[var(--text-2)]">{children}</div>
  </section>
  );
}

export function TaskWorkspaceAssociationsSection({ associations }: Props) {
  const { primaryInitiative, currentSprints, sprintHistory } = associations;
  const hasContent =
    Boolean(primaryInitiative) || currentSprints.length > 0 || sprintHistory.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="task-workspace-associations">
      {primaryInitiative ? (
        <AssociationBlock label={CD_TASK_WORKSPACE_COPY.primaryInitiative}>
          <Link href={primaryInitiative.href} className="sce-link-primary font-medium">
            {primaryInitiative.title}
          </Link>
        </AssociationBlock>
      ) : null}

      {currentSprints.length > 0 ? (
        <AssociationBlock label={CD_TASK_WORKSPACE_COPY.assignedImplementationPhase}>
          <ul className="space-y-2">
            {currentSprints.map((sprint) => (
              <li key={sprint.sprintId} className="flex flex-wrap items-center gap-2">
                <Link href={sprint.href} className="sce-link-primary font-medium">
                  {sprint.title}
                </Link>
                <Badge variant={sprint.status === "ACTIVE" ? "success" : "info"}>
                  {CD_SPRINT_STATUS_LABELS[sprint.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </AssociationBlock>
      ) : null}

      {sprintHistory.length > 0 ? (
        <AssociationBlock label={CD_TASK_WORKSPACE_COPY.priorImplementationPhases}>
          <ul className="space-y-1">
            {sprintHistory.map((sprint) => (
              <li key={`${sprint.sprintId}-${sprint.removedAt}`}>
                <Link href={sprint.href} className="text-[var(--text-2)] hover:text-[var(--sce-primary)]">
                  {sprint.title}
                </Link>
              </li>
            ))}
          </ul>
        </AssociationBlock>
      ) : null}
    </div>
  );
}