import {
  BillingContractStatus,
  BillingCustomerStatus,
  BillingInterval,
  InvoiceStatus,
  LegalEntityStatus,
  LegalEntityType,
  SwissVatTreatment,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  BILLING_CONTRACT_STATUS_KEYS,
  BILLING_CUSTOMER_STATUS_KEYS,
  LEGAL_ENTITY_STATUS_KEYS,
  LEGAL_ENTITY_TYPE_KEYS,
  NATIVE_INVOICE_STATUS_KEYS,
  SWISS_VAT_TREATMENT_KEYS,
  formatBillingPeriodDisplay,
  presentBillingCustomerStatus,
  presentBillingContractStatus,
  presentBillingInterval,
  presentInvoiceDisplayNumber,
  presentLegalEntityContractSelectorLabel,
  presentLegalEntityStatus,
  presentLegalEntityType,
  presentNativeInvoiceStatus,
  presentSwissVatTreatment,
} from "../native-billing-presentation";

describe("native billing presentation", () => {
  it("maps every InvoiceStatus enum value to a German label", () => {
    const prismaValues = Object.values(InvoiceStatus);
    expect(prismaValues.sort()).toEqual([...NATIVE_INVOICE_STATUS_KEYS].sort());

    for (const status of prismaValues) {
      const { label } = presentNativeInvoiceStatus(status);
      expect(label).not.toBe(status);
      expect(label).not.toMatch(/^[A-Z0-9_]+$/);
    }

    expect(presentNativeInvoiceStatus("DRAFT").label).toBe("Entwurf");
    expect(presentNativeInvoiceStatus("PARTIALLY_PAID").label).toBe("Teilweise bezahlt");
    expect(presentNativeInvoiceStatus("CREDITED").label).toBe("Gutgeschrieben");
  });

  it("maps every BillingCustomerStatus enum value to a German label", () => {
    const prismaValues = Object.values(BillingCustomerStatus);
    expect(prismaValues.sort()).toEqual([...BILLING_CUSTOMER_STATUS_KEYS].sort());

    for (const status of prismaValues) {
      const { label } = presentBillingCustomerStatus(status);
      expect(label).not.toBe(status);
      expect(label).not.toMatch(/^[A-Z0-9_]+$/);
    }

    expect(presentBillingCustomerStatus("ACTIVE").label).toBe("Aktiv");
  });

  it("maps every BillingContractStatus enum value to a German label", () => {
    const prismaValues = Object.values(BillingContractStatus);
    expect(prismaValues.sort()).toEqual([...BILLING_CONTRACT_STATUS_KEYS].sort());

    for (const status of prismaValues) {
      const { label } = presentBillingContractStatus(status);
      expect(label).not.toBe(status);
      expect(label).not.toMatch(/^[A-Z0-9_]+$/);
    }

    expect(presentBillingContractStatus("ACTIVE").label).toBe("Aktiv");
    expect(presentBillingContractStatus("TERMINATED").label).toBe("Beendet");
  });

  it("maps every SwissVatTreatment enum value", () => {
    const prismaValues = Object.values(SwissVatTreatment);
    expect(prismaValues.sort()).toEqual([...SWISS_VAT_TREATMENT_KEYS].sort());

    for (const treatment of prismaValues) {
      expect(presentSwissVatTreatment(treatment)).toBe("MWST 8.1 %");
    }
  });

  it("maps billing interval MONTHLY", () => {
    expect(presentBillingInterval(BillingInterval.MONTHLY)).toBe("Monatlich");
  });

  it("formats invoice display numbers for drafts", () => {
    expect(presentInvoiceDisplayNumber(null, "DRAFT")).toBe("Entwurf");
    expect(presentInvoiceDisplayNumber("", "DRAFT")).toBe("Entwurf");
    expect(presentInvoiceDisplayNumber(null, "OPEN")).toBe("Noch keine Rechnungsnummer");
    expect(presentInvoiceDisplayNumber("RE-2026-00042")).toBe("RE-2026-00042");
  });

  it("formats billing periods for operators", () => {
    const label = formatBillingPeriodDisplay("2026-01-01", "2026-01-31");
    expect(label).toContain("01");
    expect(label).toContain("31");
    expect(label).toContain("–");
  });

  it("maps every LegalEntityStatus enum value to a German label", () => {
    const prismaValues = Object.values(LegalEntityStatus);
    expect(prismaValues.sort()).toEqual([...LEGAL_ENTITY_STATUS_KEYS].sort());

    for (const status of prismaValues) {
      const { label } = presentLegalEntityStatus(status);
      expect(label).not.toBe(status);
      expect(label).not.toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("maps every LegalEntityType enum value", () => {
    const prismaValues = Object.values(LegalEntityType);
    expect(prismaValues.sort()).toEqual([...LEGAL_ENTITY_TYPE_KEYS].sort());

    for (const entityType of prismaValues) {
      expect(presentLegalEntityType(entityType)).not.toBe(entityType);
    }
  });

  it("builds contract selector labels without internal keys", () => {
    expect(
      presentLegalEntityContractSelectorLabel({
        displayName: "Display",
        legalName: "Legal",
      }),
    ).toBe("Display — Legal");
  });
});
