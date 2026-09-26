/**
 * SCE-ICONS-09 — final adoption audit, hardening & technical closure gates.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import {
  NAV_DESTINATION_SCE_ICON_BY_KEY,
  getNavDestinationSceIconName,
} from "@/lib/nav/nav-destination-sce-icons";
import {
  SCE_MASTER_SEMANTIC_MAPPING_AUDIT,
  summarizeSceSemanticMappingAudit,
} from "@/lib/nav/sce-master-semantic-mapping-audit";
import {
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import { SCE_ICON_REGISTRY, SCE_ICON_REGISTRY_NAMES } from "@/components/design-system/icons/registry";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

const UTILITY_REGISTRY_NAMES = [
  "search",
  "close",
  "more",
  "add",
  "edit",
  "profile",
  "role",
  "notification",
] as const;

const PROVISIONAL_DOMAIN_REGISTRY_NAMES = [
  "calendar",
  "event",
  "message",
  "document",
] as const;

const DEFERRED_SEMANTIC_DESTINATIONS = [
  "organisation",
  "veranstaltungen",
  "meetings",
  "vereine",
] as const;

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-ICONS-09 programme baseline", () => {
  it("keeps canonical approved master and registry totals", () => {
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(90);
    expect(SCE_ICON_REGISTRY_NAMES.length).toBeGreaterThanOrEqual(104);
    expect(readdirSync(join(process.cwd(), "public/images/icons")).filter((f) => f.endsWith(".svg")).length).toBe(
      90,
    );
  });

  it("maps every approved master through the registry with authoritative assets", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(SCE_ICON_REGISTRY[name]?.geometrySource).toBe("approved-master");
      expect(SCE_ICON_REGISTRY[name]?.masterAssetPath).toBe(SCE_APPROVED_MASTER_ASSETS[name]);
      expect(existsSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS[name]))).toBe(true);
    }
  });
});

describe("SCE-ICONS-09 registry & provisional glyph boundary", () => {
  it("preserves utility glyphs without approved-master geometry", () => {
    for (const name of UTILITY_REGISTRY_NAMES) {
      expect(SCE_ICON_REGISTRY_NAMES).toContain(name);
      expect(SCE_ICON_REGISTRY[name].geometrySource).not.toBe("approved-master");
    }
  });

  it("preserves legacy provisional domain registry names until explicit migration", () => {
    for (const name of PROVISIONAL_DOMAIN_REGISTRY_NAMES) {
      expect(SCE_ICON_REGISTRY_NAMES).toContain(name);
      expect(SCE_ICON_REGISTRY[name].geometrySource).not.toBe("approved-master");
    }
    expect(SCE_ICON_REGISTRY.events.geometrySource).toBe("approved-master");
  });

  it("keeps backward-compatible members/sponsoring aliases on approved masters", () => {
    expect(SCE_ICON_REGISTRY.members.geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.sponsoring.geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.member.geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.sponsor.geometrySource).toBe("approved-master");
  });
});

describe("SCE-ICONS-09 high-confidence adoption", () => {
  it("adopts every HIGH-confidence semantic audit row", () => {
    const high = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.filter((row) => row.confidence === "HIGH");
    expect(high.length).toBeGreaterThan(0);
    for (const row of high) {
      expect(row.adoptedNow, row.destination).toBe(true);
      if (row.proposedSceMaster) {
        expect(getNavDestinationSceIconName(row.destination)).toBe(row.proposedSceMaster);
      }
    }
  });

  it("adopts all semantic audit rows after SCE-ICONS-13 (zero deferred)", () => {
    const summary = summarizeSceSemanticMappingAudit();
    expect(summary.deferred).toBe(0);
    for (const destination of DEFERRED_SEMANTIC_DESTINATIONS) {
      const row = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.find((r) => r.destination === destination);
      expect(row?.adoptedNow).toBe(true);
      expect(getNavDestinationSceIconName(destination)).toBe(row?.proposedSceMaster);
    }
    expect(getNavDestinationSceIconName("competitions")).toBe("competition");
  });

  it("routes adopted nav destinations only through central mapping keys", () => {
    for (const [navKey, iconName] of Object.entries(NAV_DESTINATION_SCE_ICON_BY_KEY)) {
      expect(getNavDestinationSceIconName(navKey)).toBe(iconName);
      expect(SCE_ICON_REGISTRY[iconName].geometrySource).toBe("approved-master");
    }
  });
});

describe("SCE-ICONS-09 navigation completeness", () => {
  it("keeps 60/60/0 for club-admin permissions", () => {
    const permissionKeys = Object.values(PERMISSIONS) as PermissionKey[];
    const sections = getVisibleNavSections(permissionKeys, "club");
    const model = buildAppNavigationModelForUser(permissionKeys, "club");
    const report = auditNavigationCompleteness(sections, model);
    expect(report.canonicalVisibleDestinations).toBe(60);
    expect(report.reachableDestinations).toBe(60);
    expect(report.orphanedDestinations).toEqual([]);
  });
});

describe("SCE-ICONS-09 single source of truth", () => {
  it("uses SceIcon in nav and planning without runtime master SVG fetches", () => {
    const paths = [
      "components/admin/layout/AppShellNavigation.tsx",
      "components/admin/layout/GlobalNavDrawer.tsx",
      "components/ui/dashboard/PersonalQuickAccess.tsx",
      "components/planning/ActivitySceIcon.tsx",
      "components/nav/NavDestinationSceIcon.tsx",
    ];
    for (const path of paths) {
      const src = readRelative(path);
      expect(src).not.toMatch(/public\/images\/icons\/[\w-]+\.svg/);
      expect(src).not.toMatch(/\/images\/icons\/[\w-]+\.svg/);
    }
    expect(readRelative("components/nav/NavDestinationSceIcon.tsx")).toContain("SceIcon");
    expect(readRelative("components/planning/ActivitySceIcon.tsx")).toContain("SceIcon");
  });

  it("keeps the specimen as the canonical design-system surface", () => {
    const specimen = readRelative("components/design-system/icons/specimen/SceIconSpecimen.tsx");
    for (const section of [
      "Section 1 — SCE Core (Approved Masters)",
      "Section 2 — Sport & Competition",
      "Section 3 — Organisation & Work",
      "Section 4 — Publishing & Platform",
      "Section 5 — People, Membership & Club Operations",
      "Section 6 — Finance & Commercial Operations",
      "Section 7 — Analytics, Reporting & Workflow",
    ]) {
      expect(specimen).toContain(section);
    }
    expect(specimen).toContain("SCE_SPECIMEN_OPTICAL_SIZES");
    expect(specimen).toContain("16, 18, 20, 24, 28, 32, 48, 64");
    expect(specimen).toContain("MONOCHROME_PREVIEW_CLASS");
  });
});
