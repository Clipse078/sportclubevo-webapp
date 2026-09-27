import type { PlatformCommunicationPublicationSchedule, PrismaClient } from "@prisma/client";
import {
  COMM_PUBLICATION_SCHEDULE_DISPATCH_BATCH_SIZE,
  COMM_PUBLICATION_SCHEDULE_LEASE_MS,
} from "@/lib/communication/scheduling/publication-schedule-constants";

export async function claimDuePlatformCommunicationPublicationSchedules(
  client: PrismaClient,
  input?: { now?: Date; batchSize?: number; leaseMs?: number },
): Promise<PlatformCommunicationPublicationSchedule[]> {
  const now = input?.now ?? new Date();
  const batchSize = input?.batchSize ?? COMM_PUBLICATION_SCHEDULE_DISPATCH_BATCH_SIZE;
  const leaseMs = input?.leaseMs ?? COMM_PUBLICATION_SCHEDULE_LEASE_MS;
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  return client.$queryRaw<PlatformCommunicationPublicationSchedule[]>`
    WITH picked AS (
      SELECT s."id"
      FROM "PlatformCommunicationPublicationSchedule" s
      WHERE (
        s."status" = 'SCHEDULED'::"PlatformCommunicationPublicationScheduleStatus"
        AND s."scheduledAt" <= ${now}
      )
      OR (
        s."status" = 'PROCESSING'::"PlatformCommunicationPublicationScheduleStatus"
        AND s."leaseExpiresAt" IS NOT NULL
        AND s."leaseExpiresAt" < ${now}
      )
      ORDER BY s."scheduledAt" ASC, s."createdAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "PlatformCommunicationPublicationSchedule" AS s
    SET
      "status" = 'PROCESSING'::"PlatformCommunicationPublicationScheduleStatus",
      "claimedAt" = ${now},
      "leaseExpiresAt" = ${leaseExpiresAt},
      "attemptCount" = CASE
        WHEN s."status" = 'SCHEDULED'::"PlatformCommunicationPublicationScheduleStatus"
          THEN s."attemptCount" + 1
        ELSE s."attemptCount"
      END,
      "updatedAt" = ${now}
    FROM picked
    WHERE s."id" = picked."id"
    RETURNING s.*;
  `;
}
