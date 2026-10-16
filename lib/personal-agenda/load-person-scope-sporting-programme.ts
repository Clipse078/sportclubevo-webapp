import type { PersonalContext } from "@/lib/dashboard/personal-context/types";
import { prisma } from "@/lib/db/prisma";
import { queryProgramme } from "@/lib/programme-engine/query-programme";
import { buildPersonProgrammeScope } from "@/lib/programme-engine/person-programme-scope";
import { programmeItemsToPersonalProgrammeItems } from "@/lib/programme-engine/programme-item-personal-adapter";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";
import type { PersonalProgrammeItem } from "./personal-programme-types";

export type LoadPersonScopeSportingProgrammeArgs = {
  tenantId: string;
  userId: string;
  personalContext: PersonalContext;
  timeZone: string;
  rangeStart: Date;
  rangeEnd: Date;
  permissionKeys: string[];
  now?: Date;
};

/**
 * Canonical PERSON-scope sporting programme rows from the Programme Engine.
 * Shared by Dashboard, Mein Programm, Mein Kalender, and personal agenda loaders (01J-R1).
 * Does not include meetings — callers merge `loadMeetingProgrammeItems` when needed.
 */
export async function loadPersonScopeSportingProgrammeItems(
  args: LoadPersonScopeSportingProgrammeArgs,
): Promise<PersonalProgrammeItem[]> {
  const [tenant, tenantLogoUrl] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: args.tenantId },
      select: { name: true },
    }),
    getTenantClubCrestUrlCached(args.tenantId),
  ]);

  const result = await queryProgramme({
    tenantId: args.tenantId,
    userId: args.userId,
    timeZone: args.timeZone,
    now: args.now,
    from: args.rangeStart,
    to: args.rangeEnd,
    permissionKeys: args.permissionKeys,
    tenantClubName: tenant?.name ?? null,
    tenantLogoUrl,
    scope: buildPersonProgrammeScope(args.personalContext),
  });

  return programmeItemsToPersonalProgrammeItems(result.items, args.personalContext);
}
