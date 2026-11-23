import { SceTenantPublicRecordKind, type Prisma } from "@prisma/client";
import {
  allocateSceRecordReferenceFields,
  linkTenantRecordPublicReference,
  type SceRecordReferenceAllocation,
} from "@/lib/tenant-public-reference/sce-tenant-record-reference-allocation";

export type TaskReferenceAllocation = SceRecordReferenceAllocation;

export async function allocateTaskReferenceFields(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<TaskReferenceAllocation> {
  return allocateSceRecordReferenceFields(tx, tenantId);
}

export async function linkTaskTenantPublicReference(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    taskId: string;
    tenantPublicNumber: bigint;
  },
): Promise<void> {
  await linkTenantRecordPublicReference(tx, {
    tenantId: input.tenantId,
    tenantPublicNumber: input.tenantPublicNumber,
    recordKind: SceTenantPublicRecordKind.TASK,
    entityId: input.taskId,
  });
}