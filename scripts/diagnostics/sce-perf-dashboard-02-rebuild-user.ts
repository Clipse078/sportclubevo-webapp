import "./sce-perf-preload.mjs";

/**
 * SCE-PERF-DASHBOARD-02 — idempotent rebuild for one tenant/user (read-safe).
 *
 * Usage:
 *   npx tsx scripts/diagnostics/sce-perf-dashboard-02-rebuild-user.ts --email it@fcallschwil.ch --tenant fc-allschwil
 */
import "dotenv/config";
import { rebuildPersonalDashboardReadModel } from "@/lib/dashboard/read-model/rebuild";
import { prisma } from "@/lib/db/prisma";

async function main(): Promise<void> {
  const emailArg = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1];
  const tenantArg = process.argv.find((a) => a.startsWith("--tenant="))?.split("=")[1];
  const email = emailArg ?? "it@fcallschwil.ch";
  const tenantKey = tenantArg ?? "fc-allschwil";

  const tenant = await prisma.tenant.findUnique({
    where: { key: tenantKey },
    select: { id: true, locale: true, timezone: true },
  });
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  if (!tenant || !user) {
    console.error(JSON.stringify({ error: "NOT_FOUND", email, tenantKey }));
    process.exit(2);
  }

  const result = await rebuildPersonalDashboardReadModel({
    tenantId: tenant.id,
    userId: user.id,
    fmtCfg: {
      locale: tenant.locale ?? "de-CH",
      timezone: tenant.timezone ?? "Europe/Zurich",
    },
  });

  console.log(JSON.stringify({ ok: true, ...result, tenantKey, email }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
