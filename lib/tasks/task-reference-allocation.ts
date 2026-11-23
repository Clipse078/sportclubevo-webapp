import { SceTenantPublicRecordKind, type Prisma } from "@prisma/client";
import { allocateScePublicNumber } from "@/lib/club-development/sce-public-reference";
import {
  allocateTenantPublicNumber,
  registerTenantPublicNumberLedger,
} from "@/lib/tenant-public-reference/sce-tenant-public-number-allocation";

export type TaskReferenceAllocation = {
  scePublicNumber: bigint;
  tenantPublicNumber: bigint | null;
};

export async function allocateTaskReferenceFields(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<TaskReferenceAllocation> {
  const scePublicNumber = await allocateScePublicNumber(tx);
  const tenant = await allocateTenantPublicNumber(tx, tenantId);
  return {
    scePublicNumber,
    tenantPublicNumber: tenant?.tenantPublicNumber ?? null,
  };
}

export async function linkTaskTenantPublicReference(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    taskId: string;
    tenantPublicNumber: bigint;
  },
): Promise<void> {
  await registerTenantPublicNumberLedger(tx, {
    tenantId: input.tenantId,
    tenantPublicNumber: input.tenantPublicNumber,
    recordKind: SceTenantPublicRecordKind.TASK,
    entityId: input.taskId,
  });
}