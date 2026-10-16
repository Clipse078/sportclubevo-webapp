import { buildClubIdentity } from "@/lib/sporting-activity-design";
import type { ClubIdentity } from "@/lib/sporting-activity-design";
import { resolveTenantClubCrestUrl } from "@/lib/sporting-data/sce-club-crest-resolution";
import type { SceClubEventPresentationModel } from "./types";

export type SceClubEventTenantIdentityInput = {
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
};

/**
 * Tenant-owned Club Events carry the tenant club as primary visual ownership identity.
 * Audience (teams, org units, club-wide) is separate and must not drive crest selection.
 */
export function attachSceClubEventTenantClubIdentity(
  presentation: SceClubEventPresentationModel,
  input: SceClubEventTenantIdentityInput,
): SceClubEventPresentationModel {
  const displayName = input.tenantClubName?.trim();
  if (!displayName) return presentation;
  return {
    ...presentation,
    tenantClub: buildClubIdentity({
      displayName,
      logoUrl: resolveTenantClubCrestUrl({ tenantLogoUrl: input.tenantLogoUrl }),
    }),
  };
}

/**
 * Primary crest for Club Event cards and programme rows: tenant club first, optional
 * external organiser crest when tenant identity is absent.
 */
export function resolveSceClubEventPrimaryVisualIdentity(
  model: SceClubEventPresentationModel,
): ClubIdentity | undefined {
  const tenant = model.tenantClub;
  const organiser = model.organiser;
  if (tenant?.logoUrl?.trim()) return tenant;
  if (organiser?.logoUrl?.trim()) return organiser;
  if (tenant?.displayName?.trim()) return tenant;
  return organiser;
}

export function sceClubEventPrimaryVisualIdentityHasLogo(
  model: SceClubEventPresentationModel,
): boolean {
  return Boolean(resolveSceClubEventPrimaryVisualIdentity(model)?.logoUrl?.trim());
}
