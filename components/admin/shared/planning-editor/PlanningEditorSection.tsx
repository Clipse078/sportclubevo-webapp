import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  PLANNING_EDITOR_SECTION_PADDING_CLASS,
  PLANNING_EDITOR_SURFACE_CLASS,
} from "./planning-editor-layout";

type Props = {
  children: ReactNode;
  className?: string;
  testId?: string;
  ariaLabelledBy?: string;
  padding?: boolean;
};

export default function PlanningEditorSection({
  children,
  className,
  testId,
  ariaLabelledBy,
  padding = true,
}: Props) {
  return (
    <section
      className={cn(PLANNING_EDITOR_SURFACE_CLASS, "min-w-0 self-start", className)}
      data-testid={testId}
      aria-labelledby={ariaLabelledBy}
    >
      {padding ? (
        <div className={PLANNING_EDITOR_SECTION_PADDING_CLASS}>{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
