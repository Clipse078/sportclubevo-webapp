import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const spielbetriebTeamAuth = readFileSync(
  join(process.cwd(), "lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization.ts"),
  "utf8",
);
const trainingTeamAuth = readFileSync(
  join(process.cwd(), "lib/training/domain-audience/training-team-authorization.ts"),
  "utf8",
);
const loadOperationalAttention = readFileSync(
  join(process.cwd(), "lib/domain-attention/load-domain-operational-attention.ts"),
  "utf8",
);
const spielbetriebAttention = readFileSync(
  join(
    process.cwd(),
    "lib/spielbetrieb/operational-attention/spielbetrieb-participation-attention-source.ts",
  ),
  "utf8",
);
const dashboardContext = readFileSync(
  join(process.cwd(), "lib/dashboard/dashboard-context/resolve-dashboard-context.ts"),
  "utf8",
);
const personalCommandCenter = readFileSync(
  join(process.cwd(), "lib/dashboard/personal-command-center.ts"),
  "utf8",
);
const authScope = readFileSync(
  join(process.cwd(), "lib/communication/team/team-communication-authorization-scope.ts"),
  "utf8",
);
const prismaClient = readFileSync(join(process.cwd(), "lib/db/prisma.ts"), "utf8");

describe("SCE-PERF-DASHBOARD-01 structural regressions", () => {
  it("does not use per-team sequential resolveTeamCommunicationAuthorization loops for audience lists", () => {
    expect(spielbetriebTeamAuth).toContain("listTeamIdsWithTeamCommunicationView");
    expect(trainingTeamAuth).toContain("listTeamIdsWithTeamCommunicationView");
    expect(spielbetriebTeamAuth).not.toMatch(
      /for\s*\(\s*const\s+team\s+of\s+teams\s*\)[\s\S]*resolveTeamCommunicationAuthorization/,
    );
    expect(trainingTeamAuth).not.toMatch(
      /for\s*\(\s*const\s+team\s+of\s+teams\s*\)[\s\S]*resolveTeamCommunicationAuthorization/,
    );
  });

  it("shares one canonical team communication view list for Spielbetrieb and Training", () => {
    expect(spielbetriebTeamAuth).toContain("listTeamIdsWithTeamCommunicationView");
    expect(trainingTeamAuth).toContain("listTeamIdsWithTeamCommunicationView");
  });

  it("operational attention loader does not call canDiscover before evaluate", () => {
    expect(loadOperationalAttention).not.toContain("canDiscover(ctx)");
    expect(loadOperationalAttention).toContain("evaluateAttention(ctx)");
  });

  it("spielbetrieb evaluate helper does not duplicate canDiscover", () => {
    expect(spielbetriebAttention).not.toMatch(
      /evaluateSpielbetriebParticipationOperationalAttention[\s\S]*canDiscover/,
    );
  });

  it("DashboardContext resolves personal context once for command center", () => {
    expect(personalCommandCenter).toContain("resolveDashboardContext");
    expect(personalCommandCenter).toContain("personalContext: dashboardContext?.personalContext");
  });

  it("DashboardContext uses request-scoped permission cache", () => {
    expect(dashboardContext).toContain("getRequestEffectivePermissions");
    expect(dashboardContext).toContain("cache(");
  });

  it("team authorization scope is bounded batch projection", () => {
    expect(authScope).toContain("getTeamCommunicationAuthorizationScope");
    expect(authScope).not.toMatch(
      /for\s*\(\s*const\s+team\s+of\s+teams\s*\)[\s\S]*resolveTeamCommunicationAuthorization/,
    );
  });

  it("reuses Prisma pool on globalThis in production", () => {
    expect(prismaClient).toContain("globalForPrisma.prisma = client");
    expect(prismaClient).not.toContain('process.env.NODE_ENV !== "production"');
  });
});
