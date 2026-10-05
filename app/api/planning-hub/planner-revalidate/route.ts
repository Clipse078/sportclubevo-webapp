import { NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS } from "@/lib/permissions/planning-allocation-permissions";
import { revalidatePlannerWeekPaths } from "@/lib/planning-hub/planner-week-revalidation";

export async function POST() {
  const auth = await requireApiAnyPermission([...PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  revalidatePlannerWeekPaths();
  return NextResponse.json({ ok: true });
}
