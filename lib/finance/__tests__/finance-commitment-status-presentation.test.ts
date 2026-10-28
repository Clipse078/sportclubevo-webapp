import { describe, expect, it } from "vitest";
import {
  financeCommitmentApprovalBadgeVariant,
  financeCommitmentLifecycleBadgeVariant,
} from "@/lib/finance/commitment/finance-commitment-status-presentation";

describe("finance commitment status presentation (FIN-07C R2)", () => {
  it("maps lifecycle states to canonical semantic badge variants", () => {
    expect(financeCommitmentLifecycleBadgeVariant("DRAFT")).toBe("default");
    expect(financeCommitmentLifecycleBadgeVariant("SUBMITTED")).toBe("info");
    expect(financeCommitmentLifecycleBadgeVariant("ACTIVE")).toBe("success");
    expect(financeCommitmentLifecycleBadgeVariant("CANCELLED")).toBe("outline");
  });

  it("maps approval states to canonical semantic badge variants", () => {
    expect(financeCommitmentApprovalBadgeVariant("NOT_REQUIRED")).toBeNull();
    expect(financeCommitmentApprovalBadgeVariant("PENDING")).toBe("warning");
    expect(financeCommitmentApprovalBadgeVariant("APPROVED")).toBe("success");
    expect(financeCommitmentApprovalBadgeVariant("REJECTED")).toBe("danger");
  });
});
