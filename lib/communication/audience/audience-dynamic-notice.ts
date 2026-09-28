import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

/** True when membership may change between preview and dispatch (COMM-16). */
export function audienceSpecIsDynamicAtDispatch(audience: CommunicationAudienceSpec): boolean {
  for (const component of audience.components) {
    if (component.structural?.wholeOrganisation) return true;
    if ((component.savedTargetGroupIds?.length ?? 0) > 0) return true;
    if (component.dynamicRule != null) return true;
    if (component.structural) {
      const s = component.structural;
      if (
        (s.orgUnitIds?.length ?? 0) > 0 ||
        (s.teamIds?.length ?? 0) > 0 ||
        (s.roleIds?.length ?? 0) > 0 ||
        (s.roleKeys?.length ?? 0) > 0
      ) {
        return true;
      }
    }
  }
  return false;
}

export const DYNAMIC_AUDIENCE_NOTICE_DE =
  "Die Empfänger werden beim Versand anhand der aktuellen Mitgliedschaften ermittelt.";
