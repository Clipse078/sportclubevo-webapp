import { resolveTenantPublicReferenceDisplay } from "@/lib/tenant-public-reference/sce-tenant-public-reference";
import type { TaskDto } from "./types";

export type TaskDtoMappingRow = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: TaskDto["status"];
  priority: TaskDto["priority"];
  dueAt: Date | null;
  reminder1At: Date | null;
  reminder2At: Date | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  completedAt: Date | null;
  contextType: TaskDto["contextType"];
  contextId: string | null;
  primaryInitiativeId: string | null;
  parentTaskId: string | null;
  taskSeriesId: string | null;
  orgUnitId: string | null;
  visibilityScope: TaskDto["visibilityScope"];
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  scePublicNumber?: bigint | null;
  tenantPublicNumber?: bigint | null;
  assignees: Array<{
    userId: string;
    assignedAt: Date;
    user: { firstName: string; lastName: string };
  }>;
};

export function mapTaskRowToDto(
  row: TaskDtoMappingRow,
  tenantShortCode: string | null | undefined,
): TaskDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.dueAt?.toISOString() ?? null,
    reminder1At: row.reminder1At?.toISOString() ?? null,
    reminder2At: row.reminder2At?.toISOString() ?? null,
    reminder1PresetKey: row.reminder1PresetKey,
    reminder2PresetKey: row.reminder2PresetKey,
    completedAt: row.completedAt?.toISOString() ?? null,
    contextType: row.contextType,
    contextId: row.contextId,
    primaryInitiativeId: row.primaryInitiativeId,
    parentTaskId: row.parentTaskId,
    taskSeriesId: row.taskSeriesId,
    orgUnitId: row.orgUnitId,
    visibilityScope: row.visibilityScope,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    assignees: row.assignees.map((a) => ({
      userId: a.userId,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      displayName: `${a.user.firstName} ${a.user.lastName}`.trim(),
      assignedAt: a.assignedAt.toISOString(),
    })),
    publicReference: resolveTenantPublicReferenceDisplay({
      tenantShortCode,
      tenantPublicNumber: row.tenantPublicNumber,
      legacyScePublicNumber: row.scePublicNumber,
    }),
  };
}