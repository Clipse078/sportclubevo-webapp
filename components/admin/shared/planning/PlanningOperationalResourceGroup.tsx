"use client";

/**
 * PLANNING-UX-07R4 — grouped bordered block for pitch + dressing-room assignment rows.
 */

import type { ReactNode } from "react";
import { PlanningResourceAssignmentList } from "@/components/admin/shared/planning/PlanningResourceAssignmentList";

export type PlanningOperationalResourceGroupProps = {
  children: ReactNode;
  testId?: string;
};

export function PlanningOperationalResourceGroup({
  children,
  testId = "planning-operational-resource-group",
}: PlanningOperationalResourceGroupProps) {
  return <PlanningResourceAssignmentList testId={testId}>{children}</PlanningResourceAssignmentList>;
}
