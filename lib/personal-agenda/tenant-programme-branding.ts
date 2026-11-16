import { prisma } from "@/lib/db/prisma";
import { buildClubIdentity, type ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";
import {
  isSceMeetingPresentationModel,
  type SceMeetingPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import type { PersonalProgrammeItem } from "./personal-programme-types";

export type TenantProgrammeBranding = {
  displayName: string;
  logoUrl: string | null;
};

export function buildTenantProgrammeClubIdentity(branding: TenantProgrammeBranding): ClubIdentity {
  return buildClubIdentity({
    displayName: branding.displayName,
    logoUrl: branding.logoUrl,
  });
}

export async function loadTenantProgrammeBranding(tenantId: string): Promise<TenantProgrammeBranding> {
  const [tenant, logoUrl] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
    getTenantClubCrestUrlCached(tenantId),
  ]);
  return {
    displayName: tenant?.name?.trim() || "Verein",
    logoUrl: logoUrl ?? null,
  };
}

export function meetingPresentationNeedsTenantClub(model: SceMeetingPresentationModel): boolean {
  return !model.tenantClub?.displayName?.trim();
}

export function personalProgrammeMeetingItemMissingTenantBranding(item: PersonalProgrammeItem): boolean {
  if (item.sourceType !== "MEETING") return false;
  const presentation = item.canonicalPresentation;
  if (!presentation || !isSceMeetingPresentationModel(presentation)) return false;
  return meetingPresentationNeedsTenantClub(presentation);
}

function attachTenantClubToMeetingPresentation(
  model: SceMeetingPresentationModel,
  branding: TenantProgrammeBranding,
): SceMeetingPresentationModel {
  if (!meetingPresentationNeedsTenantClub(model)) {
    return model;
  }
  const tenantClub = buildTenantProgrammeClubIdentity(branding);
  return {
    ...model,
    tenantClub: {
      ...tenantClub,
      logoUrl: model.tenantClub?.logoUrl?.trim() ? model.tenantClub.logoUrl : tenantClub.logoUrl,
    },
  };
}

/**
 * Ensures dashboard/calendar meeting cards always carry the authorised tenant club identity.
 * Safe on cached read-model rows that predate meeting tenantClub wiring.
 */
export function enrichPersonalProgrammeItemsTenantBranding(
  items: readonly PersonalProgrammeItem[],
  branding: TenantProgrammeBranding,
): PersonalProgrammeItem[] {
  return items.map((item) => {
    if (item.sourceType !== "MEETING" || !item.canonicalPresentation) {
      return item;
    }
    if (!isSceMeetingPresentationModel(item.canonicalPresentation)) {
      return item;
    }
    const nextPresentation = attachTenantClubToMeetingPresentation(
      item.canonicalPresentation,
      branding,
    );
    if (nextPresentation === item.canonicalPresentation) {
      return item;
    }
    return {
      ...item,
      canonicalPresentation: nextPresentation,
    };
  });
}