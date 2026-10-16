import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn().mockResolvedValue({ name: "FC Allschwil" }) },
  },
}));

vi.mock("@/lib/server/request-cache", () => ({
  getTenantClubCrestUrlCached: vi.fn().mockResolvedValue("/crest.png"),
}));

const queryProgrammeMock = vi.fn().mockResolvedValue({ items: [] });

vi.mock("@/lib/programme-engine/query-programme", () => ({
  queryProgramme: (...args: unknown[]) => queryProgrammeMock(...args),
}));

vi.mock("@/lib/programme-engine/person-programme-scope", () => ({
  buildPersonProgrammeScope: vi.fn(() => ({ kind: "PERSON" as const, teamIds: ["t1"] })),
}));

import { loadPersonScopeSportingProgrammeItems } from "../load-person-scope-sporting-programme";
import type { PersonalContext } from "@/lib/dashboard/personal-context/types";

function baseContext(): PersonalContext {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    hasActiveTenantMembership: true,
    hasLinkedPerson: true,
    teams: [{ teamId: "t1", teamSeasonIds: ["ts1"], role: "trainer" }],
    orgUnits: [],
  };
}

describe("SCE-ACTIVITY-CREATE-01J R1 — personal programme boundary", () => {
  beforeEach(() => {
    queryProgrammeMock.mockClear();
  });

  it("loadPersonScopeSportingProgrammeItems queries Programme Engine with PERSON scope", async () => {
    const rangeStart = new Date("2026-10-01T00:00:00.000Z");
    const rangeEnd = new Date("2026-10-31T23:59:59.000Z");

    await loadPersonScopeSportingProgrammeItems({
      tenantId: "tenant-1",
      userId: "user-1",
      personalContext: baseContext(),
      timeZone: "Europe/Zurich",
      rangeStart,
      rangeEnd,
      permissionKeys: ["events.view"],
    });

    expect(queryProgrammeMock).toHaveBeenCalledTimes(1);
    const input = queryProgrammeMock.mock.calls[0]![0] as { scope: { kind: string } };
    expect(input.scope.kind).toBe("PERSON");
  });

  it("Dashboard and calendar loaders delegate to the shared PERSON sporting loader", () => {
    const loadProgramme = readRelative("lib/personal-agenda/load-personal-programme.ts");
    const calendarEntries = readRelative("lib/personal-agenda/calendar-entries.ts");
    expect(loadProgramme).toContain("loadPersonScopeSportingProgrammeItems");
    expect(loadProgramme).not.toContain("queryProgramme(");
    expect(calendarEntries).toContain("loadPersonScopeSportingProgrammeItems");
    expect(calendarEntries).not.toContain("queryProgramme(");
  });

  it("personal command center loads programme via loadPersonalProgramme only", () => {
    const pcc = readRelative("lib/dashboard/personal-command-center.ts");
    expect(pcc).toContain("loadPersonalProgramme");
    expect(pcc).not.toMatch(/DashboardProgrammeEngine|MyActivitiesEngine|DashboardActivityQuery/);
  });

  it("Mein Kalender month bundle reuses loadPersonalProgramme", () => {
    const bundle = readRelative("lib/personal-agenda/load-personal-calendar-month-bundle.ts");
    expect(bundle).toContain("loadPersonalProgramme");
  });

  it("canonical agenda rows prefer Sce* cards when canonicalPresentation is set", () => {
    const row = readRelative("components/ui/dashboard/PersonalProgrammeAgendaRow.tsx");
    expect(row).toContain("PersonalProgrammeCanonicalAgendaRow");
    const canonical = readRelative("components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx");
    expect(canonical).toContain("SceTrainingCard");
    expect(canonical).toContain("SceMatchCard");
    expect(canonical).toContain("SceTournamentCard");
    expect(canonical).toContain("SceClubEventCard");
    expect(canonical).not.toMatch(/SceDashboard(Match|Training|Tournament|Event)Card/);
  });

  it("does not introduce parallel programme engines in personal-agenda lib", () => {
    const sportingLoader = readRelative("lib/personal-agenda/load-person-scope-sporting-programme.ts");
    expect(sportingLoader).toContain("queryProgramme");
    expect(sportingLoader).not.toMatch(/PersonalDashboardProgramme|MyActivitiesEngine/);
  });
});
