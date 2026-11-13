import { describe, expect, it } from "vitest";
import { buildMeetingWorkspaceStatusSummary } from "@/lib/meetings/meeting-workspace-status-summary";

describe("buildMeetingWorkspaceStatusSummary", () => {
  it("summarizes lifecycle, protocol and pending decisions", () => {
    const summary = buildMeetingWorkspaceStatusSummary({
      meeting: {
        id: "m1",
        slug: "s",
        title: "Test",
        description: null,
        meetingDate: new Date("2026-12-01T18:00:00.000Z"),
        location: null,
        attendeeCount: 0,
        plannedDurationMin: 60,
        status: "PLANNED",
        conductedAt: null,
        closedAt: null,
        protocolApprovalRequired: false,
        protocolApprovalRule: "ANY",
        protocolApproverPersonIds: [],
        protocolContentRevision: 0,
        lastReopenReason: null,
        reviewStage: "DRAFT",
        requiresFourEyeReview: false,
        visibilityScope: "TENANT",
        createdByUserId: "u1",
        visibleRoleRefs: [],
        visibleUserRefs: [],
        visibleTeamRefs: [],
        visibleOrgUnitRefs: [],
        visiblePersonRefs: [],
        visibleTargetGroupRefs: [],
        reviewedByUserId: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      participants: [{ id: "p1", name: "A", role: null, status: "INVITED", userId: null, personId: "p1" }],
      agendaItems: [],
      decisions: [
        {
          id: "d1",
          title: "B1",
          description: null,
          status: "CONFIRMED",
          approvalRequired: true,
          approvalStatus: "PENDING",
          approvalRule: "ANY",
          approverPersonIds: [],
          owner: null,
          ownerPersonId: null,
          sourceAgendaItemId: null,
          initiativeId: null,
        },
      ],
      actions: [],
      hasInvitedParticipants: true,
    });

    expect(summary.lifecycleLabel).toBeTruthy();
    expect(summary.protocolLine).toContain("nicht erforderlich");
    expect(summary.decisionsLine).toContain("1 zur Prüfung");
    expect(summary.attentionLine).toContain("Freigabe");
  });
});
