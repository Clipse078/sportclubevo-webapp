import { prisma } from "@/lib/db/prisma";
import { loadPersonalProgramme } from "@/lib/personal-agenda/load-personal-programme";
import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { loadDashboardPersonalWork } from "@/lib/dashboard/personal-attention";
import {
  resolvePersonalParticipationNavCapability,
  resolvePersonalRequirementNavCapability,
} from "@/lib/personal-actions/access";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import {
  resolvePersonalProgrammeMonthGridRange,
} from "@/lib/calendar/month-grid";
import { formatMonthParam } from "@/lib/personal-agenda/calendar-range";
import { resolvePersonalProgrammeRange } from "@/lib/personal-agenda/programme-range";
import type { PersonalDashboardReadModelPayloadV1 } from "./types";
import {
  encodePersonalDashboardReadModelPayload,
  parsePersonalDashboardReadModelPayload,
} from "./payload-codec";
import { PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION } from "./constants";

export type RebuildPersonalDashboardReadModelInput = {
  tenantId: string;
  userId: string;
  fmtCfg?: TenantFormatConfig;
  now?: Date;
  calendarMonthParam?: string | null;
};

function mergeProgrammeRanges(
  a: { rangeStart: Date; rangeEnd: Date },
  b: { rangeStart: Date; rangeEnd: Date },
): { rangeStart: Date; rangeEnd: Date } {
  return {
    rangeStart:
      a.rangeStart.getTime() <= b.rangeStart.getTime() ? a.rangeStart : b.rangeStart,
    rangeEnd: a.rangeEnd.getTime() >= b.rangeEnd.getTime() ? a.rangeEnd : b.rangeEnd,
  };
}

export async function buildPersonalDashboardReadModelPayload(
  input: RebuildPersonalDashboardReadModelInput,
): Promise<PersonalDashboardReadModelPayloadV1> {
  const now = input.now ?? new Date();
  const timeZone = input.fmtCfg?.timezone ?? "Europe/Zurich";
  const locale = input.fmtCfg?.locale ?? "de-CH";
  const fmtCfg: TenantFormatConfig = input.fmtCfg ?? { locale, timezone: timeZone };

  const permissions = await getRequestEffectivePermissions(input.userId, input.tenantId);
  const permissionKeys = [...permissions.platform, ...permissions.tenant] as PermissionKey[];

  const feedRange = resolvePersonalProgrammeRange({ timeZone, now });
  const monthGrid = resolvePersonalProgrammeMonthGridRange({
    monthParam: input.calendarMonthParam ?? formatMonthParam(now),
    timeZone,
    now,
  });
  const queryRange = mergeProgrammeRanges(feedRange, {
    rangeStart: monthGrid.rangeStart,
    rangeEnd: monthGrid.rangeEnd,
  });

  const personalContextPromise = resolvePersonalContext({
    tenantId: input.tenantId,
    userId: input.userId,
  });

  const [programme, personalWork, participationNavCapable, requirementRecipientCapable, person, personalContext] =
    await Promise.all([
      personalContextPromise.then((personalContext) =>
        loadPersonalProgramme({
          tenantId: input.tenantId,
          userId: input.userId,
          timeZone,
          now,
          from: queryRange.rangeStart,
          to: queryRange.rangeEnd,
          permissionKeys,
          personalContext,
        }),
      ),
      loadDashboardPersonalWork({
        tenantId: input.tenantId,
        userId: input.userId,
        fmtCfg,
        locale,
        timeZone,
        now,
        permissionKeys,
      }),
      resolvePersonalParticipationNavCapability({
        tenantId: input.tenantId,
        userId: input.userId,
      }),
      resolvePersonalRequirementNavCapability({
        tenantId: input.tenantId,
        userId: input.userId,
      }),
      prisma.person.findFirst({
        where: { tenantId: input.tenantId, userId: input.userId },
        select: { id: true },
      }),
      personalContextPromise,
    ]);

  return {
    v: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
    scopeHints: {
      participationNavCapable,
      requirementRecipientCapable,
      hasLinkedPerson: person != null,
      hasActiveTenantMembership: personalContext.hasActiveTenantMembership,
    },
    programme: {
      supported: programme.supported,
      items: programme.items,
    },
    personalWork: {
      attentionItems: personalWork.attention.items,
      attentionTotalCount: personalWork.attention.totalCount,
      viewAllHref: personalWork.attention.viewAllHref,
      operationalSourcesDegraded:
        personalWork.attention.operationalSourcesDegraded ?? false,
      taskCount: personalWork.tasks.count,
      taskPreview: personalWork.tasks.preview,
    },
  };
}

export async function rebuildPersonalDashboardReadModel(
  input: RebuildPersonalDashboardReadModelInput,
): Promise<{ id: string; rebuilt: boolean }> {
  const payload = await buildPersonalDashboardReadModelPayload(input);
  const now = input.now ?? new Date();
  const timeZone = input.fmtCfg?.timezone ?? "Europe/Zurich";
  const feedRange = resolvePersonalProgrammeRange({ timeZone, now });
  const monthGrid = resolvePersonalProgrammeMonthGridRange({
    monthParam: input.calendarMonthParam ?? formatMonthParam(now),
    timeZone,
    now,
  });
  const horizon = mergeProgrammeRanges(feedRange, {
    rangeStart: monthGrid.rangeStart,
    rangeEnd: monthGrid.rangeEnd,
  });

  const person = await prisma.person.findFirst({
    where: { tenantId: input.tenantId, userId: input.userId },
    select: { id: true },
  });

  const encoded = encodePersonalDashboardReadModelPayload(payload);
  const parsed = parsePersonalDashboardReadModelPayload(encoded);
  if (!parsed) {
    throw new Error("Personal dashboard payload encoding failed");
  }

  const row = await prisma.personalDashboardReadModel.upsert({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: input.userId,
      },
    },
    create: {
      tenantId: input.tenantId,
      userId: input.userId,
      personId: person?.id ?? null,
      projectionVersion: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
      payloadJson: encoded as object,
      horizonStart: horizon.rangeStart,
      horizonEnd: horizon.rangeEnd,
    },
    update: {
      personId: person?.id ?? null,
      projectionVersion: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
      payloadJson: encoded as object,
      horizonStart: horizon.rangeStart,
      horizonEnd: horizon.rangeEnd,
      builtAt: now,
    },
    select: { id: true },
  });

  return { id: row.id, rebuilt: true };
}
