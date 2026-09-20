import { prisma } from "@/lib/db/prisma";

export type TaskAssigneeOption = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
};

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

  return memberships
    .map((m) => m.user)
    .filter((u) => u.isActive)
    .map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
    }));
}
