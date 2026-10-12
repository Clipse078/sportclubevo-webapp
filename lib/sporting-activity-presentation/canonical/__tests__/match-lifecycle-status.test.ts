import { describe, expect, it } from "vitest";
import { createSceMatchCardFixtureMatch } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { resolveSceMatchLifecycleStatus } from "../match-lifecycle-status";

const TZ = "Europe/Zurich";

describe("resolveSceMatchLifecycleStatus", () => {
  it("labels upcoming match on same calendar day as Heute", () => {
    const startAt = new Date("2026-10-12T16:00:00.000Z");
    const now = new Date("2026-10-12T08:00:00.000Z");
    const status = resolveSceMatchLifecycleStatus({
      match: createSceMatchCardFixtureMatch({ startAt, status: "SCHEDULED" }),
      now,
      timezone: TZ,
    });
    expect(status?.label).toBe("Heute");
    expect(status?.semantic).toBe("warning");
  });

  it("labels next calendar day as Morgen", () => {
    const startAt = new Date("2026-10-13T16:00:00.000Z");
    const now = new Date("2026-10-12T08:00:00.000Z");
    const status = resolveSceMatchLifecycleStatus({
      match: createSceMatchCardFixtureMatch({ startAt, status: "SCHEDULED" }),
      now,
      timezone: TZ,
    });
    expect(status?.label).toBe("Morgen");
    expect(status?.semantic).toBe("planned");
  });

  it("maps completed lifecycle to Beendet", () => {
    const status = resolveSceMatchLifecycleStatus({
      match: createSceMatchCardFixtureMatch({ status: "COMPLETED" }),
    });
    expect(status?.label).toBe("Beendet");
    expect(status?.semantic).toBe("completed");
  });

  it("maps cancelled lifecycle to Abgesagt", () => {
    const status = resolveSceMatchLifecycleStatus({
      match: createSceMatchCardFixtureMatch({ status: "CANCELLED" }),
    });
    expect(status?.label).toBe("Abgesagt");
    expect(status?.semantic).toBe("cancelled");
  });
});
