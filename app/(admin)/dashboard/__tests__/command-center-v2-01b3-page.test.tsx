/**
 * @vitest-environment jsdom
 *
 * SCE-DASHBOARD-V2-01B3 — dashboard page SSR regression guard.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getActiveTenant: vi.fn(),
  getActorContext: vi.fn(),
  getPersonFirstNameByUserId: vi.fn(),
  getDashboardMeetingSummary: vi.fn(),
  getCurrentSwissFootballSeason: vi.fn(),
  prisma: {
    registration: { count: vi.fn(), findMany: vi.fn() },
    newsArticle: { count: vi.fn(), findMany: vi.fn() },
    event: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/tenants/active-tenant", () => ({ getActiveTenant: mocks.getActiveTenant }));
vi.mock("@/lib/visibility/get-actor-context", () => ({ getActorContext: mocks.getActorContext }));
vi.mock("@/lib/people/queries", () => ({
  getPersonFirstNameByUserId: mocks.getPersonFirstNameByUserId,
}));
vi.mock("@/lib/dashboard/strategic-summary", () => ({
  getDashboardMeetingSummary: mocks.getDashboardMeetingSummary,
}));
vi.mock("@/lib/seasons/season-logic", () => ({
  getCurrentSwissFootballSeason: mocks.getCurrentSwissFootballSeason,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const TENANT = {
  id: "tenant-fca",
  key: "fc-allschwil",
  name: "FC Allschwil",
  locale: "",
  timezone: "Europe/Zurich",
};

const SESSION_USER = {
  id: "user-1",
  firstName: "FC Allschwil",
  email: "admin@example.com",
  permissionKeys: ["meetings.view"],
  roleKeys: ["club-admin"],
};

const ACTOR = {
  tenantId: TENANT.id,
  userId: SESSION_USER.id,
  permissionKeys: ["meetings.view"],
};

const SAMPLE_EVENT = {
  id: "ev-1",
  title: "Training U17",
  startAt: new Date("2026-09-08T18:00:00.000Z"),
  location: null,
  type: "TRAINING" as const,
  updatedAt: new Date("2026-09-07T10:00:00.000Z"),
};

const SAMPLE_MEETING = {
  id: "mt-1",
  title: "Vorstandssitzung",
  meetingDate: new Date("2026-09-10T19:00:00.000Z"),
  location: null,
  slug: "vorstand",
  createdAt: new Date("2026-09-01T12:00:00.000Z"),
};

function primeDashboardMocks() {
  mocks.auth.mockResolvedValue({ user: SESSION_USER });
  mocks.getActiveTenant.mockResolvedValue(TENANT);
  mocks.getActorContext.mockResolvedValue(ACTOR);
  mocks.getPersonFirstNameByUserId.mockResolvedValue("Michael");
  mocks.getCurrentSwissFootballSeason.mockReturnValue({ label: "2025/2026" });
  mocks.getDashboardMeetingSummary.mockResolvedValue({
    recentMeetings: [SAMPLE_MEETING],
    upcomingMeetings: [SAMPLE_MEETING],
  });

  mocks.prisma.registration.count.mockResolvedValue(2);
  mocks.prisma.registration.findMany.mockResolvedValue([]);
  mocks.prisma.newsArticle.count.mockResolvedValue(0);
  mocks.prisma.newsArticle.findMany.mockResolvedValue([]);
  mocks.prisma.event.count.mockResolvedValue(1);
  mocks.prisma.event.findMany.mockResolvedValue([SAMPLE_EVENT]);
}

async function renderDashboardPage() {
  vi.resetModules();
  const { default: DashboardPage } = await import("../page");
  const ui = await DashboardPage();
  render(ui as React.ReactElement);
}

beforeEach(() => {
  vi.clearAllMocks();
  primeDashboardMocks();
});

describe("SCE-DASHBOARD-V2-01B3 — dashboard page runtime safety", () => {
  it("renders for authenticated tenant users with blank locale and nullable locations", async () => {
    await expect(renderDashboardPage()).resolves.not.toThrow();
    expect(screen.getByText(/Guten/i)).toBeTruthy();
    expect(screen.getByText("Heute im Verein")).toBeTruthy();
    expect(screen.getByText("Nächste Termine")).toBeTruthy();
  });

  it("still renders when one dashboard dataset query fails", async () => {
    mocks.prisma.event.findMany.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if ("updatedAt" in where) {
        return Promise.reject(new Error("recent events unavailable"));
      }
      return Promise.resolve([SAMPLE_EVENT]);
    });

    await expect(renderDashboardPage()).resolves.not.toThrow();
    expect(screen.getByText("Aktuelle Aktivitäten")).toBeTruthy();
  });
});
