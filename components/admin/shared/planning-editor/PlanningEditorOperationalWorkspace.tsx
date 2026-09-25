import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  PLANNING_EDITOR_PRIMARY_COLUMN_CLASS,
  PLANNING_EDITOR_PRIMARY_WORKSPACE_GRID_CLASS,
  PLANNING_EDITOR_SECONDARY_COLUMN_CLASS,
} from "./planning-editor-layout";

type Props = {
  primary: ReactNode;
  secondaryRail?: ReactNode;
  testId?: string;
  className?: string;
};

/**
 * Primary operational editor + optional publication/status secondary column (desktop).
 * Stacks to one column on narrow viewports.
 */
export default function PlanningEditorOperationalWorkspace({
  primary,
  secondaryRail,
  testId = "planning-editor-operational-workspace",
  className,
}: Props) {
  if (!secondaryRail) {
    return (
      <div className={cn("min-w-0", className)} data-testid={testId}>
        {primary}
      </div>
    );
  }

  return (
    <div
      className={cn(PLANNING_EDITOR_PRIMARY_WORKSPACE_GRID_CLASS, className)}
      data-testid={testId}
    >
      <div className={PLANNING_EDITOR_PRIMARY_COLUMN_CLASS}>{primary}</div>
      <aside className={cn(PLANNING_EDITOR_SECONDARY_COLUMN_CLASS, "space-y-3 lg:sticky lg:top-4 lg:self-start")}>
        {secondaryRail}
      </aside>
    </div>
  );
}
