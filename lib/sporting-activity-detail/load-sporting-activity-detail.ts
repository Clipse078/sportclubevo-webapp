import "server-only";

import { prisma } from "@/lib/db/prisma";
import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { loadMatchActivityDetail, loadTournamentActivityDetail } from "./load-event-detail";
import { loadTrainingActivityDetail } from "./load-training-detail";
import type { LoadSportingActivityDetailResult } from "./types";

export type SportingActivityDetailRef =
  | { kind: "training-session"; sessionId: string }
  | { kind: "event"; eventId: string };

export async function loadSportingActivityDetail(input: {
  tenantId: string;
  userId: string;
  permissionKeys: string[];
  ref: SportingActivityDetailRef;
}): Promise<LoadSportingActivityDetailResult> {
  const [personal, tenant] = await Promise.all([
    resolvePersonalContext({ tenantId: input.tenantId, userId: input.userId }),
    prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { name: true, logoUrl: true },
    }),
  ]);

  const tenantClubName = tenant?.name?.trim() || "Verein";
  const tenantLogoUrl = tenant?.logoUrl ?? null;
  const personId = personal.personId;

  if (input.ref.kind === "training-session") {
    return loadTrainingActivityDetail({
      tenantId: input.tenantId,
      userId: input.userId,
      personId,
      permissionKeys: input.permissionKeys,
      personal,
      sessionId: input.ref.sessionId,
      tenantClubName,
      tenantLogoUrl,
    });
  }

  const eventType = await prisma.event.findFirst({
    where: { id: input.ref.eventId, tenantId: input.tenantId },
    select: { type: true },
  });

  if (!eventType) {
    return { ok: false, reason: "not_found" };
  }

  if (eventType.type === "MATCH") {
    return loadMatchActivityDetail({
      tenantId: input.tenantId,
      userId: input.userId,
      personId,
      permissionKeys: input.permissionKeys,
      personal,
      eventId: input.ref.eventId,
      tenantClubName,
      tenantLogoUrl,
    });
  }

  if (eventType.type === "TOURNAMENT") {
    return loadTournamentActivityDetail({
      tenantId: input.tenantId,
      userId: input.userId,
      personId,
      permissionKeys: input.permissionKeys,
      personal,
      eventId: input.ref.eventId,
      tenantClubName,
      tenantLogoUrl,
    });
  }

  return { ok: false, reason: "not_found" };
}
