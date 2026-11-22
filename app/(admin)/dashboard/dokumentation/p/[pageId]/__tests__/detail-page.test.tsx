/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  resolveTenantDocumentationHubRouteAccess: vi.fn(),
  resolveTenantDocumentationActor: vi.fn(),
  actorCanDiscoverPage: vi.fn(),
  resolvePageEffectiveAccess: vi.fn(),
  resolvePublishAudienceView: vi.fn(),
  enrichTipTapMentionLabels: vi.fn(),
  findFirstPage: vi.fn(),
  findUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/tenant-documentation/route-access", () => ({
  resolveTenantDocumentationHubRouteAccess: mocks.resolveTenantDocumentationHubRouteAccess,
}));

vi.mock("@/lib/tenant-documentation/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tenant-documentation/authorization")>();
  return {
    ...actual,
    resolveTenantDocumentationActor: mocks.resolveTenantDocumentationActor,
    accessLevelPermits: actual.accessLevelPermits,
  };
});

vi.mock("@/lib/tenant-documentation/page-visibility-service", () => ({
  actorCanDiscoverPage: mocks.actorCanDiscoverPage,
}));

vi.mock("@/lib/tenant-documentation/page-access-service", () => ({
  resolvePageEffectiveAccess: mocks.resolvePageEffectiveAccess,
}));

vi.mock("@/lib/tenant-documentation/publish-audience", () => ({
  resolvePublishAudienceView: mocks.resolvePublishAudienceView,
  publishAudienceToLabel: (audience: { mode: string }) =>
    audience.mode === "club" ? "Gesamtverein" : "Org-Einheiten",
}));

vi.mock("@/lib/collaboration/mentions/enrich-mention-labels", () => ({
  enrichTipTapMentionLabels: mocks.enrichTipTapMentionLabels,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantDocumentationPage: { findFirst: mocks.findFirstPage },
    user: { findUnique: mocks.findUser },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));

vi.mock("@/components/admin/tenant-documentation/TenantDocumentationWorkspaceClient", () => ({
  TenantDocumentationWorkspaceClient: (props: {
    pageTitle: string;
    publishedHtml: string | null;
  }) => (
    <div data-testid="tenant-documentation-workspace">
      <h1 data-testid="workspace-page-title">{props.pageTitle}</h1>
      <div data-testid="workspace-published-html">{props.publishedHtml ?? ""}</div>
    </div>
  ),
}));

import TenantDocumentationPage from "../page";

const defaultPageRow = {
  id: "page-first",
  spaceId: "space-1",
  title: "Sitzungsprotokolle",
  space: { title: "Vereinsleitung" },
  publishedVersion: null,
  parent: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveTenantDocumentationHubRouteAccess.mockResolvedValue({
    kind: "granted",
    tenantId: "tenant-1",
    actorUserId: "user-1",
    permissionKeys: [
      "tenant_documentation.view",
      "tenant_documentation.edit",
      "tenant_documentation.publish",
      "tenant_documentation.manage",
    ],
    session: { user: { id: "user-1" } },
  });
  mocks.resolveTenantDocumentationActor.mockResolvedValue({
    identity: { tenantId: "tenant-1", userId: "user-1", personId: null },
    membership: { tenantId: "tenant-1", personId: null, orgUnitIds: new Set(), teamIds: new Set(), roleAssignments: [] },
    permissionKeys: ["tenant_documentation.manage"],
    graph: { tenantId: "tenant-1", folders: new Map(), documents: new Map(), folderGrants: new Map(), documentGrants: new Map() },
    isCanonicalTenantClubAdmin: true,
  });
  mocks.actorCanDiscoverPage.mockResolvedValue(true);
  mocks.resolvePageEffectiveAccess.mockResolvedValue("MANAGE");
  mocks.resolvePublishAudienceView.mockResolvedValue({
    explicit: null,
    inherited: { mode: "club" },
    effective: { mode: "club" },
  });
  mocks.enrichTipTapMentionLabels.mockImplementation(async (_tenantId, value) => value);
  mocks.findFirstPage.mockResolvedValue(defaultPageRow);
  mocks.findUser.mockResolvedValue({
    firstName: "Club",
    lastName: "Admin",
    email: "club-admin@fixture.local",
  });
});

describe("TenantDocumentationDetailPage", () => {
  it("renders workspace with page title for Club Admin discover path (initial open)", async () => {
    const ui = await TenantDocumentationPage({
      params: Promise.resolve({ pageId: "page-first" }),
    });
    render(ui);

    expect(screen.getByTestId("tenant-documentation-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-page-title")).toHaveTextContent("Sitzungsprotokolle");
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("renders the same destination on reload semantics (re-invoke server component)", async () => {
  const first = await TenantDocumentationPage({
      params: Promise.resolve({ pageId: "page-first" }),
    });
    render(first);
    expect(screen.getByTestId("workspace-page-title")).toHaveTextContent("Sitzungsprotokolle");

    const second = await TenantDocumentationPage({
      params: Promise.resolve({ pageId: "page-first" }),
    });
    render(second);
    expect(screen.getAllByTestId("workspace-page-title")).toHaveLength(2);
  });

  it("calls notFound when the page is not discoverable", async () => {
    mocks.actorCanDiscoverPage.mockResolvedValue(false);

    await expect(
      TenantDocumentationPage({ params: Promise.resolve({ pageId: "page-first" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});