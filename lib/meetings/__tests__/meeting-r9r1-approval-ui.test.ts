import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canConfigureDecisionApproval,
  canConfigureProtocolApproval,
  canSubmitDecisionForApproval,
  canSubmitProtocolForApproval,
  parseApproverPersonIds,
  validateApprovalConfig,
} from "@/lib/meetings/meeting-approval-presentation";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-02R9R1 meeting approval UI", () => {
  it("deduplicates approver person ids", () => {
    expect(parseApproverPersonIds(["p1", "p1", "p2"])).toEqual(["p1", "p2"]);
  });

  it("validates empty approver list when approval enabled", () => {
    expect(validateApprovalConfig({ approvalRequired: true, approverPersonIds: [] })).toMatch(
      /Mindestens eine Person/,
    );
    expect(validateApprovalConfig({ approvalRequired: false, approverPersonIds: [] })).toBeNull();
  });

  it("locks protocol config after submission", () => {
    expect(
      canConfigureProtocolApproval({ status: "PLANNED", reviewStage: "SUBMITTED" }),
    ).toBe(false);
    expect(canConfigureProtocolApproval({ status: "PLANNED", reviewStage: "DRAFT" })).toBe(true);
    expect(canConfigureProtocolApproval({ status: "PLANNED", reviewStage: "REJECTED" })).toBe(
      true,
    );
  });

  it("locks decision config while pending", () => {
    expect(
      canConfigureDecisionApproval({ meetingStatus: "PLANNED", approvalStatus: "PENDING" }),
    ).toBe(false);
    expect(
      canConfigureDecisionApproval({ meetingStatus: "PLANNED", approvalStatus: "NOT_REQUIRED" }),
    ).toBe(true);
  });

  it("allows decision submit only before pending cycle", () => {
    expect(
      canSubmitDecisionForApproval({
        approvalRequired: true,
        approvalStatus: "NOT_REQUIRED",
        approverCount: 2,
      }),
    ).toBe(true);
    expect(
      canSubmitDecisionForApproval({
        approvalRequired: true,
        approvalStatus: "PENDING",
        approverCount: 2,
      }),
    ).toBe(false);
  });

  it("allows protocol submit in draft and after rejection", () => {
    expect(
      canSubmitProtocolForApproval({
        protocolApprovalRequired: true,
        reviewStage: "DRAFT",
        status: "PLANNED",
        approverCount: 1,
      }),
    ).toBe(true);
    expect(
      canSubmitProtocolForApproval({
        protocolApprovalRequired: true,
        reviewStage: "REJECTED",
        status: "PLANNED",
        approverCount: 1,
      }),
    ).toBe(true);
  });

  it("wires protocol and decision approval sections in workspace", () => {
    const workspace = readSrc("components/admin/meetings/workspace/MeetingWorkspace.tsx");
    const details = readSrc("components/admin/meetings/workspace/MeetingWorkspaceDetailsSection.tsx");
    expect(workspace).toContain("MeetingDecisionsSection");
    expect(workspace).toContain("MeetingWorkspaceDetailsSection");
    expect(details).toContain("MeetingProtocolApprovalSection");
    const sections = readSrc("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx");
    expect(sections).toContain("MeetingDecisionApprovalPanel");
    const protocol = readSrc("components/admin/meetings/approval/MeetingProtocolApprovalSection.tsx");
    expect(protocol).toContain("Freigabe des Sitzungsprotokolls");
    expect(protocol).toContain("MeetingParticipantMultiPicker");
    expect(protocol).toContain("Zur Freigabe einreichen");
    const shared = readSrc("components/admin/meetings/approval/meetingApprovalShared.tsx");
    expect(shared).toContain("Genehmigen");
    expect(shared).toContain("Änderungen anfordern");
  });
});
