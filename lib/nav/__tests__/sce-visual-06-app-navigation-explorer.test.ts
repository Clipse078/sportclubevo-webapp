/**
 * SCE-VISUAL-06 — application explorer search + module resolution
 */

import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  auditNavigationCompleteness,
} from "@/lib/nav/app-navigation-model";
import {
  buildExplorerSearchIndex,
  filterExplorerSearchIndex,
  resolveExplorerModulesForDomain,
} from "@/lib/nav/app-navigation-explorer";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

describe("SCE-VISUAL-06 application explorer", () => {
  const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
  const domainLabel = (domain: { fallbackLabel: string }) => domain.fallbackLabel;

  it("builds permission-filtered search index from canonical model", () => {
    const index = buildExplorerSearchIndex(model, domainLabel);
    expect(index.some((hit) => hit.label === "Wochenplaner" && hit.kind === "module")).toBe(true);
    expect(index.every((hit) => hit.href.startsWith("/"))).toBe(true);
  });

  it("matches modules and child destinations without exposing unauthorized routes", () => {
    const limited = buildAppNavigationModelForUser([PERMISSIONS.TASKS_VIEW], "club");
    const index = buildExplorerSearchIndex(limited, domainLabel);
    const hits = filterExplorerSearchIndex(index, "aufg");
    expect(hits.some((hit) => hit.label.toLowerCase().includes("aufg"))).toBe(true);
    expect(hits.some((hit) => hit.label === "Website")).toBe(false);
  });

  it("resolves planning modules for domain pane", () => {
    const planning = model.domains.find((d) => d.id === "planning");
    expect(planning).toBeTruthy();
    const modules = resolveExplorerModulesForDomain(planning!);
    expect(modules.map((m) => m.label)).toEqual(
      expect.arrayContaining(["Wochenplaner", "Trainings", "Spiele"]),
    );
  });

  it("keeps navigation completeness at zero orphans for club admin", () => {
    const sections = getVisibleNavSections(CLUB_ADMIN_KEYS, "club");
    const report = auditNavigationCompleteness(sections, model);
    expect(report.orphanedDestinations).toEqual([]);
    expect(report.reachableDestinations).toBe(report.canonicalVisibleDestinations);
  });

  it("reports derived visible leaf count for club admin fixture", () => {
    const sections = getVisibleNavSections(CLUB_ADMIN_KEYS, "club");
    const report = auditNavigationCompleteness(sections, model);
    expect(report.canonicalVisibleDestinations).toBeGreaterThan(0);
  });
});
