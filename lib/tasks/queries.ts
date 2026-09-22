import { prisma } from "@/lib/db/prisma";
import {
  ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT,
  ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS,
} from "./quick-create-assignee-search";
import {
  enrichTaskAssigneeOptionsWithDisplayNames,
  splitTaskResponsibleDisplayName,
} from "./task-assignee-display";

export type TaskAssigneeOption = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
};

export async function searchEligibleTaskAssignees(
  tenantId: string,
  search: string,
  limit = ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT,
): Promise<TaskAssigneeOption[]> {
  const term = search.trim();
  if (term.length > 0 && term.length < ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS) {
    return [];
  }

  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      isActive: true,
      user: {
        isActive: true,
        ...(term.length >= ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS
          ? {
              OR: [
                { firstName: { contains: term, mode: "insensitive" } },
                { lastName: { contains: term, mode: "insensitive" } },
                { email: { contains: term, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
        },
      },
    },
    orderBy: { user: { lastName: "asc" } },
    take: limit,
  });

  const base = memberships
    .map((m) => m.user)
    .filter((u) => u.isActive)
    .map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      displayName: "",
    }));
  return enrichTaskAssigneeOptionsWithDisplayNames(tenantId, base);
}

export async function listEligibleTaskAssignees(
  tenantId: string,
): Promise<TaskAssigneeOption[]> {
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, isActive: true },
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
        },
      },
    },
    orderBy: { user: { lastName: "asc" } },
  });

  const base = memberships
    .map((m) => m.user)
    .filter((u) => u.isActive)
    .map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      displayName: "",
    }));
  return enrichTaskAssigneeOptionsWithDisplayNames(tenantId, base);
}

export { splitTaskResponsibleDisplayName };
