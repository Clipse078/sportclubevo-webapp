import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
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

import NativeBillingDeleteLegalEntityButton from "../NativeBillingDeleteLegalEntityButton";

describe("NativeBillingDeleteLegalEntityButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows confirmation dialog copy without bank identifiers", () => {
    const html = renderToStaticMarkup(
      <NativeBillingDeleteLegalEntityButton
        entityKey="orphan-entity"
        displayName="Orphan GmbH"
        legalName="Orphan GmbH"
      />,
    );

    expect(html).toContain("Rechtsträger löschen");
    expect(html).toContain("Rechtsträger wirklich löschen?");
    expect(html).toContain("Orphan GmbH");
    expect(html).not.toMatch(/iban|qrIban|CH\d/i);
  });
});
