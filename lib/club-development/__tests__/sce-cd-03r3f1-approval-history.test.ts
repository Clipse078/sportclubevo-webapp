import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeInitiativeAggregateStatus,
} from "@/lib/club-development/initiative-approval-service";
import {
  computeProcessAggregateStatus,
} from "@/lib/club-development/process-approval-service";
import { evaluateMeetingApprovalRule } from "@/lib/meetings/meeting-approval-rules";
import {
  filterVotesForContentRevision,
  groupApprovalVotesByRevision,
} from "@/lib/club-development/club-development-approval-vote-revision";

const ROOT = join(__dirname, "../../..");

function readSrc(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("SCE-CD-03R3F1 approval history integrity", () => {
  it("schema enforces revision-scoped vote uniqueness", () => {
    const schema = readSrc("prisma/schema.prisma");
    expect(schema).toContain("@@unique([initiativeId, approverPersonId, contentRevision])");
    expect(schema).toContain("@@unique([processId, approverPersonId, contentRevision])");
    expect(schema).toContain("legacyRevisionUnscoped");
  });

  it("does not delete approval votes on material edit or resubmit", () => {
    for (const file of [
      "app/api/initiatives/[id]/route.ts",
      "app/api/initiatives/[id]/approval/route.ts",
      "app/api/club-development/processes/[id]/route.ts",
      "app/api/club-development/processes/[id]/approval/route.ts",
    ]) {
      const src = readSrc(file);
      expect(src).not.toMatch(/initiativeApprovalVote\.deleteMany/);
      expect(src).not.toMatch(/clubDevelopmentProcessApprovalVote\.deleteMany/);
    }
  });

  it("approval services scope aggregate votes to current content revision", () => {
    expect(readSrc("lib/club-development/initiative-approval-service.ts")).toContain(
      "filterVotesForContentRevision",
    );
    expect(readSrc("lib/club-development/process-approval-service.ts")).toContain(
      "filterVotesForContentRevision",
    );
    expect(readSrc("lib/club-development/initiative-approval-service.ts")).toContain(
      "initiativeId_approverPersonId_contentRevision",
    );
  });

  it("old revision votes do not count toward new revision aggregate", () => {
    const pool = ["p1", "p2"];
    const allVotes = [
      { approverPersonId: "p1", decision: "APPROVED" as const, contentRevision: 1 },
      { approverPersonId: "p2", decision: "APPROVED" as const, contentRevision: 1 },
    ];
    const current = filterVotesForContentRevision(allVotes, 2);
    expect(current).toHaveLength(0);

    const status = computeInitiativeAggregateStatus({
      approvalRequired: true,
      approvalRule: "ALL",
      approverPersonIds: pool,
      votes: current,
    });
    expect(status).toBe("PENDING");
  });

  it("same approver can vote again on a new revision", () => {
    const votes = [
      { approverPersonId: "p1", decision: "APPROVED" as const, contentRevision: 1 },
      { approverPersonId: "p1", decision: "CHANGES_REQUESTED" as const, contentRevision: 2 },
    ];
    const { currentVotes, history } = groupApprovalVotesByRevision(votes, 2);
    expect(currentVotes).toHaveLength(1);
    expect(currentVotes[0]!.decision).toBe("CHANGES_REQUESTED");
    expect(history).toHaveLength(1);
    expect(history[0]!.contentRevision).toBe(1);
  });

  it("prevents duplicate votes within the same revision via compound unique key", () => {
    const migration = readSrc(
      "prisma/migrations/20261112160000_sce_cd_03r3f1_approval_vote_revision_scope/migration.sql",
    );
    expect(migration).toContain("initiativeId_approverPersonId_contentRevision");
    expect(migration).toContain("processId_approverPersonId_contentRevision");
  });

  it("ALL / ONE / MAJORITY quorum rules unchanged", () => {
    const pool = ["a", "b", "c"];
    expect(
      evaluateMeetingApprovalRule({
        rule: "ONE",
        approverPersonIds: pool,
        votes: [{ approverPersonId: "a", decision: "APPROVED" }],
      }).satisfied,
    ).toBe(true);
    expect(
      evaluateMeetingApprovalRule({
        rule: "ALL",
        approverPersonIds: pool,
        votes: [
          { approverPersonId: "a", decision: "APPROVED" },
          { approverPersonId: "b", decision: "APPROVED" },
        ],
      }).satisfied,
    ).toBe(false);
    expect(
      evaluateMeetingApprovalRule({
        rule: "MAJORITY",
        approverPersonIds: pool,
        votes: [
          { approverPersonId: "a", decision: "APPROVED" },
          { approverPersonId: "b", decision: "APPROVED" },
        ],
      }).satisfied,
    ).toBe(true);
  });

  it("CHANGES_REQUESTED surfaces in aggregate for current revision only", () => {
    const status = computeProcessAggregateStatus({
      approvalRequired: true,
      approvalRule: "ALL",
      approverPersonIds: ["p1", "p2"],
      votes: [
        { approverPersonId: "p1", decision: "CHANGES_REQUESTED" },
        { approverPersonId: "p2", decision: "APPROVED" },
      ],
    });
    expect(status).toBe("CHANGES_REQUESTED");
  });

  it("historical grouping keeps comments and revision numbers", () => {
    const decidedAt = new Date("2025-01-02T10:00:00Z");
    const { history } = groupApprovalVotesByRevision(
      [
        {
          approverPersonId: "p1",
          decision: "APPROVED",
          contentRevision: 1,
          comment: "OK",
          decidedAt,
        },
      ],
      2,
    );
    expect(history[0]!.votes[0]!.comment).toBe("OK");
    expect(history[0]!.votes[0]!.decidedAt).toEqual(decidedAt);
  });

  it("Meetings 2.0 protocol approval service remains unchanged", () => {
    const protocol = readSrc("lib/meetings/meeting-protocol-approval-service.ts");
    expect(protocol).toContain("meetingId_approverPersonId");
    expect(protocol).not.toContain("contentRevision");
  });

  it("initiative and process creation paths remain registered", () => {
    expect(readSrc("app/(admin)/vereinsleitung/initiativen/new/page.tsx")).toBeTruthy();
    expect(readSrc("app/(admin)/vereinsleitung/prozesse/new/page.tsx")).toBeTruthy();
    expect(readSrc("lib/club-development/process-queries.ts")).toContain("getClubDevelopmentProcesses");
  });

  it("UI exposes compact historical audit section", () => {
    expect(readSrc("components/admin/club-development/ClubDevelopmentApprovalVoteHistory.tsx")).toContain(
      "club-development-approval-vote-history",
    );
    expect(readSrc("components/admin/initiatives/InitiativeApprovalPanel.tsx")).toContain(
      "ClubDevelopmentApprovalVoteHistory",
    );
  });
});
