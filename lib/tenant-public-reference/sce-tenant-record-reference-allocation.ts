import { SceTenantPublicRecordKind, type Prisma } from "@prisma/client";
import { allocateScePublicNumber } from "@/lib/club-development/sce-public-reference";
import {
  allocateTenantPublicNumber,
  registerTenantPublicNumberLedger,
} from "./sce-tenant-public-number-allocation";

export type SceRecordReferenceAllocation = {
  scePublicNumber: bigint;
  tenantPublicNumber: bigint | null;
};

/** Reserve SCE + optional tenant-wide numbers for any supported record kind. */
export async function allocateSceRecordReferenceFields(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<SceRecordReferenceAllocation> {
  const scePublicNumber = await allocateScePublicNumber(tx);
  const tenant = await allocateTenantPublicNumber(tx, tenantId);
  return {
    scePublicNumber,
    tenantPublicNumber: tenant?.tenantPublicNumber ?? null,
  };
}

export async function linkTenantRecordPublicReference(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    recordKind: SceTenantPublicRecordKind;
    entityId: string;
    tenantPublicNumber: bigint;
  },
): Promise<void> {
  await registerTenantPublicNumberLedger(tx, {
    tenantId: input.tenantId,
    tenantPublicNumber: input.tenantPublicNumber,
    recordKind: input.recordKind,
    entityId: input.entityId,
  });
}