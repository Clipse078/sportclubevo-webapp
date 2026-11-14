import { describe, expect, it } from "vitest";
import { taskWorkspaceHref, parseTaskWorkspaceReturnTo } from "@/lib/tasks/task-navigation";
import { sanitizeInternalAppReturnPath } from "@/lib/navigation/safe-internal-app-return-path";

describe("task workspace navigation", () => {
  it("appends safe returnTo for sprint board deep links", () => {
    const href = taskWorkspaceHref("task-1", {
      returnTo: "/vereinsleitung/sprints/my-sprint/board",
    });
    expect(href).toBe(
      "/dashboard/aufgaben/task-1?returnTo=%2Fvereinsleitung%2Fsprints%2Fmy-sprint%2Fboard",
    );
  });

  it("rejects open redirects in returnTo", () => {
    expect(sanitizeInternalAppReturnPath("https://evil.example")).toBeNull();
    expect(sanitizeInternalAppReturnPath("/vereinsleitung/sprints/ok")).toBe(
      "/vereinsleitung/sprints/ok",
    );
  });

  it("parses returnTo search param", () => {
    expect(parseTaskWorkspaceReturnTo({ returnTo: "/vereinsleitung/sprints/x" })).toBe(
      "/vereinsleitung/sprints/x",
    );
  });
});