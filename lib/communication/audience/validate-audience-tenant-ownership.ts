/**
 * SCE-COMM-EVO-03 — tenant ownership checks for audience specs (shared by composers).
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  assertTenantOwnedStructuralSelectors,
  assertTenantOwnedTargetGroupIds,
} from "@/lib/communication/club/club-audience-spec";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";
import { assertTenantOwnedSponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-ownership";

export async function validateAudienceTenantOwnership(input: {
  tenantId: string;
  audience: CommunicationAudienceSpec;
}): Promise<void> {
  for (const component of input.audience.components) {
    if (component.savedTargetGroupIds?.length) {
      await assertTenantOwnedTargetGroupIds({
        tenantId: input.tenantId,
        targetGroupIds: component.savedTargetGroupIds,
      });
    }
    if (component.structural) {
      await assertTenantOwnedStructuralSelectors({
        tenantId: input.tenantId,
        selectors: component.structural,
      });
    }
    if (component.sponsor && !sponsorSelectorsAreEmpty(component.sponsor)) {
      await assertTenantOwnedSponsorAudienceSelectors({
        tenantId: input.tenantId,
        selectors: component.sponsor,
      });
    }
  }
}
