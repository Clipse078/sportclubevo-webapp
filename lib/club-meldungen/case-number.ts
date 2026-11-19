import type { Prisma } from "@prisma/client";

import { calendarYearInTenantTimezone } from "@/lib/events/tenant-local-datetime";

export function formatClubMeldungCaseNumber(year: number, sequenceNumber: number): string {
  return `M-${year}-${String(sequenceNumber).padStart(6, "0")}`;
}

export type AllocateClubMeldungCaseNumberInput = {
  /**
   * Creation instant for the year prefix (default: now).
   * The stored `caseNumber` is fixed at allocation; it is never rewritten.
   */
  createdAt?: Date;
};

export async function allocateClubMeldungCaseNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input?: AllocateClubMeldungCaseNumberInput,
): Promise<string> {
  const createdAt = input?.createdAt ?? new Date();

  const tenant = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  if (!tenant) {
    throw new Error(`Unknown tenant for case number allocation: ${tenantId}`);
  }

  const year = calendarYearInTenantTimezone(createdAt, tenant.timezone);

  const seq = await tx.clubMeldungNumberSequence.upsert({
    where: { tenantId },
    create: { tenantId, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  const assigned = seq.nextNumber === 2 ? 1 : seq.nextNumber - 1;
  return formatClubMeldungCaseNumber(year, assigned);
}