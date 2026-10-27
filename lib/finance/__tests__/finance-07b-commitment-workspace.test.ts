import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveFinanceNavigation } from "@/lib/finance/navigation/finance-navigation";
import { FINANCE_07B_IMPLEMENTATION } from "@/lib/finance/commitment/finance-commitment-architecture-contract";
import { FINANCE_COMMITMENT_EDIT_POLICY } from "@/lib/finance/commitment/finance-commitment-edit-policy";
import { FINANCE_COMMITMENT_07B_EXPECTED_EVENT_DECISION } from "@/lib/finance/commitment/finance-commitment-expected-event-decision";
import {
  activateFinanceCommitmentAfterApproval,
  approveFinanceCommitmentForDomain,
  cancelFinanceCommitment,
  createFinanceCommitment,
  deleteDraftFinanceCommitment,
  submitFinanceCommitment,
  updateFinanceCommitment,
} from "@/lib/finance/services/finance-commitment-service";
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

describe("FIN-07B commitment workspace & lifecycle", () => {
  it("documents expected-event deferral", () => {
    expect(FINANCE_COMMITMENT_07B_EXPECTED_EVENT_DECISION.synchronizeOnActive).toBe(false);
    expect(FINANCE_07B_IMPLEMENTATION.expectedEventSyncDeferred).toBe("FIN-07F");
  });

  it("exposes commitments in finance navigation when capability and permission match", () => {
    const items = resolveFinanceNavigation({
      ctx: commitmentCtx(),
      enabledCapabilities: new Set(["OVERVIEW", "COMMITMENTS"]),
      setupConfigured: true,
    });
    expect(items.some((i) => i.key === "commitments")).toBe(true);
  });

  it("hides commitments navigation without view permission", () => {
    const items = resolveFinanceNavigation({
      ctx: commitmentCtx({
        permissionKeys: new Set([PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_COMMITMENT_MANAGE]),
      }),
      enabledCapabilities: new Set(["OVERVIEW", "COMMITMENTS"]),
      setupConfigured: true,
    });
    expect(items.some((i) => i.key === "commitments")).toBe(false);
  });

  it("creates draft commitment with stable obligation key and audit", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Team kits",
      amountMinor: 250_000,
      currency: "EUR",
      commitmentDate: "2026-03-01",
    });
    expect(created.lifecycleStatus).toBe("DRAFT");
    expect(created.economicObligationKey).toContain("obl_tenant-commit-a_");
    expect(store.financeEconomicEvidenceLink).toHaveLength(1);
    expect(store.auditLog.some((a) => a.action === "COMMITMENT_CREATED")).toBe(true);
  });

  it("denies cross-tenant reads via service guards", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "A",
      amountMinor: 100,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await expect(
      updateFinanceCommitment(
        db as never,
        commitmentCtx({ tenantId: commitmentTenantB }),
        created.id,
        { title: "Hacked" },
      ),
    ).rejects.toMatchObject({ code: "FINANCE_NOT_FOUND" });
  });

  it("keeps economicObligationKey immutable on update", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Original",
      amountMinor: 100,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    const updated = await updateFinanceCommitment(db as never, commitmentCtx(), created.id, {
      title: "Renamed",
    });
    expect(updated.economicObligationKey).toBe(created.economicObligationKey);
  });

  it("blocks edit after submit", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Submit me",
      amountMinor: 100,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await submitFinanceCommitment(db as never, commitmentCtx(), created.id);
    await expect(
      updateFinanceCommitment(db as never, commitmentCtx(), created.id, { title: "Nope" }),
    ).rejects.toMatchObject({ code: "FINANCE_COMMITMENT_NOT_EDITABLE" });
  });

  it("submit sets SUBMITTED + PENDING and audits", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Review",
      amountMinor: 500,
      currency: "EUR",
      commitmentDate: "2026-02-01",
    });
    const submitted = await submitFinanceCommitment(db as never, commitmentCtx(), created.id);
    expect(submitted.lifecycleStatus).toBe("SUBMITTED");
    expect(submitted.approvalStatus).toBe("PENDING");
    expect(store.auditLog.some((a) => a.action === "COMMITMENT_SUBMITTED")).toBe(true);
  });

  it("requires approval before ACTIVE", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Active gate",
      amountMinor: 500,
      currency: "EUR",
      commitmentDate: "2026-02-01",
    });
    await submitFinanceCommitment(db as never, commitmentCtx(), created.id);
    await expect(
      activateFinanceCommitmentAfterApproval(db as never, commitmentCtx(), created.id),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("activates only after APPROVED approval status", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Approve path",
      amountMinor: 500,
      currency: "EUR",
      commitmentDate: "2026-02-01",
    });
    await submitFinanceCommitment(db as never, commitmentCtx(), created.id);
    await approveFinanceCommitmentForDomain(
      db as never,
      commitmentCtx({
        permissionKeys: new Set([
          PERMISSIONS.FINANCE_VIEW,
          PERMISSIONS.FINANCE_COMMITMENT_VIEW,
          PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
        ]),
      }),
      created.id,
    );
    const active = await activateFinanceCommitmentAfterApproval(
      db as never,
      commitmentCtx(),
      created.id,
    );
    expect(active.lifecycleStatus).toBe("ACTIVE");
  });

  it("finance.approve does not substitute commitment approve", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Budget approver",
      amountMinor: 100,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await submitFinanceCommitment(db as never, commitmentCtx(), created.id);
    await expect(
      approveFinanceCommitmentForDomain(
        db as never,
        commitmentCtx({
          permissionKeys: new Set([PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_APPROVE]),
        }),
        created.id,
      ),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });

  it("cancels without hard delete", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Cancel me",
      amountMinor: 100,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await submitFinanceCommitment(db as never, commitmentCtx(), created.id);
    const cancelled = await cancelFinanceCommitment(db as never, commitmentCtx(), created.id);
    expect(cancelled.lifecycleStatus).toBe("CANCELLED");
    expect(store.financeCommitment.some((c) => c.id === created.id)).toBe(true);
  });

  it("allows delete only for never-submitted drafts", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Draft delete",
      amountMinor: 100,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await deleteDraftFinanceCommitment(db as never, commitmentCtx(), created.id);
    expect(store.financeCommitment).toHaveLength(0);
  });

  it("documents conservative edit policy", () => {
    expect(FINANCE_COMMITMENT_EDIT_POLICY.submittedEditableIn07B).toBe(false);
  });

  it("BINARY_CONTROL_COMPLIANCE — no new binary checkboxes in workspace UI", () => {
    const panel = readRepo("components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("formats commitment amounts via budget planning presentation module", () => {
    const panel = readRepo("components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx");
    expect(panel).toContain("formatFinanceManagementPlanningMinor");
    expect(panel).toContain("@/lib/finance/budget/budget-amount-presentation");
    expect(panel).not.toContain("finance-money-presentation");
  });

  it("FIN-07B R4/R6 — create form uses canonical SCE inputs (not invalid sce-input class)", () => {
    const panel = readRepo("components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx");
    expect(panel).toContain("SceTextInput");
    expect(panel).toContain("SceTextarea");
    expect(panel).toContain("data-finance-commitment-form");
    expect(panel).toContain("min-w-0");
    expect(panel).not.toContain("sce-input");
    expect(panel).toContain("COMMITMENT_CREATE_DIALOG_SIZE");
    expect(panel).toContain("data-finance-commitment-create-dialog");
    expect(panel).toContain("data-finance-commitment-form-section");
    expect(panel).toContain("CommitmentFormSection");
    expect(panel).toContain('formSectionPrimary');
    expect(panel).not.toContain('size="lg"');
    expect(panel).not.toContain('size="workspace"');
  });

  it("FIN-07B R6 — bounded create dialog and compact workspace status summary", () => {
    const panel = readRepo("components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx");
    expect(panel).toContain("data-finance-commitment-status-summary");
    expect(panel).toContain("FINANCE_SUMMARY_STRIP_SURFACE_CLASS");
    expect(panel).toContain("data-finance-commitment-delete-dialog");
    expect(panel).toContain("data-finance-commitment-lifecycle-menu");
    expect(panel).toContain('floatingLayer="composer"');
    expect(panel).toContain("snapshot.baseCurrency");
    expect(panel).toContain("editSaveConfirm");
  });

  it("FIN-07B R5 — presents calendar dates via canonical Finance locale formatter", () => {
    const panel = readRepo("components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx");
    expect(panel).toContain("formatFinanceCalendarDateLabel");
    expect(panel).toContain("finance-year-period-display");
    expect(panel).not.toMatch(/\{detail\.commitmentDateIso\}/);
    expect(panel).not.toMatch(/\{detail\.expectedPaymentDateIso\}/);
    expect(panel).not.toMatch(/\{item\.expectedPaymentDateIso\}/);
  });

  it("FIN-07B R5 — detail sheet uses compact hierarchy (no status/amount section cards)", () => {
    const panel = readRepo("components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx");
    expect(panel).toContain("data-finance-commitment-detail");
    expect(panel).toContain("data-finance-commitment-detail-actions");
    expect(panel).not.toContain('detailSectionStatus');
    expect(panel).not.toContain('detailSectionAmount');
  });
});
