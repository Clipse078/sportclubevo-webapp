import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";

async function time<T>(label: string, fn: () => Promise<T>) {
  const s = performance.now();
  await fn();
  console.log(`${label}: ${(performance.now() - s).toFixed(1)}ms`);
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { key: "fc-allschwil" },
    select: { id: true },
  });
  const user = await prisma.user.findFirst({
    where: { email: "it@fcallschwil.ch" },
    select: { id: true },
  });
  if (!tenant || !user) throw new Error("missing bench user/tenant");

  const resolver = createEffectivePermissionResolver(prisma);
  const userId = user.id;
  const tenantId = tenant.id;

  const platformQuery = () =>
    prisma.userRole.findMany({
      where: {
        userId,
        tenantId: null,
        role: { scope: "PLATFORM", tenantId: null, isArchived: false },
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: { permission: { select: { key: true, scope: true } } },
            },
          },
        },
      },
    });

  const membershipQuery = () =>
    prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: {
        isActive: true,
        tenant: { select: { status: true } },
        user: { select: { isActive: true } },
      },
    });

  const tenantRolesQuery = () =>
    prisma.userRole.findMany({
      where: {
        userId,
        tenantId,
        orgUnitId: null,
        scopeMode: null,
        role: { scope: "TENANT", tenantId, isArchived: false },
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: { permission: { select: { key: true, scope: true } } },
            },
          },
        },
      },
    });

  const overridesQuery = () =>
    prisma.userPermissionOverride.findMany({
      where: { tenantId, userId },
      select: {
        effect: true,
        permission: { select: { key: true, scope: true, grantableByAdmin: true } },
      },
    });

  for (const pass of ["first", "repeat"] as const) {
    console.log(`\n=== ${pass} ===`);
    await time("getEffectivePermissions (full)", () =>
      resolver.getEffectivePermissions({ userId, tenantId }),
    );
    await time("platform userRole.findMany", platformQuery);
    await time("tenant membership.findUnique", membershipQuery);
    await time("tenant userRole.findMany", tenantRolesQuery);
    await time("tenant overrides.findMany", overridesQuery);
    await time("platform+tenant roles parallel", async () => {
      await Promise.all([platformQuery(), tenantRolesQuery()]);
    });
    await time("membership then tenant parallel", async () => {
      const m = await membershipQuery();
      if (m?.isActive) {
        await Promise.all([tenantRolesQuery(), overridesQuery()]);
      }
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
