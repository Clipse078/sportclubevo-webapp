import { describe, expect, it } from "vitest";
import {
  buildExampleTeamContextTabConfig,
  listExampleTeamVisibleTabKeys,
} from "../fixtures/example-team-context-tabs";
import { listVisiblePrimaryTabs, listVisibleOverflowTabs } from "../registry";

describe("SCE-UI-ROLLOUT-01B — non-activity TEAM example registry", () => {
  it("exposes domain-specific labels without activity-only tabs", () => {
    const config = buildExampleTeamContextTabConfig();
    const primary = listVisiblePrimaryTabs(config).map((t) => t.key);
    expect(primary).toEqual(["uebersicht", "kader", "programm", "trainer", "kommunikation"]);
    expect(primary).not.toContain("aufgebot");
    expect(primary).not.toContain("spielbetrieb");
  });

  it("filters tabs from capability input without generic permission constants", () => {
    const keys = listExampleTeamVisibleTabKeys({ rosterAvailable: false, mehrAvailable: false });
    expect(keys).not.toContain("kader");
    expect(keys).not.toContain("mehr");
  });

  it("keeps overflow Mehr ordering after primary tabs", () => {
    const config = buildExampleTeamContextTabConfig();
    const overflow = listVisibleOverflowTabs(config).map((t) => t.key);
    expect(overflow).toEqual(["mehr"]);
  });
});
