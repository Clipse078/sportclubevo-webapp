import { describe, expect, it } from "vitest";
import {
  EXECUTE_CONFIRMATION,
  OPERATION_ID,
  PROTECTED_FCA_CUSTOMER_KEY,
  STAGE_CANONICAL_DATABASE_FINGERPRINT,
  SYNTHETIC_CAMT_IMPORT_FILENAME,
  SYNTHETIC_CUSTOMER_KEY,
  SYNTHETIC_INVOICE_KEYS,
  evaluateCamtImportDeletable,
  evaluateCleanupExecuteGuards,
  inventoryHasSyntheticTargets,
  type CleanupInventory,
} from "../swiss-cleanup-01-stage-acceptance-data";

const STAGE_URL =
  "postgresql://u:p@ep-wispy-hall-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";

function stageEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    APP_ENV: "stage",
    SCE_DATA_ENVIRONMENT: "STAGE",
    DATABASE_URL: STAGE_URL,
    SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
    SCE_OPERATION_AUTHORIZATION: `${OPERATION_ID}:stage`,
    ...overrides,
  };
}

describe("SWISS-CLEANUP-01 execute guards", () => {
  it("dry-run does not evaluate execute-only gates as FAIL", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: false,
      confirm: null,
      env: {},
      databaseUrl: undefined,
    });
    expect(results.every((r) => r.status !== "FAIL")).toBe(true);
  });

  it("execute PASS with full stage authorization", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: true,
      confirm: EXECUTE_CONFIRMATION,
      env: stageEnv(),
      databaseUrl: STAGE_URL,
    });
    expect(results.filter((r) => r.status === "FAIL")).toEqual([]);
  });

  it("wrong environment FAIL", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: true,
      confirm: EXECUTE_CONFIRMATION,
      env: stageEnv({ APP_ENV: "prod", SCE_DATA_ENVIRONMENT: "PRODUCTION" }),
      databaseUrl: STAGE_URL,
    });
    expect(results.some((r) => r.gate === "APP_ENV_STAGE" && r.status === "FAIL")).toBe(
      true,
    );
  });

  it("wrong DB fingerprint FAIL", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: true,
      confirm: EXECUTE_CONFIRMATION,
      env: stageEnv({ SCE_DATA_DATABASE_FINGERPRINT: "0000000000000000" }),
      databaseUrl: STAGE_URL,
    });
    expect(
      results.some((r) => r.gate === "DATABASE_FINGERPRINT_STAGE" && r.status === "FAIL"),
    ).toBe(true);
  });

  it("missing authorization FAIL", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: true,
      confirm: EXECUTE_CONFIRMATION,
      env: stageEnv({ SCE_OPERATION_AUTHORIZATION: "wrong:stage" }),
      databaseUrl: STAGE_URL,
    });
    expect(
      results.some((r) => r.gate === "OPERATION_AUTHORIZATION" && r.status === "FAIL"),
    ).toBe(true);
  });

  it("missing confirm FAIL", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: true,
      confirm: "WRONG",
      env: stageEnv(),
      databaseUrl: STAGE_URL,
    });
    expect(
      results.some((r) => r.gate === "EXACT_CONFIRMATION" && r.status === "FAIL"),
    ).toBe(true);
  });
});

describe("SWISS-CLEANUP-01 synthetic allowlist / FCA exclusion", () => {
  it("exact synthetic invoice keys are allowlisted", () => {
    expect(SYNTHETIC_INVOICE_KEYS).toContain("inv-sce-test-01g");
    expect(SYNTHETIC_INVOICE_KEYS).toContain("inv-sce-test-01g-2");
  });

  it("mixed reconciliation import -> not deletable", () => {
    const result = evaluateCamtImportDeletable({
      filename: SYNTHETIC_CAMT_IMPORT_FILENAME,
      transactions: [
        {
          id: "tx-1",
          invoiceId: "inv-fca",
          invoiceKey: "inv-fca-2026-001-2",
          invoiceNumber: "2026-000002",
          invoiceCustomerKey: PROTECTED_FCA_CUSTOMER_KEY,
        },
      ],
      syntheticCustomerKey: SYNTHETIC_CUSTOMER_KEY,
      protectedInvoiceIds: new Set(["inv-fca"]),
    });
    expect(result.deletable).toBe(false);
    expect(result.reason).toMatch(/protected|non-synthetic/i);
  });

  it("synthetic-only camt import is deletable", () => {
    const result = evaluateCamtImportDeletable({
      filename: SYNTHETIC_CAMT_IMPORT_FILENAME,
      transactions: [
        {
          id: "tx-syn",
          invoiceId: "inv-syn",
          invoiceKey: "inv-sce-test-01g-2",
          invoiceNumber: "2026-000004",
          invoiceCustomerKey: SYNTHETIC_CUSTOMER_KEY,
        },
      ],
      syntheticCustomerKey: SYNTHETIC_CUSTOMER_KEY,
      protectedInvoiceIds: new Set(["inv-fca"]),
    });
    expect(result.deletable).toBe(true);
    expect(result.transactionIds).toEqual(["tx-syn"]);
  });
});

describe("SWISS-CLEANUP-01 inventory helpers", () => {
  const emptyInventory: CleanupInventory = {
    legalEntityKey: "sportclubevo-by-tulip-digital",
    databaseFingerprint: STAGE_CANONICAL_DATABASE_FINGERPRINT,
    fca: {
      customerFound: true,
      customerKey: PROTECTED_FCA_CUSTOMER_KEY,
      contractFound: true,
      contractNumber: "FCA-2026-001",
      invoiceVoid: null,
      invoiceActive: null,
    },
    synthetic: {
      customer: null,
      contract: null,
      invoices: [],
      paymentIds: [],
      paymentInstructionIds: [],
      deliveryIds: [],
      reconciliationImports: [],
      reconciliationTransactionIds: [],
      auditLogIds: [],
      billingProfileIds: [],
      tenantLinkIds: [],
    },
    invoiceSequences: [{ legalEntityId: "le", sequenceYear: 2026, lastNumber: 4 }],
    blockingErrors: [],
    auditCleanupDecision: "test",
  };

  it("idempotent when nothing to clean", () => {
    expect(inventoryHasSyntheticTargets(emptyInventory)).toBe(false);
  });

  it("detects remaining synthetic customer", () => {
    expect(
      inventoryHasSyntheticTargets({
        ...emptyInventory,
        synthetic: {
          ...emptyInventory.synthetic,
          customer: {
            id: "c1",
            key: SYNTHETIC_CUSTOMER_KEY,
            displayName: "SCE Billing Test Club",
          },
        },
      }),
    ).toBe(true);
  });
});
