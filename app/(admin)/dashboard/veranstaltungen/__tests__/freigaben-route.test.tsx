/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  getEffectivePermissions: vi.fn(),
  getActiveTenant: vi.fn(),
  resolvePersonId: vi.fn(),
  prisma: {
    sceActivityGovernanceTypeConfig: {
      findUnique: vi.fn(),
    },
    sceActivityGovernanceRevision: {
      findMany: vi.fn(),
    },
    person: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("@/lib/auth/get-request-auth-session", () => ({
  getRequestAuthSession: mocks.auth,
}));
vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getEffectivePermissions,
}));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));
vi.mock("@/lib/sce/activity-governance/persistence/resolve-person-id", () => ({
  resolvePersonIdForUser: mocks.resolvePersonId,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));

import VeranstaltungenFreigabenPage from "@/app/(admin)/dashboard/veranstaltungen/freigaben/page";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const TENANT_ID = "tenant-fca";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: "user-1", activeTenantId: TENANT_ID },
  });
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mocks.getActiveTenant.mockResolvedValue({ id: TENANT_ID, timezone: "Europe/Zurich" });
  mocks.resolvePersonId.mockResolvedValue("person-validator");
  mocks.prisma.sceActivityGovernanceTypeConfig.findUnique.mockResolvedValue({
    validators: [{ personId: "person-validator" }],
  });
  mocks.prisma.sceActivityGovernanceRevision.findMany.mockResolvedValue([]);
  mocks.prisma.person.findMany.mockResolvedValue([]);
});

describe("Veranstaltungen Freigaben route", () => {
  it("does not redirect an authorized validator to the dashboard", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE],
    });

    const ui = await VeranstaltungenFreigabenPage();
    render(ui);

    expect(mocks.redirect).not.toHaveBeenCalledWith("/dashboard");
    expect(screen.getByTestId("veranstaltungen-freigaben-page")).toBeInTheDocument();
    expect(screen.getByTestId("club-event-freigaben-empty")).toBeInTheDocument();
  });

  it("shows explicit unauthorized state instead of dashboard redirect", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.EVENTS_MANAGE],
    });

    const ui = await VeranstaltungenFreigabenPage();
    render(ui);

    expect(mocks.redirect).not.toHaveBeenCalledWith("/dashboard");
    expect(screen.getByTestId("club-event-freigaben-unauthorized")).toBeInTheDocument();
    expect(screen.getByTestId("club-event-freigaben-unauthorized")).toHaveAttribute(
      "data-reason",
      "MISSING_APPROVE_PERMISSION",
    );
  });

  it("shows approval workspace when pending items exist", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE],
    });
    mocks.prisma.sceActivityGovernanceRevision.findMany.mockResolvedValue([
      {
        id: "rev-1",
        creatorPersonId: "person-creator",
        lifecycleState: "PENDING_APPROVAL",
        submittedAt: new Date("2026-10-01T12:00:00.000Z"),
        revisionNumber: 1,
        payloadSnapshot: {
          title: "Generalversammlung",
          schedule: { startDate: "2026-11-01", allDay: true },
        },
      },
    ]);
    mocks.prisma.person.findMany.mockResolvedValue([
      { id: "person-creator", firstName: "Max", lastName: "Muster" },
    ]);

    const ui = await VeranstaltungenFreigabenPage();
    render(ui);

    expect(screen.getByTestId("club-event-freigaben-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("club-event-approval-item-rev-1")).toBeInTheDocument();
    expect(screen.getByTestId("club-event-approval-decision-form")).toBeInTheDocument();
  });
});
