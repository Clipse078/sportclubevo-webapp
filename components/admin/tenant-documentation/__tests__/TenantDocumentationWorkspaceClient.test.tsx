/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="collab-editor-stub">Editor</div>,
}));

vi.mock("@/components/admin/tenant-documentation/useTenantDocCollaboration", () => ({
  useTenantDocCollaboration: () => ({
    ydoc: {},
    fragmentName: "default",
    presences: [],
    saveStatus: "saved",
    markDirty: vi.fn(),
  }),
}));

import { TenantDocumentationWorkspaceClient } from "../TenantDocumentationWorkspaceClient";

describe("TenantDocumentationWorkspaceClient", () => {
  it("opens in read mode by default even when canEdit is true (Club Admin)", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ spaces: [{ id: "space-1", title: "Vereinsleitung" }], tree: [] }),
      }),
    );
    render(
      <TenantDocumentationWorkspaceClient
        pageId="page-1"
        spaceId="space-1"
        pageTitle="Sitzungsprotokolle"
        spaceTitle="Vereinsleitung"
        breadcrumb={["Vereinsleitung", "Sitzungsprotokolle"]}
        canCreatePages
        canEdit
        canPublish
        displayName="Club Admin"
        publishedHtml={null}
        publishedMeta={null}
        publishedContent={null}
        visibilitySummary={{
          inheritedLabel: "Gesamtverein",
          effectiveLabel: "Gesamtverein",
          hasExplicit: false,
        }}
      />,
    );

    expect(screen.getByText("Noch nicht veröffentlicht")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bearbeiten/i })).toBeInTheDocument();
    expect(screen.queryByTestId("collab-editor-stub")).not.toBeInTheDocument();
  });
});