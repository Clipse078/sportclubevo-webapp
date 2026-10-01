import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { getPersonalCommandCenterData } from "@/lib/dashboard/personal-command-center";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { buildActorContext } from "@/lib/visibility/actor-context";
import type { PermissionKey } from "@/lib/permissions/permissions";

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: "fc-allschwil" },
    select: { id: true, locale: true, timezone: true },
  });
  const user = await prisma.user.findFirst({
    where: { email: "it@fcallschwil.ch" },
    select: { id: true },
  });
  if (!tenant || !user) {
    console.log(JSON.stringify({ error: "FIXTURE_MISSING" }));
    process.exit(2);
  }

  const permissions = await getRequestEffectivePermissions(user.id, tenant.id);
  const permissionKeys = [...permissions.platform, ...permissions.tenant] as PermissionKey[];
  const actor = buildActorContext(
    { id: user.id, roleKeys: [], permissionKeys },
    [],
    [],
    tenant.id,
  );
  const fmtCfg = {
    locale: tenant.locale ?? "de-CH",
    timezone: tenant.timezone ?? "Europe/Zurich",
  };

  const loaderArgs = {
    tenantId: tenant.id,
    userId: user.id,
    actor,
    fmtCfg,
    permissionKeys,
  };

  const coldStart = performance.now();
  await getPersonalCommandCenterData(loaderArgs);
  const coldMs = performance.now() - coldStart;

  const warm: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await getPersonalCommandCenterData(loaderArgs);
    warm.push(performance.now() - start);
  }
  warm.sort((a, b) => a - b);

  console.log(
    JSON.stringify({
      benchmark: "command-center-warm",
      coldMs: Number(coldMs.toFixed(1)),
      warmIterations: warm.length,
      warmMinMs: Number(warm[0]!.toFixed(1)),
      warmP50Ms: Number(warm[Math.floor(warm.length * 0.5)]!.toFixed(1)),
      warmP95Ms: Number(warm[Math.floor(warm.length * 0.95) - 1]!.toFixed(1)),
      warmMaxMs: Number(warm[warm.length - 1]!.toFixed(1)),
      targetMs: 500,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
