// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunicationCenterImapSecurity } from "@prisma/client";
import CommunicationMailboxSettingsForm from "@/components/admin/communication/inbox/CommunicationMailboxSettingsForm";

const STORED_SECRET = "stored-mailbox-secret-value";

const initialMailboxes = [
  {
    id: "mb-1",
    displayName: "IT Postfach",
    emailAddress: "it@example.com",
    status: "ACTIVE",
    imapHost: "imap.example.com",
    imapPort: 993,
    imapSecurity: CommunicationCenterImapSecurity.TLS,
    imapUsername: "it@example.com",
    hasCredential: true,
    lastSyncSuccessAt: null,
    lastSyncErrorMessage: null,
  },
];

function renderForm() {
  return render(<CommunicationMailboxSettingsForm initialMailboxes={initialMailboxes} />);
}

describe("SCE-COMM-15-UX-01R1 — mailbox credential password visibility", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ mailboxes: initialMailboxes }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("masks the credential input by default", () => {
    renderForm();
    expect(screen.getByTestId("mailbox-credential-input")).toHaveAttribute("type", "password");
    expect(screen.getByTestId("mailbox-credential-visibility-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reveals only the value currently entered in the form when toggled", async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByTestId("mailbox-credential-input");
    await user.type(input, "fresh-entry-secret");

    await user.click(screen.getByTestId("mailbox-credential-visibility-toggle"));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("fresh-entry-secret");
    expect(screen.getByTestId("mailbox-credential-visibility-toggle")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("masks the credential again when toggled a second time", async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = screen.getByTestId("mailbox-credential-visibility-toggle");
    const input = screen.getByTestId("mailbox-credential-input");
    await user.type(input, "fresh-entry-secret");

    await user.click(toggle);
    await user.click(toggle);

    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByTestId("mailbox-credential-visibility-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("supports keyboard activation on the visibility toggle", async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByTestId("mailbox-credential-input");
    await user.type(input, "keyboard-secret");

    const toggle = screen.getByTestId("mailbox-credential-visibility-toggle");
    toggle.focus();
    await user.keyboard("{Enter}");

    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-label", "Passwort verbergen");
  });

  it("does not render stored mailbox credentials in the page", () => {
    renderForm();
    expect(screen.queryByDisplayValue(STORED_SECRET)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(STORED_SECRET);
    expect(screen.getByText(/Zugangsdaten hinterlegt/)).toBeInTheDocument();
  });

  it("resets visibility when the credential field is cleared after save", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ mailbox: initialMailboxes[0] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ mailboxes: initialMailboxes }),
        }),
    );

    renderForm();
    const input = screen.getByTestId("mailbox-credential-input");
    await user.type(input, "temporary-secret");
    await user.click(screen.getByTestId("mailbox-credential-visibility-toggle"));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Postfach speichern" }));

    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByTestId("mailbox-credential-visibility-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
