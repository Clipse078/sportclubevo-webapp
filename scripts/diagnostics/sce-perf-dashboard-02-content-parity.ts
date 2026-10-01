import "./sce-perf-preload.mjs";
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { buildPersonalDashboardReadModelPayload } from "@/lib/dashboard/read-model/rebuild";
import { parsePersonalDashboardReadModelPayload } from "@/lib/dashboard/read-model/payload-codec";

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

  const row = await prisma.personalDashboardReadModel.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    select: { payloadJson: true, builtAt: true, updatedAt: true },
  });

  const stored = row ? parsePersonalDashboardReadModelPayload(row.payloadJson) : null;
  const canonical = await buildPersonalDashboardReadModelPayload({
    tenantId: tenant.id,
    userId: user.id,
    fmtCfg: {
      locale: tenant.locale ?? "de-CH",
      timezone: tenant.timezone ?? "Europe/Zurich",
    },
  });

  const storedProgrammeIds = new Set(stored?.programme.items.map((i) => i.id) ?? []);
  const canonicalProgrammeIds = new Set(canonical.programme.items.map((i) => i.id));
  const missingInStored = [...canonicalProgrammeIds].filter((id) => !storedProgrammeIds.has(id));
  const extraInStored = [...storedProgrammeIds].filter((id) => !canonicalProgrammeIds.has(id));

  console.log(
    JSON.stringify(
      {
        ok: true,
        projectionAgeMs: row ? Date.now() - row.updatedAt.getTime() : null,
        programme: {
          stored: stored?.programme.items.length ?? 0,
          canonical: canonical.programme.items.length,
          missingInStored: missingInStored.slice(0, 5),
          extraInStored: extraInStored.slice(0, 5),
        },
        personalWork: {
          storedAttention: stored?.personalWork.attentionTotalCount ?? null,
          canonicalAttention: canonical.personalWork.attentionTotalCount,
          storedTasks: stored?.personalWork.taskCount ?? null,
          canonicalTasks: canonical.personalWork.taskCount,
        },
        parityOk:
          missingInStored.length === 0 &&
          extraInStored.length === 0 &&
          (stored?.personalWork.taskCount ?? -1) === canonical.personalWork.taskCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
