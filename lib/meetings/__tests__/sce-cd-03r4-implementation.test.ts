import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hashMeetingDecisionContent } from "@/lib/meetings/meeting-content-hash";
import { shouldInvalidateDecisionApproval } from "@/lib/meetings/meeting-decision-approval-service";
import {
  MEETING_DOCUMENTATION_TEXT_MAX,
  parseOptionalMeetingDocumentationText,
} from "@/lib/meetings/meeting-documentation-text";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-CD-03R4 decision/action documentation", () => {
  it("schema migration adds rationale and action documentation columns", () => {
    const sql = read(
      "prisma/migrations/20261113120000_sce_cd_03r4_decision_action_documentation/migration.sql",
    );
    expect(sql).toContain('"rationale"');
    expect(sql).toContain('"expectedOutcome"');

    const schema = read("prisma/schema.prisma");
    const decisionBlock = schema.slice(
      schema.indexOf("model MeetingDecision {"),
      schema.indexOf("/// Immutable approver vote on an individual Beschluss"),
    );
    expect(decisionBlock).toMatch(/rationale\s+String\?/);

    const actionBlock = schema.slice(
      schema.indexOf("model MeetingAction {"),
      schema.indexOf("model Task {"),
    );
    expect(actionBlock).toMatch(/description\s+String\?/);
    expect(actionBlock).toMatch(/expectedOutcome\s+String\?/);
    expect(actionBlock).not.toMatch(/contentRevision/);
  });

  it("approval fingerprint includes rationale", () => {
    const base = hashMeetingDecisionContent({
      title: "T",
      description: "D",
      rationale: null,
      revision: 1,
    });
    const withRationale = hashMeetingDecisionContent({
      title: "T",
      description: "D",
      rationale: "Weil",
      revision: 1,
    });
    expect(base).not.toBe(withRationale);
  });

  it("invalidates approval when rationale changes after approval", () => {
    const approvedHash = hashMeetingDecisionContent({
      title: "Budget",
      description: "Genehmigt",
      rationale: "A",
      revision: 2,
    });
    const invalidate = shouldInvalidateDecisionApproval({
      approvedContentHash: approvedHash,
      title: "Budget",
      description: "Genehmigt",
      rationale: "B",
      approvalContentRevision: 2,
      approvalRequired: true,
      fieldsChanged: true,
    });
    expect(invalidate).toBe(true);
  });

  it("normalizes optional documentation text and enforces max length", () => {
    expect(parseOptionalMeetingDocumentationText("  ")).toEqual({ ok: true, value: null });
    expect(parseOptionalMeetingDocumentationText("ok")).toEqual({ ok: true, value: "ok" });
    const tooLong = "x".repeat(MEETING_DOCUMENTATION_TEXT_MAX + 1);
    const result = parseOptionalMeetingDocumentationText(tooLong);
    expect(result.ok).toBe(false);
  });

  it("routes enforce validation and workspace lock for Massnahmen", () => {
    const patchRoute = read("app/api/meetings/[id]/actions/[actionId]/route.ts");
    expect(patchRoute).toContain("parseOptionalMeetingDocumentationText");
    expect(patchRoute).toContain("canEditMeetingDocumentation");
    expect(patchRoute).toContain("requireMeetingAccess");

    const decisionPatch = read("app/api/meetings/[id]/decisions/[decisionId]/route.ts");
    expect(decisionPatch).toContain("rationale");
    expect(decisionPatch).toContain("shouldInvalidateDecisionApproval");
  });

  it("workspace UI exposes inline documentation editing", () => {
    const sections = read("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx");
    expect(sections).toContain("Dokumentation bearbeiten");
    expect(sections).toContain("meeting-action-edit-docs-");
    expect(sections).toContain("Begründung");
    expect(sections).toContain("Erwartetes Ergebnis");
  });
});
