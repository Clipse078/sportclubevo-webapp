import { describe, expect, it } from "vitest";
import {
  CONNECTED_WORKSPACE_PO_UAT_HANDOFF,
  buildConnectedWorkspacePoUatHandoffUrls,
} from "../sce-cd-connected-workspace-po-uat-handoff";

describe("PR #1017 connected workspace PO UAT handoff", () => {
  it("records verified Acceptance deploy commit and canonical hostname", () => {
    expect(CONNECTED_WORKSPACE_PO_UAT_HANDOFF.acceptanceCommitShort).toBe("7b7c64b4");
    expect(CONNECTED_WORKSPACE_PO_UAT_HANDOFF.acceptanceOrigin).toBe(
      "https://acceptance.sportclubevo.com",
    );
  });

  it("builds five workspace destinations plus deep links", () => {
    const urls = buildConnectedWorkspacePoUatHandoffUrls(CONNECTED_WORKSPACE_PO_UAT_HANDOFF.acceptanceOrigin);
    expect(urls.uebersicht).toContain("/vereinsleitung/club-entwicklung");
    expect(urls.strategien).toContain("ansicht=strategie");
    expect(urls.ziele).toContain("ansicht=ziele");
    expect(urls.aufgaben).toContain("ansicht=aufgaben");
    expect(urls.umsetzungsplanung).toContain("ansicht=umsetzungsphasen");
    expect(urls.ungeplantBacklog).toContain("umsetzungsabschnitt=ungeplant");
    expect(urls.sprintBoard).toContain("po-uat-vereinsentwicklung-planung");
    expect(urls.targetDetail).toContain(CONNECTED_WORKSPACE_PO_UAT_HANDOFF.fixture.targetId);
  });
});