import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { loadDomainOperationalAttention } from "@/lib/domain-attention/load-domain-operational-attention";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: "fc-allschwil" },
    select: { id: true },
  });
  const user = await prisma.user.findFirst({
    where: { email: "it@fcallschwil.ch" },
    select: { id: true },
  });
  if (!tenant || !user) {
    console.log(JSON.stringify({ error: "FIXTURE_MISSING" }));
    process.exit(2);
  }

  const perms = await getRequestEffectivePermissions(user.id, tenant.id);
  const permissionKeys = [...perms.platform, ...perms.tenant];
  const args = {
    tenantId: tenant.id,
    actorUserId: user.id,
    permissionKeys,
  };

  const coldStart = performance.now();
  await loadDomainOperationalAttention(args);
  const coldMs = performance.now() - coldStart;

  const warm: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await loadDomainOperationalAttention(args);
    warm.push(performance.now() - start);
  }
  warm.sort((a, b) => a - b);

  console.log(
    JSON.stringify({
      benchmark: "operational-attention-warm",
      coldMs: Number(coldMs.toFixed(1)),
      warmIterations: warm.length,
      warmMinMs: Number(warm[0]!.toFixed(1)),
      warmP50Ms: Number(warm[Math.floor(warm.length * 0.5)]!.toFixed(1)),
      warmP95Ms: Number(warm[Math.floor(warm.length * 0.95) - 1]!.toFixed(1)),
      warmMaxMs: Number(warm[warm.length - 1]!.toFixed(1)),
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
