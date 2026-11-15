import "server-only";

import {
  computeInitiativeProgressSnapshot,
} from "@/lib/club-development/initiative-progress";
import { initiativeDeliveryProgressPercentFromSnapshot } from "@/lib/club-development/initiative-delivery-progress-presentation";

/** Max root Aufgaben shown in expanded Vorhaben cards (full dataset still used for progress). */
export const VORHABEN_WORKSPACE_ROOT_TASK_DISPLAY_LIMIT = 40;

export { initiativeDeliveryProgressPercentFromSnapshot };

export async function loadInitiativeDeliveryProgressPercentByIds(
  tenantId: string,
  initiativeIds: readonly string[],
): Promise<Map<string, number>> {
  const unique = [...new Set(initiativeIds)];
  const pairs = await Promise.all(
    unique.map(async (id) => {
      const snapshot = await computeInitiativeProgressSnapshot(tenantId, id);
      return [id, initiativeDeliveryProgressPercentFromSnapshot(snapshot)] as const;
    }),
  );
  return new Map(pairs);
}