// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ZielgruppeBulkEmailDialog from "@/components/admin/communication/zielgruppen/ZielgruppeBulkEmailDialog";

const classifyMock = vi.fn();
const persistMock = vi.fn();

vi.mock("@/app/(admin)/dashboard/communication/zielgruppen/actions", () => ({
  classifyZielgruppeBulkEmailsAction: (...args: unknown[]) => classifyMock(...args),
  persistZielgruppeBulkExternalContactsAction: (...args: unknown[]) => persistMock(...args),
}));

describe("ZielgruppeBulkEmailDialog", () => {
  it("never surfaces NEXT_REDIRECT from classify action failures", async () => {
    classifyMock.mockResolvedValueOnce({ ok: false, message: "Tenant nicht gefunden." });
    const user = userEvent.setup();
    render(
      <ZielgruppeBulkEmailDialog open onOpenChange={() => {}} onApplied={() => {}} />,
    );
    await user.type(screen.getByTestId("zielgruppe-bulk-email-input"), "a@b.ch");
    await user.click(screen.getByTestId("zielgruppe-bulk-email-review"));
    await waitFor(() => {
      expect(screen.getByTestId("zielgruppe-bulk-email-error")).toHaveTextContent(
        "Tenant nicht gefunden.",
      );
    });
    expect(screen.queryByText("NEXT_REDIRECT")).not.toBeInTheDocument();
  });

  it("shows review summary and count-aware apply label", async () => {
    classifyMock.mockResolvedValueOnce({
      ok: true,
      data: [
        { raw: "a@b.ch", state: "NEW_EXTERNAL", normalized: "a@b.ch" },
        { raw: "bad", state: "INVALID", normalized: null },
      ],
    });
    const user = userEvent.setup();
    render(
      <ZielgruppeBulkEmailDialog open onOpenChange={() => {}} onApplied={() => {}} />,
    );
    await user.type(screen.getByTestId("zielgruppe-bulk-email-input"), "a@b.ch\nbad");
    await user.click(screen.getByTestId("zielgruppe-bulk-email-review"));
    await waitFor(() => {
      expect(screen.getByTestId("zielgruppe-bulk-email-summary")).toBeInTheDocument();
    });
    expect(screen.getByTestId("zielgruppe-bulk-email-apply")).toBeDisabled();
  });
});
