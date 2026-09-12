import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/components/ui/Dialog", () => ({
  Dialog: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children?: React.ReactNode;
  }) => (
    <div data-testid="dialog">
      <span>{title}</span>
      <span>{description}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

import NativeBillingDeleteBankAccountButton from "../NativeBillingDeleteBankAccountButton";

describe("NativeBillingDeleteBankAccountButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows masked identifiers in confirmation copy", () => {
    const html = renderToStaticMarkup(
      <NativeBillingDeleteBankAccountButton
        accountId="ba-1"
        label="UBS CHF"
        legalEntityLabel="SportClubEvo"
        referenceStrategy="QRR"
        ibanMasked="****2957"
        qrIbanMasked="****0049"
      />,
    );

    expect(html).toContain("Bankkonto löschen");
    expect(html).toContain("Nur unbenutzte Bankkonten können gelöscht werden.");
    expect(html).toContain("****2957");
    expect(html).toContain("****0049");
    expect(html).not.toContain("CH9300762011623852957");
  });
});
