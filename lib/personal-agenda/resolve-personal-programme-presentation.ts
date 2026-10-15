import { resolveLegacySportingActivityPresentationFromSce } from "@/lib/sporting-activity-presentation/canonical/adapters/to-legacy-presentation";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import type { PersonalProgrammeItem } from "./personal-programme-types";

/**
 * Resolves the UX-01 presentation snapshot for a personal programme row.
 * Prefers embedded legacy presentation; otherwise rehydrates from the canonical SCE model.
 */
export function resolvePersonalProgrammeActivityPresentation(
  item: PersonalProgrammeItem,
): SportingActivityPresentation | undefined {
  if (item.activityPresentation) {
    return item.activityPresentation;
  }
  if (item.canonicalPresentation) {
    return resolveLegacySportingActivityPresentationFromSce(item.canonicalPresentation);
  }
  return undefined;
}
