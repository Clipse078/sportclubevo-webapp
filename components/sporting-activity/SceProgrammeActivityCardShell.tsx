"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  sceProgrammeActivityCardShellClass,
  type SceProgrammeActivityShellDensity,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-programme-shell";

export type SceProgrammeActivityCardShellProps = {
  density?: SceProgrammeActivityShellDensity;
  children: ReactNode;
  className?: string;
  testId?: string;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">;

/**
 * Canonical programme-list card surface — SCE activity card family (Resultate-aligned).
 * Wraps Sce* list-row compositions; does not replace purpose-built internal layouts.
 */
export function SceProgrammeActivityCardShell({
  density = "STANDARD",
  children,
  className,
  testId = "sce-programme-activity-card-shell",
  ...rest
}: SceProgrammeActivityCardShellProps) {
  return (
    <div
      {...rest}
      className={cn(sceProgrammeActivityCardShellClass(density), className)}
      data-testid={testId}
      data-sce-programme-activity-card-shell
      data-sce-programme-shell-density={density}
    >
      {children}
    </div>
  );
}
