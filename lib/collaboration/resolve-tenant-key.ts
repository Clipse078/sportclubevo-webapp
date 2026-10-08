import { prisma } from "@/lib/db/prisma";

export async function resolveTenantKeyForCollaboration(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: { key: true },
  });
  return tenant?.key ?? tenantId;
}
