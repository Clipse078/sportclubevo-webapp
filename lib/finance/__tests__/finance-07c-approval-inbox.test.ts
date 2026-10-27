import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  approveFinanceCommitment,
  rejectFinanceCommitment,
  submitFinanceCommitment,
  createFinanceCommitment,
} from "@/lib/finance/services/finance-commitment-service";
import {
  getFinanceCommitmentDetail,
  loadFinanceCommitmentApprovalInboxSnapshot,
} from "@/lib/finance/services/finance-commitment-query-service";
import {
  commitmentCtx,
  commitmentTenantB,
  commitmentYearId,
  createCommitmentMockStore,
  makeCommitmentMockDb,
} from "@/lib/finance/__tests__/finance-07b-commitment-mock-db";

const repoRoot = process.cwd();

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const approverCtx = () =>
  commitmentCtx({
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
    ]),
  });

async function createSubmittedPending(db: ReturnType<typeof makeCommitmentMockDb>, title: string) {
  const created = await createFinanceCommitment(db as never, commitmentCtx(), {
    financeYearId: commitmentYearId,
    title,
    amountMinor: 12_500,
    currency: "EUR",
    commitmentDate: "2026-04-01",
    partyName: "Supplier AG",
  });
  await submitFinanceCommitment(db as never, commitmentCtx(), created.id);
  return created.id;
}

describe("FIN-07C approval inbox & decisions", () => {
  it("lists only SUBMITTED + PENDING commitments in approval inbox", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const pendingId = await createSubmittedPending(db, "Pending review");
    await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Still draft",
      amountMinor: 100,
      currency: "EUR",
      commitmentDate: "2026-04-01",
    });
    const inbox = await loadFinanceCommitmentApprovalInboxSnapshot(
      db as never,
      approverCtx(),
    );
    expect(inbox.pendingCount).toBe(1);
    expect(inbox.pendingItems.map((i) => i.id)).toEqual([pendingId]);
  });

  it("requires finance.commitment.approve for inbox access", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    await expect(
      loadFinanceCommitmentApprovalInboxSnapshot(db as never, commitmentCtx()),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });

  it("approves PENDING → APPROVED with append-only decision row", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const id = await createSubmittedPending(db, "Approve me");
    const updated = await approveFinanceCommitment(db as never, approverCtx(), id);
    expect(updated.approvalStatus).toBe("APPROVED");
    expect(store.financeCommitmentApprovalDecision).toHaveLength(1);
    expect(store.financeCommitmentApprovalDecision[0]?.decidedByUserId).toBe("user-1");
    expect(store.auditLog.some((a) => a.action === "COMMITMENT_APPROVED")).toBe(true);
  });

  it("rejects PENDING → REJECTED and persists reason", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const id = await createSubmittedPending(db, "Reject me");
    const updated = await rejectFinanceCommitment(db as never, approverCtx(), id, {
      comment: "Amount exceeds current budget envelope.",
    });
    expect(updated.approvalStatus).toBe("REJECTED");
    expect(store.financeCommitmentApprovalDecision[0]?.comment).toBe(
      "Amount exceeds current budget envelope.",
    );
    expect(store.auditLog.some((a) => a.action === "COMMITMENT_REJECTED")).toBe(true);
  });

  it("requires rejection reason", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const id = await createSubmittedPending(db, "No reason");
    await expect(
      rejectFinanceCommitment(db as never, approverCtx(), id, { comment: "  " }),
    ).rejects.toMatchObject({ code: "FINANCE_COMMITMENT_VALIDATION" });
  });

  it("blocks duplicate approval decisions", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const id = await createSubmittedPending(db, "Once only");
    await approveFinanceCommitment(db as never, approverCtx(), id);
    await expect(
      approveFinanceCommitment(db as never, approverCtx(), id),
    ).rejects.toMatchObject({ code: "FINANCE_COMMITMENT_APPROVAL_ALREADY_DECIDED" });
    expect(store.financeCommitmentApprovalDecision).toHaveLength(1);
  });

  it("denies cross-tenant approval", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const id = await createSubmittedPending(db, "Tenant A");
    await expect(
      approveFinanceCommitment(
        db as never,
        commitmentCtx({
          tenantId: commitmentTenantB,
          permissionKeys: new Set([
            PERMISSIONS.FINANCE_VIEW,
            PERMISSIONS.FINANCE_COMMITMENT_VIEW,
            PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
          ]),
        }),
        id,
      ),
    ).rejects.toMatchObject({ code: "FINANCE_NOT_FOUND" });
  });

  it("finance.approve does not substitute finance.commitment.approve", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const id = await createSubmittedPending(db, "Budget key");
    await expect(
      approveFinanceCommitment(
        db as never,
        commitmentCtx({
          permissionKeys: new Set([PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_APPROVE]),
        }),
        id,
      ),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });

  it("surfaces approval outcome on commitment detail", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const id = await createSubmittedPending(db, "Detail sync");
    await rejectFinanceCommitment(db as never, approverCtx(), id, {
      comment: "Please revise amount.",
    });
    const detail = await getFinanceCommitmentDetail(db as never, approverCtx(), id);
    expect(detail.approvalStatus).toBe("REJECTED");
    expect(detail.approvalDecisionHistory).toHaveLength(1);
    expect(detail.approvalDecisionHistory[0]?.comment).toBe("Please revise amount.");
    expect(detail.canApprove).toBe(false);
  });

  it("does not expose FIN-07D policy configuration surfaces", () => {
    const inboxPanel = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentApprovalInboxPanel.tsx",
    );
    expect(inboxPanel).not.toContain("policy.manage");
    expect(inboxPanel).not.toContain("FINANCE_COMMITMENT_POLICY");
  });

  it("BINARY_CONTROL_COMPLIANCE — no new binary checkboxes in FIN-07C UI", () => {
    const inboxPanel = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentApprovalInboxPanel.tsx",
    );
    const workspace = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx",
    );
    expect(inboxPanel).not.toContain('type="checkbox"');
    expect(workspace).not.toContain('type="checkbox"');
  });

  it("declares approval inbox route under commitments IA", () => {
    expect(readRepo("app/(admin)/dashboard/finance/commitments/approvals/page.tsx")).toContain(
      "FinanceCommitmentApprovalInboxPanel",
    );
  });

  it("FIN-06E — deployment preflight module remains without bypass secrets", () => {
    const preflight = readRepo("lib/server/deployment-public-action-preflight.ts");
    expect(preflight).not.toMatch(/BYPASS|skipAuth|disableAuth/i);
  });
});
