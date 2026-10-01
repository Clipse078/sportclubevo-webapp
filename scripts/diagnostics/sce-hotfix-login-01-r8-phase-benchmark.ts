/**
 * SCE-HOTFIX-LOGIN-01 R8 — phase-isolated read-only timings (FCA actor).
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db/prisma";
import { loadPersonalProgramme } from "@/lib/personal-agenda/load-personal-programme";
import { loadDashboardPersonalWork } from "@/lib/dashboard/personal-attention/load-dashboard-personal-work";
import { loadDomainOperationalAttention } from "@/lib/domain-attention/load-domain-operational-attention";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { resolvePersonalProgrammeMonthGridRange } from "@/lib/calendar/month-grid";
import { resolvePersonalProgrammeRange } from "@/lib/personal-agenda/programme-range";
import { formatMonthParam } from "@/lib/personal-agenda/calendar-range";

const TENANT_KEY = "fc-allschwil";
const ACTOR_EMAIL = "it@fcallschwil.ch";

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{ label: string; ms: number }> {
  const start = performance.now();
  await fn();
  return { label, ms: Number((performance.now() - start).toFixed(1)) };
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: TENANT_KEY },
    select: { id: true, locale: true, timezone: true },
  });
  const user = await prisma.user.findFirst({
    where: { email: ACTOR_EMAIL },
    select: { id: true },
  });
  if (!tenant || !user) {
    console.log(JSON.stringify({ error: "FIXTURE_MISSING" }));
    process.exit(2);
  }

  const permissions = await getRequestEffectivePermissions(user.id, tenant.id);
  const permissionKeys = [...permissions.platform, ...permissions.tenant];
  const timeZone = tenant.timezone ?? "Europe/Zurich";
  const now = new Date();
  const monthGrid = resolvePersonalProgrammeMonthGridRange({
    monthParam: formatMonthParam(now),
    timeZone,
    now,
  });
  const feedRange = resolvePersonalProgrammeRange({ timeZone, now });
  const queryRange = {
    rangeStart:
      feedRange.rangeStart.getTime() <= monthGrid.rangeStart.getTime()
        ? feedRange.rangeStart
        : monthGrid.rangeStart,
    rangeEnd:
      feedRange.rangeEnd.getTime() >= monthGrid.rangeEnd.getTime()
        ? feedRange.rangeEnd
        : monthGrid.rangeEnd,
  };

  const fmtCfg = { locale: tenant.locale ?? "de-CH", timezone: timeZone };

  const phases = [
    await timed("programme", () =>
      loadPersonalProgramme({
        tenantId: tenant.id,
        userId: user.id,
        timeZone,
        now,
        from: queryRange.rangeStart,
        to: queryRange.rangeEnd,
        permissionKeys,
      }),
    ),
    await timed("personal-work", () =>
      loadDashboardPersonalWork({
        tenantId: tenant.id,
        userId: user.id,
        fmtCfg,
        permissionKeys,
      }),
    ),
    await timed("operational-attention-only", () =>
      loadDomainOperationalAttention({
        tenantId: tenant.id,
        actorUserId: user.id,
        permissionKeys,
        now,
      }),
    ),
  ];

  console.log(JSON.stringify({ phases, totalMs: phases.reduce((s, p) => s + p.ms, 0) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
