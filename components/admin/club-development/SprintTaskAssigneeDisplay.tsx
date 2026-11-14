"use client";

import type { SprintTaskAssigneeViewModel } from "@/lib/club-development/sprints/sprint-task-assignee";
import { cn } from "@/lib/cn";

type Props = {
  assignees: SprintTaskAssigneeViewModel[];
  className?: string;
  compact?: boolean;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

function AssigneeAvatar({
  assignee,
  sizeClass,
}: {
  assignee: SprintTaskAssigneeViewModel;
  sizeClass: string;
}) {
  if (assignee.imageUrl) {
    return (
      <img
        src={assignee.imageUrl}
        alt=""
        className={cn(sizeClass, "rounded-full border border-[var(--border)] object-cover")}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        sizeClass,
        "inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] font-semibold uppercase text-[var(--blue)]",
      )}
    >
      {initialsFromName(assignee.displayName)}
    </span>
  );
}

export default function SprintTaskAssigneeDisplay({ assignees, className, compact = false }: Props) {
  const avatarSize = compact ? "h-5 w-5 text-[0.5625rem]" : "h-6 w-6 text-[0.625rem]";
  const labelClass = compact ? "text-xs" : "text-xs";

  return (
    <div className={cn("min-w-0", className)} data-testid="sprint-task-assignees">
      <p className={cn(labelClass, "font-medium text-[var(--text-2)]")}>Verantwortlich</p>
      {assignees.length === 0 ? (
        <p className={cn(labelClass, "mt-1 text-[var(--muted)]")}>Nicht zugewiesen</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1.5">
          {assignees.map((assignee) => (
            <li key={assignee.userId} className="flex min-w-0 max-w-full items-center gap-1.5">
              <AssigneeAvatar assignee={assignee} sizeClass={avatarSize} />
              <span className={cn(labelClass, "min-w-0 text-[var(--text-2)]")}>{assignee.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}