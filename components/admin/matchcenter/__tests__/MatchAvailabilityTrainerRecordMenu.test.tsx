/**
 * @vitest-environment jsdom
 *
 * MatchAvailabilityTrainerRecordMenu is no longer mounted in Match Squad (R2.2).
 * Trainer match availability writes are disabled on the matchcenter API.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("MatchAvailabilityTrainerRecordMenu", () => {
  it("is not used in MatchSquadPlayerRow after R2.2", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/admin/matchcenter/MatchSquadPlayerRow.tsx"),
      "utf8",
    );
    expect(source).not.toContain("MatchAvailabilityTrainerRecordMenu");
    expect(source).not.toContain("Rückmeldung verwalten");
  });
});
