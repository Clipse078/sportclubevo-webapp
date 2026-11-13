import { describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createFinanceCommitment } from "@/lib/finance/services/finance-commitment-service";
import {
  linkSupplierBillExternalReferenceToCommitment,
  listSupplierBillEvidenceForCommitment,
} from "@/lib/finance/services/finance-commitment-supplier-bill-evidence-service";
import { FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE } from "@/lib/finance/commitment/finance-supplier-bill-evidence-contract";
import {
  commitmentCtx,
  commitmentYearId,
  createCommitmentMockStore,
  makeCommitmentMockDb,
} from "@/lib/finance/__tests__/finance-07b-commitment-mock-db";

describe("FIN-07E supplier bill evidence links (existing schema)", () => {
  it("links SUPPLIER_BILL row on obligation chain without lifecycle mutation", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Pitch maintenance",
      amountMinor: 50_000,
      currency: "CHF",
      commitmentDate: "2026-04-01",
    });

    const { linkId } = await linkSupplierBillExternalReferenceToCommitment(
      db as never,
      commitmentCtx(),
      {
        commitmentId: created.id,
        externalReference: " INV-2026-0042 ",
      },
    );
    expect(linkId).toBeTruthy();
    expect(created.lifecycleStatus).toBe("DRAFT");

    const supplierLinks = store.financeEconomicEvidenceLink.filter(
      (l) => l.evidenceKind === "SUPPLIER_BILL",
    );
    expect(supplierLinks).toHaveLength(1);
    expect(supplierLinks[0]?.evidenceRefType).toBe(
      FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE.evidenceRefType,
    );
    expect(supplierLinks[0]?.evidenceRefId).toBe("INV-2026-0042");
    expect(supplierLinks[0]?.economicObligationKey).toBe(created.economicObligationKey);
    expect(store.auditLog.some((a) => a.action === "EVIDENCE_LINKED")).toBe(true);
  });

  it("lists links for commitment detail read model", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Kits",
      amountMinor: 10_000,
      currency: "CHF",
      commitmentDate: "2026-05-01",
    });
    await linkSupplierBillExternalReferenceToCommitment(db as never, commitmentCtx(), {
      commitmentId: created.id,
      externalReference: "BEXIO-991",
    });
    const rows = await listSupplierBillEvidenceForCommitment(db as never, commitmentCtx(), created.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.externalReference).toBe("BEXIO-991");
  });

  it("denies link without manage permission", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "A",
      amountMinor: 100,
      currency: "CHF",
      commitmentDate: "2026-01-01",
    });
    await expect(
      linkSupplierBillExternalReferenceToCommitment(
        db as never,
        commitmentCtx({
          permissionKeys: new Set([PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_COMMITMENT_VIEW]),
        }),
        { commitmentId: created.id, externalReference: "X-1" },
      ),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });

  it("rejects duplicate tenant-wide supplier bill reference", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store) as never;
    const dbWithDuplicate = {
      ...db,
      financeEconomicEvidenceLink: {
        ...db.financeEconomicEvidenceLink,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const existing = store.financeEconomicEvidenceLink.find(
            (l) =>
              l.tenantId === data.tenantId &&
              l.evidenceKind === data.evidenceKind &&
              l.evidenceRefType === data.evidenceRefType &&
              l.evidenceRefId === data.evidenceRefId,
          );
          if (existing) {
            const err = new Error("duplicate") as Error & { code: string };
            err.code = "P2002";
            throw err;
          }
          return db.financeEconomicEvidenceLink.create({ data });
        },
      },
    };
    const created = await createFinanceCommitment(dbWithDuplicate, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "First",
      amountMinor: 100,
      currency: "CHF",
      commitmentDate: "2026-01-01",
    });
    await linkSupplierBillExternalReferenceToCommitment(dbWithDuplicate, commitmentCtx(), {
      commitmentId: created.id,
      externalReference: "DUP-1",
    });
    const second = await createFinanceCommitment(dbWithDuplicate, commitmentCtx(), {
      financeYearId: commitmentYearId,
      title: "Second",
      amountMinor: 200,
      currency: "CHF",
      commitmentDate: "2026-02-01",
    });
    await expect(
      linkSupplierBillExternalReferenceToCommitment(dbWithDuplicate, commitmentCtx(), {
        commitmentId: second.id,
        externalReference: "DUP-1",
      }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });
});
