// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ZielgruppeCreateComposerDialog from "@/components/admin/communication/zielgruppen/ZielgruppeCreateComposerDialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/communication/zielgruppen/actions", () => ({
  classifyZielgruppeBulkEmailsAction: vi.fn(),
  persistZielgruppeBulkExternalContactsAction: vi.fn(),
}));

vi.mock("@/components/admin/communication/audience/CommunicationAudienceSelector", () => ({
  default: () => <div data-testid="communication-audience-selector-stub" />,
  CommunicationAudienceDiscoverPanel: () => null,
}));

describe("ZielgruppeCreateComposerDialog", () => {
  it("exposes accessible dialog name and workspace composer layout", () => {
    render(<ZielgruppeCreateComposerDialog open onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: /Neue Zielgruppe/i })).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-save")).toBeInTheDocument();
    expect(document.querySelector('[data-sce-zielgruppe-form-layout="composer"]')).toBeTruthy();
  });
});
