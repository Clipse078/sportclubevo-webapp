import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PLANNING_EDITOR_MAX_WIDTH_CLASS } from "./planning-editor-layout";

type Props = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

export default function PlanningEditorShell({ children, className, testId }: Props) {
  return (
    <div
      className={cn(PLANNING_EDITOR_MAX_WIDTH_CLASS, "min-w-0 space-y-3 pb-6", className)}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
