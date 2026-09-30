/**
 * Read-only FCA aggregate for SCE-DOMAIN-OPERATIONAL-ATTENTION-01 (no mutations, no PII).
 */
import { prisma } from "@/lib/db/prisma";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { loadDomainOperationalAttention } from "@/lib/domain-attention/load-domain-operational-attention";

async function resolveFcaOperatorUserId(tenantId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: {
      tenantId,
      email: { contains: "michael", mode: "insensitive" },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (user) return user.id;

  const fallback = await prisma.user.findFirst({
    where: { tenantId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return fallback?.id ?? null;
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { key: "fca" },
    select: { id: true },
  });
  if (!tenant) {
    console.log(JSON.stringify({ RESULT: "BLOCKED_ON_ENV", reason: "fca tenant not found" }, null, 2));
    return;
  }

  const userId = await resolveFcaOperatorUserId(tenant.id);
  if (!userId) {
    console.log(JSON.stringify({ RESULT: "BLOCKED_ON_ENV", reason: "no operator user" }, null, 2));
    return;
  }

  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(userId, tenant.id);
  const permissionKeys = new Set([...platform, ...tenantPerms]);
  const now = new Date();

  const operational = await loadDomainOperationalAttention({
    tenantId: tenant.id,
    actorUserId: userId,
    permissionKeys,
    now,
  });

  const operationalCount = operational.items.length;

  console.log(
    JSON.stringify(
      {
        PERSONAL_ATTENTION_COUNT: null,
        PERSONAL_ATTENTION_NOTE:
          "Run inside Next server context for personal inbox counts; script loads operational attention only.",
        SPIELBETRIEB_ATTENTION_COUNT: operational.items.filter((i) => i.domainKey === "spielbetrieb")
          .length,
        TRAINING_ATTENTION_COUNT: operational.items.filter((i) => i.domainKey === "training").length,
        EVENTS_ATTENTION_COUNT: operational.items.filter((i) => i.domainKey === "events").length,
        TOTAL_OPERATIONAL: operationalCount,
        TOTAL_COMBINED: operationalCount,
        FAILED_SOURCES: operational.failedSourceKeys,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
