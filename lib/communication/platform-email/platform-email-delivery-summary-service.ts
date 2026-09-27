import { PlatformCommunicationEmailDeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type PlatformEmailDeliverySummary = {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  skipped: number;
};

export async function summarizePlatformEmailDeliveries(input: {
  tenantId: string;
  communicationId: string;
}): Promise<PlatformEmailDeliverySummary> {
  const rows = await prisma.platformCommunicationEmailDeliveryAttempt.groupBy({
    by: ["status"],
    where: {
      tenantId: input.tenantId,
      communicationId: input.communicationId,
    },
    _count: { _all: true },
  });

  const summary: PlatformEmailDeliverySummary = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of rows) {
    const count = row._count._all;
    switch (row.status) {
      case PlatformCommunicationEmailDeliveryStatus.PENDING:
        summary.pending = count;
        break;
      case PlatformCommunicationEmailDeliveryStatus.PROCESSING:
        summary.processing = count;
        break;
      case PlatformCommunicationEmailDeliveryStatus.SENT:
        summary.sent = count;
        break;
      case PlatformCommunicationEmailDeliveryStatus.FAILED:
        summary.failed = count;
        break;
      case PlatformCommunicationEmailDeliveryStatus.SKIPPED:
        summary.skipped = count;
        break;
      default:
        break;
    }
  }

  return summary;
}
