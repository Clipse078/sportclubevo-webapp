import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { personalCommandCenterUsesSingleProgrammeLoader } from "../personal-command-center";

const loaderSource = readFileSync(
  join(process.cwd(), "lib/dashboard/personal-command-center.ts"),
  "utf8",
);

describe("DASHBOARD-06 personal command center loader", () => {
  it("loads programme via canonical loadPersonalProgramme only", () => {
    expect(personalCommandCenterUsesSingleProgrammeLoader()).toBe(true);
    expect(loaderSource).toContain("loadPersonalProgramme");
    expect(loaderSource).not.toContain("loadPersonalAgendaItems");
    expect(loaderSource).not.toContain("todayEvents");
    expect(loaderSource).not.toContain("buildPersonalCockpitKpiStrip");
  });

  it("merges month grid range with default programme feed range", () => {
    expect(loaderSource).toContain("resolvePersonalProgrammeMonthGridRange");
    expect(loaderSource).toContain("mergeProgrammeRanges");
    expect(loaderSource).toContain("buildProgrammeFeedGroups");
  });

  it("fail-soft isolates secondary news/activity from primary dashboard", () => {
    expect(loaderSource).toContain("loadSecondarySnapshotSafe");
  });
});
