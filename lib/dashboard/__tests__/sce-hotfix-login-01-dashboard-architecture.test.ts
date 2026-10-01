import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardView = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

const loadPersonalActions = readFileSync(
  join(process.cwd(), "lib/personal-actions/load-personal-actions.ts"),
  "utf8",
);

const attendanceObligations = readFileSync(
  join(process.cwd(), "lib/personal-actions/sources/attendance-obligations.ts"),
  "utf8",
);

const loginForm = readFileSync(
  join(process.cwd(), "components/auth/LoginForm.tsx"),
  "utf8",
);

describe("SCE-HOTFIX-LOGIN-01 R5 dashboard architecture", () => {
  it("streams command center behind Suspense while shell renders first", () => {
    expect(clubDashboardView).toContain("Suspense");
    expect(clubDashboardView).toContain("ClubDashboardCommandCenterAsync");
    expect(clubDashboardView).toContain("ClubDashboardCommandCenterSkeleton");
    expect(clubDashboardView).not.toContain("getPersonalCommandCenterData");
  });

  it("dashboard personal-actions hot path caps task rows and skips heavy non-task counts", () => {
    expect(loadPersonalActions).toContain("actionableItemCap");
    expect(loadPersonalActions).toContain("personal-actions-tasks-count");
    expect(loadPersonalActions).toContain("perSourceCap == null");
  });

  it("attendance obligations keep bounded horizon queries", () => {
    expect(attendanceObligations).toContain("PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS");
    expect(attendanceObligations).toContain("startAt: { gte: now, lte: until }");
  });

  it("login stall timer does not blame dashboard SSR after credentials succeed", () => {
    expect(loginForm).toContain("clearPostLoginStallTimer()");
    const signInBlock = loginForm.slice(
      loginForm.indexOf("await signIn"),
      loginForm.indexOf("window.location.assign"),
    );
    expect(signInBlock).toContain("clearPostLoginStallTimer()");
  });
});
