import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SCE_WORKSPACE_SURFACE_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";

type Props = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

/** SCE-UI-STANDARD-01 — primary bounded workspace surface inside an activity tab. */
export function SceWorkspaceSurface({ children, className, testId }: Props) {
  return (
    <div className={cn(SCE_WORKSPACE_SURFACE_CLASS, className)} data-testid={testId}>
      {children}
    </div>
  );
}
