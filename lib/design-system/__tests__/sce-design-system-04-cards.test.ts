import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_04_CANONICAL_CARD_PRIMITIVES,
  SCE_DESIGN_SYSTEM_04_CARD_AUDIT,
  SCE_DESIGN_SYSTEM_04_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_04_GOVERNANCE,
  SCE_DESIGN_SYSTEM_04_LEGACY_CARD_INVENTORY,
  SCE_DESIGN_SYSTEM_04_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_04_PO_CLOSURE,
  SCE_DESIGN_SYSTEM_04_PO_FLAGS,
} from "@/lib/design-system/sce-design-system-04-meta";
import { SCE_DESIGN_SYSTEM_01_P0_FINDINGS } from "@/lib/design-system/sce-design-system-01-meta";
import { SCE_INFORMATION_HIERARCHY_LAYERS } from "@/lib/design-system/sce-card-information-hierarchy";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-04 cards & information presentation guardrails", () => {
  it("documents DS-04 roadmap, inventory, and master design system section", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-04.md");
    expect(roadmap).toContain(SCE_DESIGN_SYSTEM_04_PACKAGE_KEY);
    expect(roadmap).toContain("INFOBOARD_MATCH_PRESENTATION_P0");

    const inventory = readDoc("docs/design/SCE-DESIGN-SYSTEM-04-CARD-INVENTORY.md");
    expect(inventory).toContain("CARD_MIGRATION_INVENTORY");

    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    for (const marker of SCE_DESIGN_SYSTEM_04_DOC_MARKERS.slice(0, 6)) {
      expect(master).toContain(marker);
    }
  });

  it("records PO closure and DS-01 P0 resolution", () => {
    expect(SCE_DESIGN_SYSTEM_04_PO_CLOSURE.PO_CARD_SYSTEM_REVIEW).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_04_PO_CLOSURE.PO_INFOBOARD_P0_REVIEW).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_04_PO_CLOSURE.DS04_STATUS).toBe(
      "CLOSED / ACCEPTED / MERGED",
    );
    expect(SCE_DESIGN_SYSTEM_01_P0_FINDINGS.DS01_OPEN_P0_FINDINGS).toBe(0);
    expect(SCE_DESIGN_SYSTEM_01_P0_FINDINGS.P0_INFOBOARD_MATCH_PRESENTATION).toBe(
      "CLOSED_BY_DS04",
    );
  });

  it("locks product-wide card and activity family flags", () => {
    expect(SCE_DESIGN_SYSTEM_04_PO_FLAGS.CARD_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_04_PO_FLAGS.ACTIVITY_CARD_FAMILY_CANONICAL).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_04_PO_FLAGS.COMMUNICATION_IS_UNIVERSAL_CARD_TEMPLATE).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_04_PO_FLAGS.INFOBOARD_MATCH_PRESENTATION_P0).toBe("CLOSED");
    expect(SCE_DESIGN_SYSTEM_04_GOVERNANCE.NEW_BINARY_CHECKBOXES).toBe(0);
  });

  it("defines information hierarchy without World Activity Card terminology in DS-04 artifacts", () => {
    expect(SCE_INFORMATION_HIERARCHY_LAYERS.length).toBeGreaterThanOrEqual(7);
    const ds04Roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-04.md");
    expect(ds04Roadmap.toLowerCase()).not.toContain("world activity card");
    const ds04Meta = readSrc("lib/design-system/sce-design-system-04-meta.ts");
    expect(ds04Meta.toLowerCase()).not.toContain("world activity card");
  });

  it("requires canonical activity card components to remain exported", () => {
    expect(SCE_DESIGN_SYSTEM_04_CANONICAL_CARD_PRIMITIVES.ACTIVITY_MATCH).toBe(
      "SceMatchCard",
    );
    expect(readSrc("components/sporting-activity/SceMatchCard.tsx")).toContain(
      "SceMatchCard",
    );
    expect(readSrc("components/sporting-activity/SceTrainingCard.tsx")).toContain(
      "SceTrainingCard",
    );
    expect(readSrc("components/sporting-activity/SceTournamentCard.tsx")).toContain(
      "SceTournamentCard",
    );
    expect(readSrc("components/sporting-activity/SceClubEventCard.tsx")).toContain(
      "SceClubEventCard",
    );
  });

  it("removes Infoboard Screen 1 tenant-relative match UI fallback branch", () => {
    const screen1 = readSrc("components/infoboard/screen1/InfoboardScreen1.tsx");
    expect(screen1).not.toMatch(
      /event\.teamDisplayName[\s\S]*match-home-team-row[\s\S]*event\.opponentDisplayName/,
    );
    expect(screen1).toContain("event.matchPresentation");
    expect(screen1).toContain("match-home-team-row");
    expect(screen1).toContain("match-away-team-row");
  });

  it("maps Screen 2 pitch summaries through canonical matchPresentation", () => {
    const builder = readSrc("lib/publishing/infoboard/screen2-feed-builder.ts");
    expect(builder).toContain("mapScreen1Event");
    expect(builder).toContain("matchPresentation");
    const screen2 = readSrc("components/infoboard/screen2/InfoboardScreen2.tsx");
    expect(screen2).toContain("InfoboardCompactMatchIdentity");
  });

  it("preserves tournament fixture domain-specific family", () => {
    expect(readSrc("components/sce/tournament/SceTournamentFixtureCard.tsx")).toContain(
      "SceTournamentFixtureCard",
    );
  });

  it("requires card audit coverage for programme-critical domains", () => {
    const areas = new Set(SCE_DESIGN_SYSTEM_04_CARD_AUDIT.map((row) => row.area));
    for (const required of [
      "Communication",
      "Infoboard",
      "Tournament Planner",
      "Mein Programm",
      "Roles / Permissions",
    ]) {
      expect(areas.has(required)).toBe(true);
    }
  });

  it("records legacy card migration inventory for DS-10", () => {
    expect(SCE_DESIGN_SYSTEM_04_LEGACY_CARD_INVENTORY.length).toBeGreaterThanOrEqual(6);
    const infoboardRow = SCE_DESIGN_SYSTEM_04_LEGACY_CARD_INVENTORY.find((row) =>
      row.currentComponent.includes("InfoboardScreen1"),
    );
    expect(infoboardRow?.status).toBe("DS04_DONE");
  });

  it("does not introduce parallel workspace navigation systems in DS-04", () => {
    const rolesLayout = readSrc("app/(admin)/dashboard/administration/roles/layout.tsx");
    expect(rolesLayout).toContain("SceWorkspaceChrome");
    expect(rolesLayout).toContain("SceInformationSurface");
    expect(rolesLayout).not.toContain("WorkspaceBreadcrumbs");
  });
});
