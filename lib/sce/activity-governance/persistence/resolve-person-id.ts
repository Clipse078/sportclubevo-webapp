import { prisma } from "@/lib/db/prisma";

export async function resolvePersonIdForUser(
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const person = await prisma.person.findFirst({
    where: { tenantId, userId },
    select: { id: true },
  });
  return person?.id ?? null;
}
