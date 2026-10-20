import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT,
  SCE_DESIGN_SYSTEM_07_R1_GOVERNANCE,
  SCE_DESIGN_SYSTEM_07_R1_PO_FINDINGS,
  SCE_DESIGN_SYSTEM_07_R1_PO_REVIEW,
  SCE_DESIGN_SYSTEM_07_R1_REPRESENTATIVE_ADOPTION,
} from "@/lib/design-system/sce-design-system-07-r1-meta";
import {
  SCE_EMPTY_STATE_DISTINCTIONS,
  SCE_FEEDBACK_CONTEXT_RULE,
} from "@/lib/design-system/sce-feedback-status-foundation";
import { SCE_DESIGN_SYSTEM_07_GOVERNANCE } from "@/lib/design-system/sce-design-system-07-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-07-R1 visual convergence guardrails", () => {
  it("records PO R1 findings and draft PR state", () => {
    expect(SCE_DESIGN_SYSTEM_07_R1_PO_FINDINGS.DS07_INITIAL_VISUAL_REVIEW).toBe("PARTIAL_PASS");
    expect(SCE_DESIGN_SYSTEM_07_R1_PO_FINDINGS.DS07_R1_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_07_R1_PO_REVIEW.PR).toBe("885");
    expect(SCE_DESIGN_SYSTEM_07_R1_PO_REVIEW.PR_STATE).toBe("DRAFT");
    expect(SCE_DESIGN_SYSTEM_07_R1_PO_REVIEW.R1_FEATURE_HEAD_FULL).toMatch(
      /^[0-9a-f]{40}$|PENDING_COMMIT/,
    );
  });

  it("locks empty-state containment and feedback nearest-context rules", () => {
    expect(SCE_EMPTY_STATE_DISTINCTIONS.EMPTY_STATE_CONTAINMENT_REQUIRED).toBe("YES");
    expect(SCE_EMPTY_STATE_DISTINCTIONS.EMPTY_STATE_OVERSIZING_ALLOWED).toBe("NO");
    expect(SCE_FEEDBACK_CONTEXT_RULE.FEEDBACK_NEAREST_MEANINGFUL_CONTEXT).toBe("YES");
    expect(SCE_FEEDBACK_CONTEXT_RULE.TOAST_AS_DEFAULT_ERROR_PATTERN).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_07_R1_GOVERNANCE.DS08_OWNS_DENSE_ADMIN_TABLE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_07_R1_GOVERNANCE.DS07_TABLE_REDESIGN_CLAIM).toBe("NO");
  });

  it("wires filtered no-results, reset action, and list-surface containment", () => {
    const people = readSrc("components/admin/users/TenantUsersSearchableList.tsx");
    expect(people).toContain('data-sce-feedback-surface="people-access-list"');
    expect(people).toContain('variant="FILTERED_NO_RESULTS"');
    expect(people).toContain("people-access-reset-filters");
    expect(people).toContain("contained");
    expect(readSrc("components/admin/planning-hub/PlanningHubFilteredEmptyState.tsx")).toContain(
      "contained",
    );
  });

  it("keeps readiness visual DNA without local tournament restyling", () => {
    const email = readSrc("components/admin/communication/email-sender/EmailSenderWorkspace.tsx");
    const planung = readSrc("components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx");
    expect(email).toContain("SceReadinessStatusPanel");
    expect(planung).toContain("SceReadinessStatusPanel");
    expect(planung).not.toContain("SCE_SURFACE_STANDARD_PANEL");
    expect(readSrc("components/sce/feedback/SceReadinessStatusPanel.tsx")).toContain(
      "data-sce-readiness-visual-dna",
    );
  });

  it("defines people-list loading geometry and DS-08 handoff debt", () => {
    expect(readSrc("components/sce/feedback/SceSkeleton.tsx")).toContain("people-access-list");
    expect(readSrc("components/admin/users/PeopleAccessListLoadingState.tsx")).toContain(
      'recipe="people-access-list"',
    );
    expect(SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT.length).toBeGreaterThanOrEqual(8);
    expect(SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT).toContain("row density");
  });

  it("preserves toggle-first and DS-07 compliance", () => {
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_07_R1_REPRESENTATIVE_ADOPTION.FILTERED_NO_RESULTS_RESET_ACTION).toContain(
      "people-access-reset-filters",
    );
  });

  it("documents DS-08 handoff from DS-07 roadmap", () => {
    const handoff = readFileSync(
      join(ROOT, "docs/design/SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md"),
      "utf8",
    );
    expect(handoff).toContain("DS-07 does NOT claim");
    expect(handoff).toContain("Personen & Zugänge");
  });
});
