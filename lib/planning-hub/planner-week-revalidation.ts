import "server-only";

import { revalidatePath } from "next/cache";

/** Invalidate cached Wochenplaner week read models after canonical planning mutations. */
export function revalidatePlannerWeekPaths(): void {
  revalidatePath("/dashboard/planner/week");
  revalidatePath("/dashboard/planner/day");
}
