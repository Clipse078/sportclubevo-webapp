import { NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS } from "@/lib/permissions/planning-allocation-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { revalidatePlannerWeekPaths } from "@/lib/planning-hub/planner-week-revalidation";

export async function POST() {
  const auth = await requireApiAnyPermission([
    ...PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS,
    PERMISSIONS.TRAININGS_MANAGE,
  ]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  revalidatePlannerWeekPaths();
  return NextResponse.json({ ok: true });
}
