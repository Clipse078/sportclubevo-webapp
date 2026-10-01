/**
 * SCE-HOTFIX-LOGIN-01 R8 — operational-attention source isolation (read-only).
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { ensureProductionOperationalAttentionSourcesRegistered } from "@/lib/domain-attention/register-production-operational-attention-sources";
import { listRegisteredDomainOperationalAttentionSources } from "@/lib/domain-attention/operational-attention-registry";

const TENANT_KEY = "fc-allschwil";
const ACTOR_EMAIL = "it@fcallschwil.ch";

async function main(): Promise<void> {
  ensureProductionOperationalAttentionSourcesRegistered();
  const tenant = await prisma.tenant.findUnique({ where: { key: TENANT_KEY }, select: { id: true } });
  const user = await prisma.user.findFirst({ where: { email: ACTOR_EMAIL }, select: { id: true } });
  if (!tenant || !user) {
    console.log(JSON.stringify({ error: "FIXTURE_MISSING" }));
    process.exit(2);
  }

  const permissions = await getRequestEffectivePermissions(user.id, tenant.id);
  const permissionKeys = new Set([...permissions.platform, ...permissions.tenant]);
  const ctx = {
    tenantId: tenant.id,
    userId: user.id,
    permissionKeys,
    now: new Date(),
  };

  const sources = listRegisteredDomainOperationalAttentionSources();
  const results: { source: string; canDiscoverMs: number; evaluateMs: number; itemCount: number }[] = [];

  for (const source of sources) {
    const canStart = performance.now();
    const canRun = await source.canDiscover(ctx);
    const canDiscoverMs = performance.now() - canStart;
    let evaluateMs = 0;
    let itemCount = 0;
    if (canRun) {
      const evalStart = performance.now();
      const items = await source.evaluateAttention(ctx);
      evaluateMs = performance.now() - evalStart;
      itemCount = items.length;
    }
    results.push({
      source: source.domainKey,
      canDiscoverMs: Number(canDiscoverMs.toFixed(1)),
      evaluateMs: Number(evaluateMs.toFixed(1)),
      itemCount,
    });
  }

  console.log(JSON.stringify({ results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
