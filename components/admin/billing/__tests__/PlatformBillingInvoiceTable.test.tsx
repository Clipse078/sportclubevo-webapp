/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PlatformBillingInvoiceTable from "../PlatformBillingInvoiceTable";

describe("PlatformBillingInvoiceTable", () => {
  it("renders empty invoice state", () => {
    render(<PlatformBillingInvoiceTable invoices={[]} loadFailed={false} />);
    expect(screen.getByText("Noch keine Rechnungen vorhanden.")).toBeInTheDocument();
  });

  it("renders invoice rows and external link", () => {
    render(
      <PlatformBillingInvoiceTable
        loadFailed={false}
        invoices={[
          {
            number: "INV-9",
            status: "mystery",
            invoiceDate: "2025-01-01T00:00:00.000Z",
            total: 10000,
            amountPaid: 0,
            amountOpen: 10000,
            dueDate: "2025-01-15T00:00:00.000Z",
            currency: "chf",
            hostedInvoiceUrl: "https://invoice.stripe.com/i/test",
          },
        ]}
      />,
    );
    expect(screen.getByText("INV-9")).toBeInTheDocument();
    expect(screen.getByText("mystery")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rechnung INV-9 in Stripe öffnen/i })).toHaveAttribute(
      "href",
      "https://invoice.stripe.com/i/test",
    );
  });
});
