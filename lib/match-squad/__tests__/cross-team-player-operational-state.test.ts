import { describe, expect, it } from "vitest";
import { deriveCrossTeamOperationalPresentation } from "@/lib/match-squad/cross-team-player-operational-state";

describe("deriveCrossTeamOperationalPresentation", () => {
  it("released without request", () => {
    const result = deriveCrossTeamOperationalPresentation({
      releaseStatus: "ACTIVE",
      releaseValidForActivity: true,
      requestStatus: null,
      assigned: false,
      eventCancelled: false,
    });
    expect(result.operationalLabel).toBe("Freigegeben");
    expect(result.operationalSecondaryLabel).toMatch(/Noch nicht angefragt/);
  });

  it("pending request", () => {
    const result = deriveCrossTeamOperationalPresentation({
      releaseStatus: "ACTIVE",
      releaseValidForActivity: true,
      requestStatus: "PENDING",
      assigned: false,
      eventCancelled: false,
    });
    expect(result.operationalLabel).toBe("Angefragt");
  });

  it("approved but not assigned", () => {
    const result = deriveCrossTeamOperationalPresentation({
      releaseStatus: "ACTIVE",
      releaseValidForActivity: true,
      requestStatus: "APPROVED",
      assigned: false,
      eventCancelled: false,
    });
    expect(result.operationalLabel).toBe("Genehmigt");
    expect(result.operationalSecondaryLabel).toMatch(/Noch nicht aufgeboten/);
  });

  it("approved and assigned", () => {
    const result = deriveCrossTeamOperationalPresentation({
      releaseStatus: "ACTIVE",
      releaseValidForActivity: true,
      requestStatus: "APPROVED",
      assigned: true,
      eventCancelled: false,
    });
    expect(result.operationalLabel).toBe("Aufgeboten");
  });

  it("rejected request", () => {
    const result = deriveCrossTeamOperationalPresentation({
      releaseStatus: "ACTIVE",
      releaseValidForActivity: true,
      requestStatus: "REJECTED",
      assigned: false,
      eventCancelled: false,
    });
    expect(result.operationalLabel).toBe("Abgelehnt");
  });

  it("invalid when release no longer valid after approval", () => {
    const result = deriveCrossTeamOperationalPresentation({
      releaseStatus: "REVOKED",
      releaseValidForActivity: false,
      requestStatus: "APPROVED",
      assigned: false,
      eventCancelled: false,
    });
    expect(result.operationalLabel).toBe("Nicht mehr gültig");
  });

  it("event cancelled with approved request", () => {
    const result = deriveCrossTeamOperationalPresentation({
      releaseStatus: "ACTIVE",
      releaseValidForActivity: true,
      requestStatus: "APPROVED",
      assigned: false,
      eventCancelled: true,
    });
    expect(result.operationalLabel).toBe("Aktivität abgesagt");
  });

  it("does not infer assignment from approval alone", () => {
    const approved = deriveCrossTeamOperationalPresentation({
      releaseStatus: "ACTIVE",
      releaseValidForActivity: true,
      requestStatus: "APPROVED",
      assigned: false,
      eventCancelled: false,
    });
    expect(approved.operationalLabel).not.toBe("Aufgeboten");
  });
});
