/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PlatformBillingOverviewTable from "../PlatformBillingOverviewTable";
import type { PlatformBillingTenantRow } from "@/lib/billing/platform-billing-overview-service";

const loadedRow: PlatformBillingTenantRow = {
  kind: "loaded",
  tenantId: "t1",
  tenantKey: "demo",
  tenantName: "Demo Club",
  summary: {
    tenantId: "t1",
    tenantKey: "demo",
    tenantName: "Demo Club",
    stripeCustomerId: "cus_1",
    subscriptions: [],
    latestInvoice: null,
    outstandingAmount: 0,
    overdueOpenInvoiceCount: 0,
    currency: "chf",
  },
};

describe("PlatformBillingOverviewTable", () => {
  it("renders empty subscription and invoice states", () => {
    render(<PlatformBillingOverviewTable rows={[loadedRow]} />);
    expect(screen.getByText("Demo Club")).toBeInTheDocument();
    expect(screen.getByText("Kein Abo")).toBeInTheDocument();
    expect(screen.getByText("Keine Rechnung")).toBeInTheDocument();
  });

  it("renders degraded row when tenant load failed", () => {
    const errorRow: PlatformBillingTenantRow = {
      kind: "error",
      tenantId: "t2",
      tenantKey: "bad",
      tenantName: "Broken Club",
      errorCode: "STRIPE_UNAVAILABLE",
      message: "Billing-Daten konnten nicht geladen werden.",
    };
    render(<PlatformBillingOverviewTable rows={[errorRow]} />);
    expect(screen.getByText("Billing-Daten konnten nicht geladen werden.")).toBeInTheDocument();
  });
});
