import type { TaskContextType } from "@prisma/client";
import { listEligibleTaskAssignees } from "./queries";
import { resolveTaskContextPresentation } from "./context-presentation";
import { resolveContextualTaskCreateEligibility } from "./contextual-task-eligibility";
import { loadTaskOrgUnitMutationOptions } from "./task-org-options";
import { canViewAllTasks } from "./visibility";
import { prisma } from "@/lib/db/prisma";
import type { TaskAssigneeOption } from "./queries";
import type { TaskContextPresentation } from "./context-resolution";
import type { TaskOrgUnitPickerOption } from "./task-org-options";
import type { TaskServiceContext } from "./types";

export type ContextualTaskCreateViewDto = {
  canCreate: boolean;
  contextType: TaskContextType;
  contextId: string;
  presentation: TaskContextPresentation | null;
  assigneeOptions: TaskAssigneeOption[];
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  tenantWideVisibility: boolean;
};

export async function loadContextualTaskCreateView(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  contextId: string,
  locale: string,
  timeZone: string,
): Promise<ContextualTaskCreateViewDto | null> {
  const eligibility = await resolveContextualTaskCreateEligibility(ctx, contextType, contextId);
  if (!eligibility.canCreate) {
    return null;
  }

  const [assigneeOptions, orgUnitOptions, presentation, tenantRow] = await Promise.all([
    listEligibleTaskAssignees(ctx.tenantId),
    loadTaskOrgUnitMutationOptions(ctx),
    resolveTaskContextPresentation(ctx, contextType, contextId, locale, timeZone),
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { timezone: true },
    }),
  ]);

  return {
    canCreate: true,
    contextType,
    contextId,
    presentation,
    assigneeOptions,
    orgUnitOptions,
    timeZone: tenantRow?.timezone ?? timeZone,
    tenantWideVisibility: canViewAllTasks(ctx),
  };
}
