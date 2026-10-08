import "server-only";

import { revalidatePath } from "next/cache";
import { revalidatePlannerWeekPaths } from "@/lib/planning-hub/planner-week-revalidation";

/**
 * Canonical post-mutation invalidation after a successful facility or facility-resource write.
 * Call only after DB commit — never on validation failures or blocked deletes.
 */
export function revalidateAfterSuccessfulFacilityMutation(): void {
  revalidatePlannerWeekPaths();
  revalidatePath("/dashboard/admin/facilities");
}
