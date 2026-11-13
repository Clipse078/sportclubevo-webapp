import { describe, expect, it } from "vitest";
import { evaluateMeetingApprovalRule } from "@/lib/meetings/meeting-approval-rules";
import { categorizeMeeting, groupMeetingsByCategory } from "@/lib/meetings/meeting-list-categories";
import { getMeetingLifecyclePresentation } from "@/lib/meetings/meeting-lifecycle";
import { canEditMeetingDocumentation } from "@/lib/meetings/meeting-workspace-lock";
import { computeDecisionAggregateStatus } from "@/lib/meetings/meeting-decision-approval-service";
import { hashMeetingDecisionContent } from "@/lib/meetings/meeting-content-hash";

describe("SCE-CD-02R9 meeting lifecycle", () => {
  it("past PLANNED meetings stay in past_open category (not auto-closed)", () => {
    const past = new Date("2020-01-01T12:00:00Z");
    expect(categorizeMeeting({ status: "PLANNED", meetingDate: past })).toBe("past_open");
  });

  it("shows past documentation hint without error tone", () => {
    const pres = getMeetingLifecyclePresentation({
      status: "PLANNED",
      meetingDate: new Date("2020-01-01T12:00:00Z"),
      participantCount: 2,
      agendaCount: 1,
      decisionCount: 0,
      actionCount: 0,
    });
    expect(pres.showPastDocumentationHint).toBe(true);
    expect(pres.lifecycleLabel).toBe("Durchgeführt");
  });

  it("COMPLETED meetings are not editable", () => {
    expect(
      canEditMeetingDocumentation({
        status: "COMPLETED",
        reviewStage: "DRAFT",
        protocolApprovalRequired: false,
      }),
    ).toBe(false);
  });

  it("approval ALL rule requires every approver", () => {
    const pool = ["p1", "p2"];
    const satisfied = evaluateMeetingApprovalRule({
      rule: "ALL",
      approverPersonIds: pool,
      votes: [
        { approverPersonId: "p1", decision: "APPROVED" },
        { approverPersonId: "p2", decision: "APPROVED" },
      ],
    });
    expect(satisfied.satisfied).toBe(true);

    const partial = evaluateMeetingApprovalRule({
      rule: "ALL",
      approverPersonIds: pool,
      votes: [{ approverPersonId: "p1", decision: "APPROVED" }],
    });
    expect(partial.satisfied).toBe(false);
  });

  it("approval ONE rule passes with single approve", () => {
    const result = evaluateMeetingApprovalRule({
      rule: "ONE",
      approverPersonIds: ["p1", "p2"],
      votes: [{ approverPersonId: "p2", decision: "APPROVED" }],
    });
    expect(result.satisfied).toBe(true);
  });

  it("approval MAJORITY rule", () => {
    const pool = ["p1", "p2", "p3"];
    const result = evaluateMeetingApprovalRule({
      rule: "MAJORITY",
      approverPersonIds: pool,
      votes: [
        { approverPersonId: "p1", decision: "APPROVED" },
        { approverPersonId: "p2", decision: "APPROVED" },
      ],
    });
    expect(result.satisfied).toBe(true);
  });

  it("maps protocol review stages to German labels", () => {
    const label = getMeetingLifecyclePresentation({
      status: "PLANNED",
      meetingDate: new Date("2030-01-01T12:00:00Z"),
      participantCount: 2,
      agendaCount: 1,
      decisionCount: 0,
      actionCount: 0,
      protocolApprovalRequired: true,
      reviewStage: "SUBMITTED",
    });
    expect(label.lifecycleLabel).toBe("Zur Freigabe");
  });

  it("groups list sections", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const groups = groupMeetingsByCategory(
      [
        { status: "PLANNED", meetingDate: new Date("2026-12-01T12:00:00Z") },
        { status: "PLANNED", meetingDate: new Date("2020-01-01T12:00:00Z") },
        { status: "COMPLETED", meetingDate: new Date("2020-01-01T12:00:00Z") },
        { status: "CANCELLED", meetingDate: new Date("2020-01-01T12:00:00Z") },
      ],
      now,
    );
    expect(groups.upcoming).toHaveLength(1);
    expect(groups.past_open).toHaveLength(1);
    expect(groups.completed).toHaveLength(1);
    expect(groups.cancelled).toHaveLength(1);
  });

  it("decision aggregate reflects changes requested", () => {
    const status = computeDecisionAggregateStatus({
      approvalRequired: true,
      approvalRule: "ALL",
      approverPersonIds: ["p1"],
      votes: [{ approverPersonId: "p1", decision: "CHANGES_REQUESTED" }],
    });
    expect(status).toBe("CHANGES_REQUESTED");
  });

  it("content hash changes when title changes (revision invalidation signal)", () => {
    const a = hashMeetingDecisionContent({ title: "A", description: null, rationale: null, revision: 1 });
    const b = hashMeetingDecisionContent({ title: "B", description: null, rationale: null, revision: 1 });
    expect(a).not.toBe(b);
  });
});
