import {
  SceTenantPublicRecordKind,
  type Prisma,
} from "@prisma/client";

const SEQUENCE_INCREMENT_ONE = BigInt(2);

export type TenantPublicNumberAllocation = {
  tenantPublicNumber: bigint;
};

/**
 * Reserves the next tenant-wide public number (one sequence per tenant, all record kinds).
 * Caller must persist `tenantPublicNumber` on the entity and call `registerTenantPublicNumberLedger`.
 */
export async function allocateTenantPublicNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<TenantPublicNumberAllocation | null> {
  const tenant = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: { publicReferenceShortCode: true },
  });
  if (!tenant?.publicReferenceShortCode) return null;

  const seq = await tx.sceTenantPublicNumberSequence.upsert({
    where: { tenantId },
    create: { tenantId, nextNumber: SEQUENCE_INCREMENT_ONE },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });

  const tenantPublicNumber =
    seq.nextNumber === SEQUENCE_INCREMENT_ONE
      ? BigInt(1)
      : seq.nextNumber - BigInt(1);

  return { tenantPublicNumber };
}

export async function registerTenantPublicNumberLedger(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    tenantPublicNumber: bigint;
    recordKind: SceTenantPublicRecordKind;
    entityId: string;
  },
): Promise<void> {
  await tx.sceTenantPublicNumberLedger.create({
    data: {
      tenantId: input.tenantId,
      tenantPublicNumber: input.tenantPublicNumber,
      recordKind: input.recordKind,
      entityId: input.entityId,
    },
  });
}