/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NativeBillingInvoiceCommunicationComposerDialog from "../NativeBillingInvoiceCommunicationComposerDialog";

describe("NativeBillingInvoiceCommunicationComposerDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("disables send while request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(
      <NativeBillingInvoiceCommunicationComposerDialog
        open
        mode="compose"
        invoiceKey="inv-key"
        fromAddress="billing@sportclubevo.com"
        initial={{ to: "a@test.com", cc: "", subject: "Betreff", message: "Hallo" }}
        onClose={() => {}}
        onSent={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Senden" }));
    expect(screen.getByRole("button", { name: "Wird gesendet…" })).toBeDisabled();

    resolveFetch(
      new Response(JSON.stringify({ communication: { id: "c1" } }), { status: 200 }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Wird gesendet…" })).not.toBeInTheDocument();
    });
  });

  it("shows validation error from API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Ungültige E-Mail-Adresse" }), { status: 400 }),
        ),
      ),
    );

    render(
      <NativeBillingInvoiceCommunicationComposerDialog
        open
        mode="compose"
        invoiceKey="inv-key"
        fromAddress="billing@sportclubevo.com"
        initial={{ to: "bad", cc: "", subject: "Betreff", message: "Hallo" }}
        onClose={() => {}}
        onSent={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Senden" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ungültige E-Mail-Adresse");
  });
});
